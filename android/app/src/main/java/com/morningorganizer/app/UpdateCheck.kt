package com.morningorganizer.app

import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

/** Asks GitHub which release is the latest. One fixed address, only when the person taps "Check for a new version"; nothing is sent but the request itself. */
object UpdateCheck {
    private const val API = "https://api.github.com/repos/ohadsam/morning_organizer/releases/latest"
    private const val MAX_BODY = 512 * 1024

    data class Result(val ok: Boolean, val latest: String = "", val newer: Boolean = false, val apk: String? = null)

    fun fetch(installed: String): Result = try {
        val c = URL(API).openConnection() as HttpURLConnection
        c.connectTimeout = 8000; c.readTimeout = 8000; c.instanceFollowRedirects = false
        c.setRequestProperty("Accept", "application/vnd.github+json"); c.setRequestProperty("User-Agent", "SonRise-Android")
        try {
            if (c.responseCode != 200) Result(false) else {
                val text = c.inputStream.use { it.readBytes().let { b -> if (b.size > MAX_BODY) null else String(b, Charsets.UTF_8) } }
                if (text == null) Result(false) else {
                    val o = JSONObject(text); val title = o.optString("name").take(80)
                    val version = UpdateMath.parse(title)?.joinToString(".") ?: ""
                    var apk: String? = null
                    val assets = o.optJSONArray("assets")
                    if (assets != null) for (i in 0 until minOf(assets.length(), 20)) {
                        val a = assets.optJSONObject(i) ?: continue
                        if (a.optString("name") == UpdateMath.APK_NAME && UpdateMath.isTrustedApk(a.optString("browser_download_url"))) apk = a.optString("browser_download_url")
                    }
                    if (version.isEmpty()) Result(false) else Result(true, version, UpdateMath.isNewer(installed, title) && apk != null, apk)
                }
            }
        } finally { c.disconnect() }
    } catch (_: Exception) { Result(false) }
}
