package com.morningorganizer.app

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.os.Bundle
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.RadioButton
import android.widget.RadioGroup
import android.widget.ScrollView
import android.widget.TextView

/** Opens when a "good sentence" widget is placed: pick the approach and how often the sentence changes. */
class SentenceConfigActivity : Activity() {
    private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
        val dp = resources.displayMetrics.density
        val pad = (16 * dp).toInt()
        val box = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(pad, pad, pad, pad) }
        fun title(text: String) = TextView(this).apply { this.text = text; textSize = 18f; setPadding(0, pad / 2, 0, pad / 4) }
        box.addView(title(getString(R.string.sentence_cfg_title)))
        val methods = RadioGroup(this)
        val current = SentenceWidget.method(this, widgetId)
        SentenceMath.METHODS.forEach { m ->
            val label = getString(resources.getIdentifier("sentence_m_$m", "string", packageName))
            methods.addView(RadioButton(this).apply { id = 1000 + SentenceMath.METHODS.indexOf(m); text = label; textSize = 16f; minHeight = (48 * dp).toInt(); isChecked = m == current })
        }
        box.addView(methods, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        box.addView(title(getString(R.string.sentence_cfg_every)))
        val hours = RadioGroup(this)
        val curH = SentenceWidget.hours(this, widgetId)
        SentenceMath.HOURS.forEach { h ->
            val label = getString(resources.getIdentifier("sentence_h_$h", "string", packageName))
            hours.addView(RadioButton(this).apply { id = 2000 + h; text = label; textSize = 16f; minHeight = (48 * dp).toInt(); isChecked = h == curH })
        }
        box.addView(hours, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
        box.addView(Button(this).apply {
            text = getString(R.string.sentence_cfg_save); minHeight = (52 * dp).toInt()
            setOnClickListener {
                val m = SentenceMath.METHODS.getOrElse(methods.checkedRadioButtonId - 1000) { "all" }
                val h = hours.checkedRadioButtonId - 2000
                SentenceWidget.save(this@SentenceConfigActivity, widgetId, m, h)
                SentenceWidget.update(this@SentenceConfigActivity, AppWidgetManager.getInstance(this@SentenceConfigActivity), widgetId)
                setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
                finish()
            }
        })
        setContentView(ScrollView(this).apply { addView(box) })
    }
}
