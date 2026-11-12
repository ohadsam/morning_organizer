package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Home-screen widget that shows the routine in progress: name, current task, a live countdown (a Chronometer ticks by itself, so the
 * widget needs no per-second updates) and a progress bar. The web app pushes a snapshot on every task change / pause / finish.
 */
class RunWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, build(context)) }
    }

    companion object {
        private const val PREFS = "run_widget"

        /** Keeps only what the widget shows, bounded - never stores arbitrary web-provided blobs. */
        fun save(context: Context, json: String) {
            val o = try { JSONObject(json) } catch (_: Exception) { JSONObject() }
            val clean = JSONObject()
                .put("active", o.optBoolean("active", false))
                .put("name", o.optString("name").take(40)).put("icon", o.optString("icon").take(8)).put("task", o.optString("task").take(60))
                .put("pct", o.optDouble("pct", 0.0).coerceIn(0.0, 1.0)).put("paused", o.optBoolean("paused", false))
                .put("remaining", o.optLong("remaining", 0).coerceIn(-86_400, 86_400)).put("templateId", o.optString("templateId").take(64))
                .put("savedAt", SystemClock.elapsedRealtime())
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("state", clean.toString()).apply()
            updateAll(context)
        }

        /** elapsedRealtime restarts at boot, so a stale snapshot must not survive a reboot. */
        fun clear(context: Context) { context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply(); updateAll(context) }

        fun updateAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            mgr.getAppWidgetIds(ComponentName(context, RunWidget::class.java)).forEach { mgr.updateAppWidget(it, build(context)) }
            RoutineCardWidget.updateAll(context)   // the routine card goes live while its routine runs
        }

        private fun build(context: Context): RemoteViews {
            val v = RemoteViews(context.packageName, R.layout.widget_run)
            WidgetLook.apply(context, v, "4x2", R.drawable.wbg_run)
            val s = try { JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("state", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
            val active = s.optBoolean("active", false)
            val open = PendingIntent.getActivity(context, 200, MainActivity.startIntent(context, if (active) s.optString("templateId").ifEmpty { null } else null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
            v.setOnClickPendingIntent(R.id.run_root, open)
            if (!active) {
                v.setTextViewText(R.id.run_title, context.getString(R.string.run_idle)); v.setTextViewText(R.id.run_task, context.getString(R.string.run_idle_hint))
                v.setViewVisibility(R.id.run_timer, View.GONE); v.setViewVisibility(R.id.run_progress, View.GONE)
                return v
            }
            val pct = (s.optDouble("pct", 0.0) * 100).toInt()
            val paused = s.optBoolean("paused", false)
            val remainingMs = s.optLong("remaining", 0) * 1000
            v.setTextViewText(R.id.run_title, "${s.optString("icon")} ${s.optString("name")} · $pct%")
            v.setTextViewText(R.id.run_task, s.optString("task"))
            v.setViewVisibility(R.id.run_timer, View.VISIBLE); v.setViewVisibility(R.id.run_progress, View.VISIBLE)
            v.setProgressBar(R.id.run_progress, 100, pct, false)
            v.setChronometerCountDown(R.id.run_timer, true)
            // running: the end time is fixed when the snapshot was saved; paused: show the frozen remaining time
            val base = if (paused) SystemClock.elapsedRealtime() + remainingMs else s.optLong("savedAt", SystemClock.elapsedRealtime()) + remainingMs
            v.setChronometer(R.id.run_timer, base, null, !paused)
            return v
        }
    }
}
