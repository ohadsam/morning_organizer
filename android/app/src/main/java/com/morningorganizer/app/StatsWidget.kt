package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import org.json.JSONObject

/** Home-screen progress: stars, streak and routines on time this week. The web app pushes a tiny snapshot; only those fields are kept. */
class StatsWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { manager.updateAppWidget(it, build(context)) } }

    companion object {
        private const val PREFS = "stats_widget"

        fun save(context: Context, json: String) {
            val o = try { JSONObject(json) } catch (_: Exception) { JSONObject() }
            val clean = JSONObject().put("name", o.optString("name").take(30)).put("stars", o.optInt("stars", 0).coerceIn(0, 1_000_000))
                .put("streak", o.optInt("streak", 0).coerceIn(0, 5000)).put("week", o.optInt("week", 0).coerceIn(0, 999))
                .put("level", o.optInt("level", 1).coerceIn(1, 99)).put("toNext", o.optInt("toNext", 0).coerceIn(0, 1_000_000)).put("pct", o.optInt("pct", 0).coerceIn(0, 100))
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("state", clean.toString()).apply()
            val mgr = AppWidgetManager.getInstance(context)
            mgr.getAppWidgetIds(ComponentName(context, StatsWidget::class.java)).forEach { mgr.updateAppWidget(it, build(context)) }
            PointsWidget.refresh(context)
        }

        fun readState(context: Context): JSONObject = try { JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("state", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }

        private fun build(context: Context): RemoteViews {
            val s = readState(context)
            val v = RemoteViews(context.packageName, R.layout.widget_stats)
            v.setTextViewText(R.id.stats_title, s.optString("name").ifBlank { context.getString(R.string.app_name) })
            v.setTextViewText(R.id.stats_stars, "⭐ ${s.optInt("stars", 0)}")
            v.setTextViewText(R.id.stats_streak, "🔥 ${s.optInt("streak", 0)}")
            v.setTextViewText(R.id.stats_week, context.getString(R.string.stats_week, s.optInt("week", 0)))
            v.setOnClickPendingIntent(R.id.stats_root, PendingIntent.getActivity(context, 600, MainActivity.startIntent(context, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
}
