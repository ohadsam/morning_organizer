package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray
import org.json.JSONObject

/**
 * A routine "card" widget: shows one saved routine (name, schedule/leave-by/gear line, its tasks with durations) and starts it with one tap -
 * the app then runs it with ALL its saved settings. ‹ › switch to another routine (remembered per widget). While that routine is running
 * the card turns into a live view (current task, countdown, progress). Data is pushed by the web app and bounded here.
 */
class RoutineCardWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { manager.updateAppWidget(it, build(context, it)) } }

    override fun onDeleted(context: Context, ids: IntArray) {
        val e = prefs(context).edit(); ids.forEach { e.remove("sel_$it") }; e.apply()
    }

    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
        if ((intent.action == ACTION_PREV || intent.action == ACTION_NEXT) && id != AppWidgetManager.INVALID_APPWIDGET_ID) {
            val items = items(context)
            if (items.length() > 0) {
                val cur = indexOf(items, prefs(context).getString("sel_$id", null))
                val next = (cur + (if (intent.action == ACTION_NEXT) 1 else items.length() - 1)) % items.length()
                prefs(context).edit().putString("sel_$id", items.getJSONObject(next).optString("id")).apply()
            }
            AppWidgetManager.getInstance(context).updateAppWidget(id, build(context, id))
            return
        }
        super.onReceive(context, intent)
    }

    companion object {
        private const val PREFS = "card_widget"
        private const val ACTION_PREV = "com.morningorganizer.app.CARD_PREV"
        private const val ACTION_NEXT = "com.morningorganizer.app.CARD_NEXT"
        private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        private fun items(c: Context) = try { JSONArray(prefs(c).getString("items", "[]")) } catch (_: Exception) { JSONArray() }
        private fun indexOf(items: JSONArray, id: String?): Int { for (i in 0 until items.length()) if (items.getJSONObject(i).optString("id") == id) return i; return 0 }

        /** json: [{id,name,icon,meta,tasks:[{name,icon,sec}]}] - at most 12 routines and 8 tasks each; only these fields are kept. */
        fun save(context: Context, json: String) {
            val arr = try { JSONArray(json) } catch (_: Exception) { JSONArray() }
            val clean = JSONArray()
            for (i in 0 until minOf(arr.length(), 12)) {
                val o = arr.optJSONObject(i) ?: continue
                val tasks = JSONArray(); val ts = o.optJSONArray("tasks") ?: JSONArray()
                for (k in 0 until minOf(ts.length(), 8)) { val t = ts.optJSONObject(k) ?: continue; tasks.put(JSONObject().put("name", t.optString("name").take(40)).put("icon", t.optString("icon").take(8)).put("sec", t.optInt("sec", 0).coerceIn(0, 86_400))) }
                clean.put(JSONObject().put("id", o.optString("id").take(64)).put("name", o.optString("name").take(40)).put("icon", o.optString("icon").take(8))
                    .put("meta", o.optString("meta").take(120)).put("more", o.optInt("more", 0).coerceIn(0, 99)).put("tasks", tasks))
            }
            prefs(context).edit().putString("items", clean.toString()).apply(); updateAll(context)
        }

        fun updateAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            mgr.getAppWidgetIds(ComponentName(context, RoutineCardWidget::class.java)).forEach { mgr.updateAppWidget(it, build(context, it)) }
        }

        private fun mmss(sec: Int) = if (sec >= 3600) "${sec / 3600}h ${sec % 3600 / 60}m" else if (sec % 60 == 0) "${sec / 60}m" else "${sec / 60}m ${sec % 60}s"

        private fun broadcast(context: Context, id: Int, action: String, req: Int): PendingIntent =
            PendingIntent.getBroadcast(context, req, Intent(context, RoutineCardWidget::class.java).setAction(action).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

        private fun build(context: Context, widgetId: Int): RemoteViews {
            val v = RemoteViews(context.packageName, R.layout.widget_card)
            val all = items(context)
            v.setOnClickPendingIntent(R.id.card_prev, broadcast(context, widgetId, ACTION_PREV, widgetId * 2))
            v.setOnClickPendingIntent(R.id.card_next, broadcast(context, widgetId, ACTION_NEXT, widgetId * 2 + 1))
            if (all.length() == 0) {
                v.setTextViewText(R.id.card_title, context.getString(R.string.widget_empty)); v.setViewVisibility(R.id.card_meta, View.GONE); v.setViewVisibility(R.id.card_tasks, View.GONE)
                v.setViewVisibility(R.id.card_timer, View.GONE); v.setViewVisibility(R.id.card_progress, View.GONE); v.setViewVisibility(R.id.card_start, View.GONE)
                v.setOnClickPendingIntent(R.id.card_root, PendingIntent.getActivity(context, 300, MainActivity.startIntent(context, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
                return v
            }
            val o = all.getJSONObject(indexOf(all, prefs(context).getString("sel_$widgetId", null)))
            val id = o.optString("id")
            v.setTextViewText(R.id.card_title, "${o.optString("icon")} ${o.optString("name")}")
            val start = PendingIntent.getActivity(context, 400 + widgetId, MainActivity.startIntent(context, id), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            v.setOnClickPendingIntent(R.id.card_root, start); v.setOnClickPendingIntent(R.id.card_start, start)
            // Is this very routine running right now? (the run widget's snapshot)
            val run = try { JSONObject(context.getSharedPreferences("run_widget", Context.MODE_PRIVATE).getString("state", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
            val live = run.optBoolean("active", false) && run.optString("templateId") == id
            if (live) {
                val pct = (run.optDouble("pct", 0.0) * 100).toInt(); val paused = run.optBoolean("paused", false); val remainingMs = run.optLong("remaining", 0) * 1000
                v.setTextViewText(R.id.card_meta, "$pct%${if (paused) " ⏸" else ""}"); v.setViewVisibility(R.id.card_meta, View.VISIBLE)
                v.setTextViewText(R.id.card_tasks, run.optString("task")); v.setViewVisibility(R.id.card_tasks, View.VISIBLE)
                v.setViewVisibility(R.id.card_timer, View.VISIBLE); v.setViewVisibility(R.id.card_progress, View.VISIBLE); v.setProgressBar(R.id.card_progress, 100, pct, false)
                v.setChronometerCountDown(R.id.card_timer, true)
                val base = if (paused) SystemClock.elapsedRealtime() + remainingMs else run.optLong("savedAt", SystemClock.elapsedRealtime()) + remainingMs
                v.setChronometer(R.id.card_timer, base, null, !paused)
                v.setTextViewText(R.id.card_start, context.getString(R.string.widget_open))
            } else {
                v.setViewVisibility(R.id.card_timer, View.GONE); v.setViewVisibility(R.id.card_progress, View.GONE)
                val meta = o.optString("meta"); v.setTextViewText(R.id.card_meta, meta); v.setViewVisibility(R.id.card_meta, if (meta.isEmpty()) View.GONE else View.VISIBLE)
                val ts = o.optJSONArray("tasks") ?: JSONArray(); val sb = StringBuilder()
                for (k in 0 until ts.length()) { val t = ts.getJSONObject(k); sb.append(t.optString("icon")).append(' ').append(t.optString("name")).append(" · ").append(mmss(t.optInt("sec"))).append('\n') }
                if (o.optInt("more") > 0) sb.append("+").append(o.optInt("more"))
                v.setTextViewText(R.id.card_tasks, sb.toString().trimEnd()); v.setViewVisibility(R.id.card_tasks, View.VISIBLE)
                v.setTextViewText(R.id.card_start, "▶ " + context.getString(R.string.widget_start))
            }
            v.setViewVisibility(R.id.card_start, View.VISIBLE)
            return v
        }
    }
}
