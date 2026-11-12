package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

/** Level and the way to the next one, drawn as a ring. The web app pushes the numbers together with the stats snapshot (StatsWidget.save). */
class PointsWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { manager.updateAppWidget(it, build(context)) } }

    companion object {
        fun refresh(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            mgr.getAppWidgetIds(ComponentName(context, PointsWidget::class.java)).forEach { mgr.updateAppWidget(it, build(context)) }
        }

        private fun build(context: Context): RemoteViews {
            val s = StatsWidget.readState(context)
            val level = s.optInt("level", 1).coerceIn(1, 99); val toNext = s.optInt("toNext", 0).coerceIn(0, 1_000_000); val pct = s.optInt("pct", 0)
            val v = RemoteViews(context.packageName, R.layout.widget_points)
            WidgetLook.apply(context, v, "2x2", R.drawable.wbg_points)
            val ring = when (PointsMath.ringStep(pct)) { 25 -> R.drawable.wi_ring_25; 50 -> R.drawable.wi_ring_50; 75 -> R.drawable.wi_ring_75; 100 -> R.drawable.wi_ring_100; else -> R.drawable.wi_ring_0 }
            v.setImageViewResource(R.id.points_ring, ring)
            v.setTextViewText(R.id.points_level, context.getString(R.string.points_level, level))
            v.setTextViewText(R.id.points_next, if (toNext > 0) context.getString(R.string.points_next, toNext, level + 1) else context.getString(R.string.points_max))
            v.setOnClickPendingIntent(R.id.points_root, PendingIntent.getActivity(context, 1000, MainActivity.startIntent(context, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
}
