package com.morningorganizer.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Alarms do not survive a reboot, an app update or a clock/timezone change: re-arm them all. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        AlarmStore.rescheduleAll(context, AlarmStore.load(context))
        RoutineWidget.updateAll(context)
        RunWidget.clear(context)
    }
}
