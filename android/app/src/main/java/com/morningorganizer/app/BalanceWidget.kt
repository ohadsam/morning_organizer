package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.widget.RemoteViews

/** A seesaw for the week: routines finished on one side, looking after yourself (check-ins and look-backs) on the other. The web app pushes the three numbers (StatsWidget.save). A tap opens "how do I feel". */
class BalanceWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { manager.updateAppWidget(it, build(context)) } }

    companion object {
        fun refresh(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            mgr.getAppWidgetIds(ComponentName(context, BalanceWidget::class.java)).forEach { mgr.updateAppWidget(it, build(context)) }
        }

        private fun build(context: Context): RemoteViews {
            val s = StatsWidget.readState(context)
            val doing = s.optInt("doing", 0).coerceIn(0, 9999); val care = s.optInt("care", 0).coerceIn(0, 9999)
            val pic = when (s.optInt("bal", 2).coerceIn(0, 4)) { 0 -> R.drawable.wi_balance_0; 1 -> R.drawable.wi_balance_1; 3 -> R.drawable.wi_balance_3; 4 -> R.drawable.wi_balance_4; else -> R.drawable.wi_balance_2 }
            val v = RemoteViews(context.packageName, R.layout.widget_balance)
            WidgetLook.apply(context, v, "2x2", R.drawable.wbg_points)
            v.setImageViewResource(R.id.balance_pic, pic)
            v.setTextViewText(R.id.balance_text, context.getString(R.string.balance_text, doing, care))
            v.setOnClickPendingIntent(R.id.balance_root, PendingIntent.getActivity(context, 1200, MainActivity.routeIntent(context, "#/feel"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            return v
        }
    }
}
