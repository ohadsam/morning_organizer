package com.morningorganizer.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/** Fires when an alarm is due: starts the ringing service and arms the next occurrence. */
class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != ACTION) return
        val svc = Intent(context, AlarmService::class.java)
            .putExtra("templateId", intent.getStringExtra("templateId") ?: return)
            .putExtra("name", intent.getStringExtra("name") ?: "")
            .putExtra("volume", intent.getIntExtra("volume", 80))
            .putExtra("vibrate", intent.getBooleanExtra("vibrate", true))
            .putExtra("durationSec", intent.getIntExtra("durationSec", 30))
            .putExtra("sound", intent.getStringExtra("sound") ?: "alarm").putExtra("text", intent.getStringExtra("text") ?: "")
            .putExtra("speak", intent.getBooleanExtra("speak", false)).putExtra("pitch", intent.getFloatExtra("pitch", 1f)).putExtra("rate", intent.getFloatExtra("rate", 1f))
            .putExtra("lang", intent.getStringExtra("lang") ?: "en-US").putExtra("start", intent.getStringExtra("start") ?: "offer")
            .putExtra("tone", intent.getStringExtra("tone") ?: "").putExtra("n", intent.getIntExtra("n", 1)).putExtra("of", intent.getIntExtra("of", 1))
        ContextCompat.startForegroundService(context, svc)
        AlarmStore.rescheduleAll(context, AlarmStore.load(context)) // next occurrence (this one is now in the past)
    }

    companion object { const val ACTION = "com.morningorganizer.app.ALARM" }
}
