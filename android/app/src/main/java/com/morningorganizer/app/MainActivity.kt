package com.morningorganizer.app

import android.annotation.SuppressLint
import android.app.PendingIntent
import android.content.Context
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
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
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

    override fun onPause() { nfc?.disableForegroundDispatch(this); web.onPause(); super.onPause() }

    override fun onDestroy() { web.destroy(); super.onDestroy() }

    fun setKeepAwake(on: Boolean) = runOnUiThread {
        if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    fun armNfcWrite(text: String?) { nfcWriteText = text }

    fun takePending(): String = synchronized(lock) {
        jsReady = true
        val p = pending; pending = null; p?.toString() ?: ""
    }

    // ── incoming intents: widget / alarm taps, shared text, NFC tags ────────────────────────────────────────────
    private fun handleIntent(i: Intent?) {
        i ?: return
        val templateId = i.getStringExtra(EXTRA_TEMPLATE)
        when {
            templateId != null -> { i.removeExtra(EXTRA_TEMPLATE); deliver(JSONObject().put("type", "start").put("templateId", templateId)) }
            i.action == Intent.ACTION_SEND && i.type == "text/plain" -> {
                val text = i.getStringExtra(Intent.EXTRA_TEXT)?.take(64 * 1024)
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

        /** Intent that opens the app and starts [templateId] (or just opens it when null). */
        fun startIntent(ctx: Context, templateId: String?): Intent =
            Intent(ctx, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP).apply { if (templateId != null) putExtra(EXTRA_TEMPLATE, templateId) }
    }
}
