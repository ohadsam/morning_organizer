package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.view.View
import android.widget.RemoteViews
import org.json.JSONArray

/** Home-screen widget: up to four favourite routines, each one tap from starting. Data is pushed by the web app. */
class RoutineWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { manager.updateAppWidget(it, build(context)) }
    }

    companion object {
        private const val PREFS = "widget"
        private val BUTTONS = intArrayOf(R.id.widget_btn0, R.id.widget_btn1, R.id.widget_btn2, R.id.widget_btn3)

        fun save(context: Context, json: String) {
            // Only keep what the widget shows (and bound it): never store arbitrary web-provided blobs.
            val clean = JSONArray()
            val arr = try { JSONArray(json) } catch (_: Exception) { JSONArray() }
            for (i in 0 until minOf(arr.length(), 4)) {
                val o = arr.optJSONObject(i) ?: continue
                clean.put(org.json.JSONObject().put("id", o.optString("id").take(64)).put("name", o.optString("name").take(40)).put("icon", o.optString("icon").take(8)))
            }
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("items", clean.toString()).apply()
            updateAll(context)
        }

        fun updateAll(context: Context) {
            val mgr = AppWidgetManager.getInstance(context)
            val ids = mgr.getAppWidgetIds(ComponentName(context, RoutineWidget::class.java))
            ids.forEach { mgr.updateAppWidget(it, build(context)) }
        }

        private fun build(context: Context): RemoteViews {
            val views = RemoteViews(context.packageName, R.layout.widget_routines)
            WidgetLook.apply(context, views, "4x2", R.drawable.wbg_routines)
            val items = try { JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("items", "[]")) } catch (_: Exception) { JSONArray() }
            BUTTONS.forEachIndexed { i, viewId ->
                val o = items.optJSONObject(i)
                if (o == null) {
                    if (i == 0) { views.setTextViewText(viewId, context.getString(R.string.widget_empty)); views.setViewVisibility(viewId, View.VISIBLE) }
                    else views.setViewVisibility(viewId, View.GONE)
                    views.setOnClickPendingIntent(viewId, PendingIntent.getActivity(context, 100 + i, MainActivity.startIntent(context, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
                } else {
                    views.setViewVisibility(viewId, View.VISIBLE)
                    views.setTextViewText(viewId, "${o.optString("icon")}  ${o.optString("name")}")
                    views.setOnClickPendingIntent(viewId, PendingIntent.getActivity(context, 100 + i, MainActivity.startIntent(context, o.optString("id")), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
                }
            }
            return views
        }
    }
}
