package com.morningorganizer.app

import android.Manifest
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

    @JavascriptInterface fun setAlarms(json: String) { if (json.length <= MAX_JSON) AlarmStore.replace(ctx, json) }

    @JavascriptInterface fun setWidget(json: String) { if (json.length <= MAX_JSON) RoutineWidget.save(ctx, json) }

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

    @JavascriptInterface fun nfcWrite(text: String) { if (text.length <= 900) activity.armNfcWrite(text) }
    @JavascriptInterface fun nfcCancel() = activity.armNfcWrite(null)

    /** setAlarmClock needs no exact-alarm permission, so this is always true; kept so the web app can ask. */
    @JavascriptInterface fun canScheduleExactAlarms(): Boolean = true
    @JavascriptInterface fun openExactAlarmSettings() {}

    @JavascriptInterface fun requestNotifications() {
        if (Build.VERSION.SDK_INT >= 33 && ctx.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            activity.runOnUiThread { activity.requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1) }
    }

    /** A routine to start / text to import that arrived before the page was ready. Returns "" when nothing is pending. */
    @JavascriptInterface fun takePendingIntent(): String = activity.takePending()

    private companion object { const val MAX_JSON = 256 * 1024; const val MAX_FILE = 16 * 1024 * 1024 }
}
