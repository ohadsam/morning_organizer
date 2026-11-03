package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** One-tap home-screen button that opens the calm corner (breathing) in the app. */
class CalmWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val open = PendingIntent.getActivity(context, 500, MainActivity.routeIntent(context, "#/calm"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        ids.forEach { id -> manager.updateAppWidget(id, RemoteViews(context.packageName, R.layout.widget_calm).apply { setOnClickPendingIntent(R.id.calm_root, open) }) }
    }
}
