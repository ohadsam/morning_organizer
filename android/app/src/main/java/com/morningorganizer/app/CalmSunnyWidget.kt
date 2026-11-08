package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** Sunny breathes on the home screen (a flipper of drawn frames); one tap opens the calm corner. */
class CalmSunnyWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val open = PendingIntent.getActivity(context, 510, MainActivity.routeIntent(context, "#/calm"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        ids.forEach { id -> manager.updateAppWidget(id, RemoteViews(context.packageName, R.layout.widget_calm_sunny).apply { setOnClickPendingIntent(R.id.calm_sunny_root, open) }) }
    }
}
