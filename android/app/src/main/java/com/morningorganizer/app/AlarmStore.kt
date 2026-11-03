package com.morningorganizer.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

/** One alarm as pushed by the web app (validated and clamped on the way in). */
data class RoutineAlarm(
    val id: String, val templateId: String, val name: String, val hour: Int, val minute: Int,
    val days: Set<Int>, val volume: Int, val vibrate: Boolean, val durationSec: Int,
    val sound: String = "alarm", val text: String = "", val speak: Boolean = false, val pitch: Float = 1f, val rate: Float = 1f,
    val lang: String = "en-US", val start: String = "offer", val n: Int = 1, val of: Int = 1,
)

/** Persists alarms in app-private storage and (re)arms them with AlarmManager.setAlarmClock (Doze-exempt, no extra permission). */
object AlarmStore {
    private const val PREFS = "alarms"
    private const val KEY = "list"
    private const val MAX = 200
    private val SOUNDS = setOf("alarm", "gentle", "ringtone", "rising")

    fun parse(json: String): List<RoutineAlarm> {
        val arr = try { JSONArray(json) } catch (_: Exception) { return emptyList() }
        val out = ArrayList<RoutineAlarm>()
        for (i in 0 until minOf(arr.length(), MAX)) {
            val o = arr.optJSONObject(i) ?: continue
            val id = o.optString("id").take(64)
            if (id.isEmpty()) continue
            val days = HashSet<Int>()
            o.optJSONArray("days")?.let { d -> for (k in 0 until d.length()) d.optInt(k, -1).takeIf { it in 0..6 }?.let(days::add) }
            out += RoutineAlarm(
                id = id, templateId = o.optString("templateId", id).take(64), name = o.optString("name").take(80),
                hour = o.optInt("hour", -1), minute = o.optInt("minute", -1), days = days,
                volume = o.optInt("volume", 80).coerceIn(0, 100), vibrate = o.optBoolean("vibrate", true),
                durationSec = o.optInt("durationSec", 30).coerceIn(5, 600),
                sound = o.optString("sound", "alarm").takeIf { it in SOUNDS } ?: "alarm", text = o.optString("text").take(80), speak = o.optBoolean("speak", false),
                pitch = o.optDouble("pitch", 1.0).toFloat().coerceIn(0.1f, 2f), rate = o.optDouble("rate", 1.0).toFloat().coerceIn(0.3f, 2f),
                lang = o.optString("lang", "en-US").takeIf { it == "he-IL" } ?: "en-US", start = o.optString("start", "offer").takeIf { it == "auto" } ?: "offer",
                n = o.optInt("n", 1).coerceIn(1, 20), of = o.optInt("of", 1).coerceIn(1, 20),
            )
        }
        return out
    }

    fun save(ctx: Context, json: String) {
        val clean = JSONArray().also { arr -> parse(json).forEach { a ->
            arr.put(JSONObject().put("id", a.id).put("templateId", a.templateId).put("name", a.name).put("hour", a.hour).put("minute", a.minute)
                .put("days", JSONArray(a.days.toList())).put("volume", a.volume).put("vibrate", a.vibrate).put("durationSec", a.durationSec)
                .put("sound", a.sound).put("text", a.text).put("speak", a.speak).put("pitch", a.pitch.toDouble()).put("rate", a.rate.toDouble()).put("lang", a.lang).put("start", a.start).put("n", a.n).put("of", a.of))
        } }
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, clean.toString()).apply()
    }

    fun load(ctx: Context): List<RoutineAlarm> = parse(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]") ?: "[]")

    private fun pending(ctx: Context, a: RoutineAlarm, create: Boolean): PendingIntent? {
        val intent = Intent(ctx, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION).setData(Uri.parse("alarm://${Uri.encode(a.id)}"))
            .putExtra("templateId", a.templateId).putExtra("name", a.name).putExtra("volume", a.volume)
            .putExtra("vibrate", a.vibrate).putExtra("durationSec", a.durationSec)
            .putExtra("sound", a.sound).putExtra("text", a.text).putExtra("speak", a.speak).putExtra("pitch", a.pitch).putExtra("rate", a.rate)
            .putExtra("lang", a.lang).putExtra("start", a.start).putExtra("n", a.n).putExtra("of", a.of)
        val flags = PendingIntent.FLAG_IMMUTABLE or (if (create) PendingIntent.FLAG_UPDATE_CURRENT else PendingIntent.FLAG_NO_CREATE)
        return PendingIntent.getBroadcast(ctx, a.id.hashCode(), intent, flags)
    }

    /** Cancels everything we armed before and arms the next occurrence of each stored alarm. */
    fun rescheduleAll(ctx: Context, previous: List<RoutineAlarm> = emptyList()) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        previous.forEach { p -> pending(ctx, p, false)?.let { am.cancel(it); it.cancel() } }
        val now = System.currentTimeMillis()
        for (a in load(ctx)) {
            val at = AlarmMath.nextFireMillis(a.hour, a.minute, a.days, now) ?: continue
            val show = PendingIntent.getActivity(ctx, a.id.hashCode(), MainActivity.startIntent(ctx, a.templateId, a.start, a.text), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            am.setAlarmClock(AlarmManager.AlarmClockInfo(at, show), pending(ctx, a, true)!!)
        }
    }

    /** Replaces the stored list and re-arms. */
    fun replace(ctx: Context, json: String) {
        val old = load(ctx)
        save(ctx, json)
        rescheduleAll(ctx, old)
    }
}
