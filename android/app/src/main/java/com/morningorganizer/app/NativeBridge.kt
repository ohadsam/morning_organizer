package com.morningorganizer.app

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.content.Context
import android.webkit.JavascriptInterface
import org.json.JSONArray

/**
 * The only door from the web app into Android. Exposed to JavaScript as `MorningNative`.
 * The WebView only ever loads the bundled app origin (see MainActivity), and every argument is validated here.
 */
class NativeBridge(private val activity: MainActivity) {
    private val ctx = activity.applicationContext

    @JavascriptInterface fun appVersion(): String = BuildConfig.VERSION_NAME

    /** Asks GitHub for the latest release; the answer arrives as a {type:'update'} event. Takes no argument: the address is fixed. */
    @JavascriptInterface fun checkUpdate() { activity.checkForUpdate() }

    /** Opens the download of the new version found by the last check (never an address given by the page). */
    @JavascriptInterface fun openUpdate() { activity.openUpdateDownload() }

    @JavascriptInterface fun setAlarms(json: String) { if (json.length <= MAX_JSON) AlarmStore.replace(ctx, json) }

    @JavascriptInterface fun setWidget(json: String) { if (json.length <= MAX_JSON) { RoutineWidget.save(ctx, json); RoutineCardWidget.save(ctx, json) } }

    /** A report PDF from the web app (base64, size-capped) goes to the system share sheet, so e-mail / Drive / messengers get it as an attachment. */
    @JavascriptInterface fun sharePdf(name: String, b64: String, subject: String, text: String) {
        if (b64.length > MAX_PDF_B64) return
        activity.sharePdf(name.take(80), b64, subject.take(120), text.take(2000))
    }

    @JavascriptInterface fun setStats(json: String) { if (json.length <= 2048) StatsWidget.save(ctx, json) }

    /** The look (skin) the person chose, so the widget cards match it. Only a known name is kept. */
    @JavascriptInterface fun setLook(skin: String) { if (skin.length <= 12) WidgetLook.save(ctx, skin) }

    /** Snapshot of the routine in progress for the progress widget. */
    @JavascriptInterface fun setProgress(json: String) { if (json.length <= 4096) RunWidget.save(ctx, json) }

    /** A plain system notification (used for "your child is running late" alerts). Needs the notification permission on Android 13+. */
    @JavascriptInterface fun notify(title: String, text: String) {
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(FAMILY_CHANNEL) == null) nm.createNotificationChannel(NotificationChannel(FAMILY_CHANNEL, ctx.getString(R.string.family_channel), NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(ctx, 300, MainActivity.startIntent(ctx, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(ctx, FAMILY_CHANNEL).setSmallIcon(R.drawable.ic_stat_sonrise).setContentTitle(title.take(80)).setContentText(text.take(200))
            .setStyle(NotificationCompat.BigTextStyle().bigText(text.take(200))).setContentIntent(open).setAutoCancel(true).build()
        try { NotificationManagerCompat.from(ctx).notify(FAMILY_NOTIF_ID, n) } catch (_: SecurityException) { }
    }

    @JavascriptInterface fun scanQr() { activity.runOnUiThread { activity.scanQr() } }

    // ── dictation (speech-to-text with the phone's recognizer) ──
    @JavascriptInterface fun dictationAvailable(): Boolean = android.speech.SpeechRecognizer.isRecognitionAvailable(ctx)
    @JavascriptInterface fun dictationStart(lang: String) { activity.runOnUiThread { activity.dictation.start(lang.take(8)) } }
    @JavascriptInterface fun dictationStop() { activity.runOnUiThread { activity.dictation.stop() } }

    @JavascriptInterface fun setAlarmRules(json: String) { if (json.length <= MAX_JSON) AlarmStore.replaceRules(ctx, json) }
    @JavascriptInterface fun pickRingtone(key: String) { activity.runOnUiThread { activity.pickRingtone(key.take(20)) } }
    @JavascriptInterface fun ttsAvailable(): Boolean = activity.voice.available()
    @JavascriptInterface fun ttsVoices(): String = activity.voice.voices()
    @JavascriptInterface fun ttsSpeak(id: String, text: String, voice: String, lang: String, pitch: Float, rate: Float) { if (text.length <= 600) activity.voice.speak(id, text, voice.take(120), lang.take(12), pitch, rate) }
    @JavascriptInterface fun ttsEngines(): String = activity.voice.engines()
    @JavascriptInterface fun ttsSetEngine(pkg: String) = activity.voice.setEngine(pkg.take(100))
    @JavascriptInterface fun ttsStop() = activity.voice.stop()
    @JavascriptInterface fun ttsInstallVoices() = activity.voice.installVoices()

    @JavascriptInterface fun keepAwake(on: Boolean) = activity.setKeepAwake(on)

    @JavascriptInterface fun vibrate(patternJson: String) {
        val arr = try { JSONArray(patternJson) } catch (_: Exception) { return }
        val pattern = LongArray(minOf(arr.length(), 20) + 1) { i -> if (i == 0) 0L else arr.optLong(i - 1, 0).coerceIn(0, 2000) }
        val v: Vibrator? = if (Build.VERSION.SDK_INT >= 31) (ctx.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        else @Suppress("DEPRECATION") ctx.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        v?.vibrate(VibrationEffect.createWaveform(pattern, -1))
    }

    @JavascriptInterface fun share(title: String, text: String) {
        if (text.length > MAX_JSON) return
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_SUBJECT, title.take(80)).putExtra(Intent.EXTRA_TEXT, text)
        activity.runOnUiThread { activity.startActivity(Intent.createChooser(send, activity.getString(R.string.share_via))) }
    }

    /** Opens the system "save as" picker and writes the text to the chosen file (WebView cannot download blobs itself). */
    @JavascriptInterface fun saveFile(name: String, text: String) { if (text.length <= MAX_FILE) activity.saveTextFile(name.take(80).ifBlank { "backup.json" }, text) }

    // ── phone-to-phone NFC (card emulation + reader mode, see NfcApdu) ──
    @JavascriptInterface fun nfcPhoneSupported(): Boolean = ctx.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
    @JavascriptInterface fun nfcOffer(text: String): Boolean { val b = text.toByteArray(Charsets.UTF_8); if (b.isEmpty() || b.size > NfcApdu.MAX_PAYLOAD) return false; NfcOffer.set(b); return true }
    @JavascriptInterface fun nfcOfferStop() = NfcOffer.clear()
    @JavascriptInterface fun nfcReceive(seconds: Int) { activity.runOnUiThread { activity.nfcReader.start(seconds.coerceIn(5, 120)) } }
    @JavascriptInterface fun nfcReceiveStop() { activity.runOnUiThread { activity.nfcReader.stop() } }

    @JavascriptInterface fun nfcWrite(text: String) { if (text.length <= 900) activity.armNfcWrite(text) }
    @JavascriptInterface fun nfcCancel() = activity.armNfcWrite(null)

    // ── Bluetooth link between a parent phone and a child phone (see BtLink) ──
    @JavascriptInterface fun btStatus(): String = activity.bt.status()
    @JavascriptInterface fun btPaired(): String = activity.bt.paired()
    @JavascriptInterface fun btListen() = activity.bt.listen()
    @JavascriptInterface fun btConnect(address: String) = activity.bt.connect(address.take(32))
    @JavascriptInterface fun btSend(text: String): Boolean = activity.bt.send(text)
    @JavascriptInterface fun btClose() = activity.bt.close()
    @JavascriptInterface fun requestBluetooth() {
        if (Build.VERSION.SDK_INT >= 31 && !activity.bt.hasPermission()) activity.runOnUiThread { activity.requestPermissions(arrayOf(Manifest.permission.BLUETOOTH_CONNECT), 2) }
    }

    /** setAlarmClock needs no exact-alarm permission, so this is always true; kept so the web app can ask. */
    @JavascriptInterface fun canScheduleExactAlarms(): Boolean = true
    @JavascriptInterface fun openExactAlarmSettings() {}

    @JavascriptInterface fun requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            activity.runOnUiThread { activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1) }
    }

    /** A routine to start / text to import that arrived before the page was ready. Returns "" when nothing is pending. */
    @JavascriptInterface fun takePendingIntent(): String = activity.takePending()

    private companion object { const val MAX_JSON = 256 * 1024; const val MAX_FILE = 16 * 1024 * 1024; const val MAX_PDF_B64 = 14 * 1024 * 1024; const val FAMILY_CHANNEL = "family"; const val FAMILY_NOTIF_ID = 4301 }
}
