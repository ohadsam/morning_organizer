package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Locale

/** The next reminder: a bell, the time it rings and the routine's name ("Alarms paused" and "No reminder" have their own words). A tap opens the alarms screen's app. */
class BellWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { manager.updateAppWidget(it, build(context)) } }

    companion object {
        fun refresh(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            mgr.getAppWidgetIds(ComponentName(context, BellWidget::class.java)).forEach { mgr.updateAppWidget(it, build(context)) }
        }

        private fun build(context: Context): RemoteViews {
            val now = System.currentTimeMillis(); val zone = ZoneId.systemDefault()
            val rules = AlarmStore.loadRules(context); val paused = BellMath.isPaused(rules, now)
            val next = BellMath.next(AlarmStore.load(context), rules, now, zone)
            val v = RemoteViews(context.packageName, R.layout.widget_bell)
            WidgetLook.apply(context, v, "4x1", R.drawable.wbg_mood)
            v.setImageViewResource(R.id.bell_icon, if (paused || next == null) R.drawable.wi_bell_off else R.drawable.wi_bell_0)
            when {
                paused -> { v.setTextViewText(R.id.bell_time, context.getString(R.string.bell_paused)); v.setTextViewText(R.id.bell_name, "") }
                next == null -> { v.setTextViewText(R.id.bell_time, context.getString(R.string.bell_none)); v.setTextViewText(R.id.bell_name, "") }
                else -> {
                    val at = Instant.ofEpochMilli(next.millis).atZone(zone); val clock = at.format(DateTimeFormatter.ofPattern("HH:mm"))
                    val day = when (BellMath.dayOffset(next.millis, now, zone)) { 0 -> ""; 1 -> context.getString(R.string.bell_tomorrow) + " "; else -> at.dayOfWeek.getDisplayName(TextStyle.SHORT, Locale.getDefault()) + " " }
                    v.setTextViewText(R.id.bell_time, day + clock); v.setTextViewText(R.id.bell_name, next.alarm.name.take(40))
                }
            }
            v.setOnClickPendingIntent(R.id.bell_root, PendingIntent.getActivity(context, 1100, MainActivity.startIntent(context, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
}
