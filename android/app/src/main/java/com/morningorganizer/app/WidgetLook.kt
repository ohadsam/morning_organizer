package com.morningorganizer.app

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/** The look (skin) the person chose in the web app, and the matching widget card (wbgk_<size>_<skin>; light and dark come from the night resource folder). */
object WidgetLook {
    private const val PREFS = "widget"
    private const val KEY = "skin"
    private val SKINS = setOf("default", "ocean", "forest", "sunset", "candy", "slate", "calm", "bold")
    private val PROVIDERS = listOf(
        RoutineWidget::class.java, RunWidget::class.java, StatsWidget::class.java, PointsWidget::class.java, JournalWidget::class.java,
        CalmWidget::class.java, CalmSunnyWidget::class.java, SentenceWidget::class.java, MoodWidget::class.java, RoutineCardWidget::class.java,
    )

    fun current(context: Context): String = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "default").takeIf { it in SKINS } ?: "default"

    /** Remembers the look (only a known name is kept) and redraws the widgets when it changed. */
    fun save(context: Context, skin: String) {
        val s = skin.trim()
        if (s !in SKINS || s == current(context)) return
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, s).apply()
        val mgr = AppWidgetManager.getInstance(context)
        PROVIDERS.forEach { cls ->
            val ids = mgr.getAppWidgetIds(ComponentName(context, cls))
            if (ids.isNotEmpty()) context.sendBroadcast(Intent(context, cls).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids))
        }
    }

    /** The drawable of the card for [size] ("4x2", "2x2" or "4x1") in the chosen look; [fallback] when there is none. */
    fun res(context: Context, size: String, fallback: Int): Int {
        val id = context.resources.getIdentifier("wbgk_${size}_${current(context)}", "drawable", context.packageName)
        return if (id != 0) id else fallback
    }

    fun apply(context: Context, views: RemoteViews, size: String, fallback: Int) { views.setImageViewResource(R.id.widget_bg_img, res(context, size, fallback)) }
}
