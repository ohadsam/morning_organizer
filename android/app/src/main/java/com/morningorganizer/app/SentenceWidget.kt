package com.morningorganizer.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

/** A good sentence for the approach the person chose (CBT, NLP, ADHD...), changing every few hours. The text is a plain string array in the resources (English and Hebrew). */
class SentenceWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }

    override fun onDeleted(context: Context, ids: IntArray) {
        val e = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        ids.forEach { e.remove("m$it").remove("h$it") }
        e.apply()
    }

    companion object {
        private const val PREFS = "sentence_widget"

        fun save(context: Context, id: Int, method: String, hours: Int) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("m$id", SentenceMath.cleanMethod(method)).putInt("h$id", SentenceMath.cleanHours(hours)).apply()
        }
        fun method(context: Context, id: Int): String = SentenceMath.cleanMethod(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("m$id", "all"))
        fun hours(context: Context, id: Int): Int = SentenceMath.cleanHours(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getInt("h$id", 3))

        private fun sentences(context: Context, method: String): List<String> {
            val names = if (method == "all") SentenceMath.METHODS.drop(1) else listOf(method)
            return names.flatMap { n ->
                val rid = context.resources.getIdentifier("sentences_$n", "array", context.packageName)
                if (rid == 0) emptyList() else context.resources.getStringArray(rid).toList()
            }
        }

        fun update(context: Context, manager: AppWidgetManager, id: Int) {
            val m = method(context, id)
            val list = sentences(context, m)
            val text = if (list.isEmpty()) context.getString(R.string.app_name) else list[SentenceMath.index(System.currentTimeMillis(), hours(context, id), id, list.size)]
            val label = context.resources.getIdentifier("sentence_m_$m", "string", context.packageName).let { if (it == 0) "" else context.getString(it) }
            val v = RemoteViews(context.packageName, R.layout.widget_sentence)
            v.setTextViewText(R.id.sentence_text, text)
            v.setTextViewText(R.id.sentence_label, label)
            v.setOnClickPendingIntent(R.id.sentence_root, PendingIntent.getActivity(context, 800 + id, MainActivity.startIntent(context, null), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT))
            manager.updateAppWidget(id, v)
        }
    }
}
