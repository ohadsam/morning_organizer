package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** Five faces on the home screen: one tap opens "how do I feel" with that face already chosen (the page asks the rest and saves). */
class MoodWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        val faces = intArrayOf(R.id.mood_1, R.id.mood_2, R.id.mood_3, R.id.mood_4, R.id.mood_5)
        ids.forEach { id ->
            val v = RemoteViews(context.packageName, R.layout.widget_mood)
            faces.forEachIndexed { i, view ->
                val open = PendingIntent.getActivity(context, 900 + i, MainActivity.routeIntent(context, "#/feel/${i + 1}"), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
                v.setOnClickPendingIntent(view, open)
            }
            manager.updateAppWidget(id, v)
        }
    }
}
