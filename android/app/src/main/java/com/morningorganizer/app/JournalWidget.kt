package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** One-tap home-screen button that opens the journal (the page decides what a locked journal shows). */
class JournalWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val open = PendingIntent.getActivity(context, 700, MainActivity.routeIntent(context, "#/journal"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        ids.forEach { id -> manager.updateAppWidget(id, RemoteViews(context.packageName, R.layout.widget_journal).apply { setOnClickPendingIntent(R.id.journal_root, open) }) }
    }
}
