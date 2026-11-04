package com.morningorganizer.app

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.Manifest
import android.content.ClipData
import android.content.Context
import androidx.core.content.FileProvider
import java.io.File
import android.content.pm.PackageManager
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.nfc.NdefMessage
import android.nfc.NdefRecord
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.Ndef
import android.nfc.tech.NdefFormatable
import android.os.Build
import android.os.Bundle
import android.view.WindowManager
import android.webkit.RenderProcessGoneDetail
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.webkit.WebViewAssetLoader
import org.json.JSONObject

/**
 * Hosts the web app. The UI is the same code the PWA runs; it is served from the APK's assets on a virtual https origin
 * (so IndexedDB, CSP and secure-context APIs behave exactly like on GitHub Pages) and nothing else is ever loaded in this WebView.
 */
class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var nfc: NfcAdapter? = null
    @Volatile private var nfcWriteText: String? = null
    private val lock = Any()
    private var pending: JSONObject? = null
    private var jsReady = false
    val nfcReader by lazy { NfcReaderLink(this) { deliver(it) } }
    val bt by lazy { BtLink(applicationContext) { deliver(it) } }
    val dictation by lazy { DictationLink(this) { deliver(it) } }
    private var pendingSave: String? = null
    private var micRequest: PermissionRequest? = null
    private val micWaiters = mutableListOf<(Boolean) -> Unit>()
    private val micPermission = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        micRequest?.let { if (ok) it.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) else it.deny() }; micRequest = null
        val waiting = micWaiters.toList(); micWaiters.clear(); waiting.forEach { it(ok) }
    }
    private fun hasMic() = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
    /** Runs [done] with whether the microphone may be used, asking the person first when needed. Main thread. */
    fun withMic(done: (Boolean) -> Unit) { if (hasMic()) done(true) else { micWaiters.add(done); micPermission.launch(Manifest.permission.RECORD_AUDIO) } }

    private var fileCallback: ValueCallback<Array<Uri>>? = null

    // Backup export: the system "save as" picker. No storage permission needed.
    private var saveMime = "application/json"
    private val createDoc = registerForActivityResult(object : ActivityResultContracts.CreateDocument("application/json") {
        override fun createIntent(context: Context, input: String): Intent = super.createIntent(context, input).setType(saveMime)
    }) { uri ->
        val text = pendingSave; pendingSave = null
        val ok = uri != null && text != null && runCatching {
            contentResolver.openOutputStream(uri, "wt")?.use { it.write(text.toByteArray(Charsets.UTF_8)) } ?: error("no stream")
        }.isSuccess
        deliver(JSONObject().put("type", "saved").put("status", if (ok) "ok" else "fail"))
    }

    // Backup import: WebView needs the host to answer <input type=file>.
    private val pickDoc = registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        fileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null); fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled", "AddJavascriptInterface")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nfc = NfcAdapter.getDefaultAdapter(this)
        val loader = WebViewAssetLoader.Builder().setDomain(HOST).addPathHandler("/", WebViewAssetLoader.AssetsPathHandler(this)).build()

        web = WebView(this).also { setContentView(it) }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        web.settings.apply {
            javaScriptEnabled = true; domStorageEnabled = true // IndexedDB needs DOM storage
            allowFileAccess = false; allowContentAccess = false
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            setSupportMultipleWindows(false)
        }
        web.addJavascriptInterface(NativeBridge(this), "MorningNative")
        web.webChromeClient = object : WebChromeClient() {
            // getUserMedia({audio}) for voice notes: only our own origin, only the microphone (never the camera).
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread {
                    val audioOnly = request.resources.isNotEmpty() && request.resources.all { it == PermissionRequest.RESOURCE_AUDIO_CAPTURE }
                    if (request.origin.host != HOST || !audioOnly) { request.deny(); return@runOnUiThread }
                    if (hasMic()) request.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
                    else { micRequest?.deny(); micRequest = request; micPermission.launch(Manifest.permission.RECORD_AUDIO) }
                }
            }

            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null); fileCallback = callback
                return try { pickDoc.launch(arrayOf("application/json", "text/plain", "*/*")); true } catch (_: Exception) { fileCallback = null; false }
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? = loader.shouldInterceptRequest(request.url)

            // Only our own origin may load here. Anything else (e.g. a link in a shared routine) goes to the real browser.
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == HOST) return false
                if (request.url.scheme == "https") runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                return true
            }

            override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean { recreate(); return true }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() { if (web.canGoBack()) web.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() } }
        })
        if (savedInstanceState == null) web.loadUrl("https://$HOST/index.html") else web.restoreState(savedInstanceState)
        handleIntent(intent)
        Shortcuts.publish(this)
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }

    override fun onNewIntent(intent: Intent) { super.onNewIntent(intent); setIntent(intent); handleIntent(intent) }

    override fun onResume() {
        super.onResume(); web.onResume()
        val adapter = nfc ?: return
        if (!adapter.isEnabled) return
        val pi = PendingIntent.getActivity(this, 0, Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_MUTABLE)
        val mime = IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED).apply { runCatching { addDataType(NFC_MIME) } }
        adapter.enableForegroundDispatch(this, pi, arrayOf(mime, IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED)), null)
    }

    override fun onPause() { dictation.stop(); nfcReader.stop(); NfcOffer.clear(); nfc?.disableForegroundDispatch(this); web.onPause(); super.onPause() }

    override fun onDestroy() { dictation.stop(); bt.close(); web.destroy(); super.onDestroy() }

    fun setKeepAwake(on: Boolean) = runOnUiThread {
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    /** QR scan through Google's code scanner (its own UI, no camera permission). The text arrives like any other incoming text. */
    fun scanQr() {
        val options = GmsBarcodeScannerOptions.Builder().setBarcodeFormats(Barcode.FORMAT_QR_CODE).build()
        GmsBarcodeScanning.getClient(this, options).startScan()
            .addOnSuccessListener { b -> b.rawValue?.take(64 * 1024)?.let { deliver(JSONObject().put("type", "import").put("text", it)) } }
            .addOnFailureListener { deliver(JSONObject().put("type", "qrfail")) }
    }

    /** Writes the PDF to app-private cache and offers it to other apps through a FileProvider (read-only, temporary grant). */
    fun sharePdf(name: String, b64: String, subject: String, text: String) {
        val bytes = try { android.util.Base64.decode(b64, android.util.Base64.DEFAULT) } catch (_: Exception) { return }
        if (bytes.size < 8 || String(bytes, 0, 5, Charsets.US_ASCII) != "%PDF-") return
        val dir = File(cacheDir, "reports").apply { mkdirs() }
        dir.listFiles()?.forEach { it.delete() }
        val safe = name.replace(Regex("[^\\p{L}\\p{N}._-]"), "_").let { if (it.endsWith(".pdf", true)) it else "$it.pdf" }
        val file = File(dir, safe).also { it.writeBytes(bytes) }
        val uri = FileProvider.getUriForFile(this, "$packageName.files", file)
        val send = Intent(Intent.ACTION_SEND).setType("application/pdf").putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_SUBJECT, subject).putExtra(Intent.EXTRA_TEXT, text)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION).apply { clipData = ClipData.newRawUri("", uri) }
        runOnUiThread { runCatching { startActivity(Intent.createChooser(send, null)) } }
    }

    fun armNfcWrite(text: String?) { nfcWriteText = text }

    fun saveTextFile(name: String, text: String) { pendingSave = text; saveMime = if (name.endsWith(".csv", ignoreCase = true)) "text/csv" else if (name.endsWith(".html", ignoreCase = true)) "text/html" else "application/json"; runOnUiThread { createDoc.launch(name) } }

    fun takePending(): String = synchronized(lock) {
        jsReady = true
        val p = pending; pending = null; p?.toString() ?: ""
    }

    // ── incoming intents: widget / alarm taps, shared text, NFC tags ────────────────────────────────────────────
    private fun handleIntent(i: Intent?) {
        i ?: return
        val templateId = i.getStringExtra(EXTRA_TEMPLATE)
        val mode = i.getStringExtra(EXTRA_MODE); val note = i.getStringExtra(EXTRA_TEXT)?.take(120)
        val route = i.getStringExtra(EXTRA_ROUTE)
        when {
            route != null -> { i.removeExtra(EXTRA_ROUTE); if (route in Shortcuts.ROUTES) deliver(JSONObject().put("type", "route").put("hash", route)) }
            templateId != null -> {
                i.removeExtra(EXTRA_TEMPLATE); i.removeExtra(EXTRA_MODE); i.removeExtra(EXTRA_TEXT)
                deliver(JSONObject().put("type", "start").put("templateId", templateId).put("mode", if (mode == "offer") "offer" else "auto").put("text", note ?: ""))
            }
            i.action == Intent.ACTION_SEND && i.type == "text/plain" -> {
                val text = i.getStringExtra(Intent.EXTRA_TEXT)?.take(256 * 1024)
                if (text != null) deliver(JSONObject().put("type", "import").put("text", text))
                i.action = null
            }
            i.action == NfcAdapter.ACTION_NDEF_DISCOVERED || i.action == NfcAdapter.ACTION_TAG_DISCOVERED || i.action == NfcAdapter.ACTION_TECH_DISCOVERED -> handleTag(i)
        }
    }

    @Suppress("DEPRECATION")
    private fun handleTag(i: Intent) {
        val tag: Tag? = if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(NfcAdapter.EXTRA_TAG, Tag::class.java) else i.getParcelableExtra(NfcAdapter.EXTRA_TAG)
        val toWrite = nfcWriteText
        if (toWrite != null && tag != null) {
            nfcWriteText = null
            val ok = writeTag(tag, toWrite)
            deliver(JSONObject().put("type", "nfc").put("status", if (ok) "ok" else "fail"))
            return
        }
        val msg: NdefMessage? = (i.getParcelableArrayExtra(NfcAdapter.EXTRA_NDEF_MESSAGES)?.firstOrNull() as? NdefMessage) ?: tag?.let { Ndef.get(it)?.cachedNdefMessage }
        val record = msg?.records?.firstOrNull { it.tnf == NdefRecord.TNF_MIME_MEDIA && String(it.type, Charsets.US_ASCII) == NFC_MIME } ?: return
        if (record.payload.size <= 4096) deliver(JSONObject().put("type", "import").put("text", String(record.payload, Charsets.UTF_8)))
    }

    private fun writeTag(tag: Tag, text: String): Boolean = try {
        val message = NdefMessage(NdefRecord.createMime(NFC_MIME, text.toByteArray(Charsets.UTF_8)))
        val ndef = Ndef.get(tag)
        if (ndef != null) {
            ndef.connect(); try { if (!ndef.isWritable || ndef.maxSize < message.byteArrayLength) false else { ndef.writeNdefMessage(message); true } } finally { ndef.close() }
        } else NdefFormatable.get(tag)?.let { it.connect(); try { it.format(message); true } finally { it.close() } } ?: false
    } catch (_: Exception) { false }

    /** Before the page has asked for pending work, queue it; afterwards push it straight into the page as an event. */
    private fun deliver(event: JSONObject) {
        synchronized(lock) { if (!jsReady) { pending = event; return } }
        val js = "window.dispatchEvent(new CustomEvent('morning-native',{detail:JSON.parse(${JSONObject.quote(event.toString())})}))"
        runOnUiThread { web.evaluateJavascript(js, null) }
    }

    companion object {
        private const val HOST = "appassets.androidplatform.net"
        private const val NFC_MIME = "application/vnd.morningorganizer+json"
        private const val EXTRA_TEMPLATE = "templateId"
        private const val EXTRA_ROUTE = "route"
        private const val EXTRA_MODE = "mode"
        private const val EXTRA_TEXT = "text"

        /** Intent that opens the app on one of the allow-listed screens (launcher shortcuts). */
        fun routeIntent(ctx: Context, route: String): Intent = Intent(ctx, MainActivity::class.java).setAction(Intent.ACTION_VIEW).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra(EXTRA_ROUTE, route)

        /** Intent that opens the app and starts [templateId] (or just opens it when null). */
        fun startIntent(ctx: Context, templateId: String?, mode: String? = null, text: String? = null): Intent =
            Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP).apply {
                if (templateId != null) putExtra(EXTRA_TEMPLATE, templateId)
                if (mode != null) putExtra(EXTRA_MODE, mode)
                if (text != null) putExtra(EXTRA_TEXT, text.take(120))
            }
    }
}
