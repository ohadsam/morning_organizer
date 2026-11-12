package com.morningorganizer.app

import java.time.Instant
import java.time.ZoneId

/** Pure maths of the bell widget: which reminder rings next, and whether the alarms are paused. No Android types, unit-tested on the JVM. */
object BellMath {
    data class Next(val alarm: RoutineAlarm, val millis: Long)

    fun isPaused(rules: AlarmRules, now: Long): Boolean = rules.pausedUntil == -1L || rules.pausedUntil > now

    /** The alarm that rings soonest after [now] (the quiet days and the pause already count); null when there is none or the alarms are paused. */
    fun next(alarms: List<RoutineAlarm>, rules: AlarmRules, now: Long, zone: ZoneId = ZoneId.systemDefault()): Next? {
        if (isPaused(rules, now)) return null
        return alarms.mapNotNull { a -> AlarmMath.nextFireMillis(a.hour, a.minute, a.days, now, zone, if (a.offDays) rules.skip else emptySet(), rules.pausedUntil)?.let { Next(a, it) } }.minByOrNull { it.millis }
    }

    /** 0 = today, 1 = tomorrow, 2 or more = later (calendar days in [zone]). */
    fun dayOffset(millis: Long, now: Long, zone: ZoneId = ZoneId.systemDefault()): Int {
        val a = Instant.ofEpochMilli(now).atZone(zone).toLocalDate(); val b = Instant.ofEpochMilli(millis).atZone(zone).toLocalDate()
        return java.time.temporal.ChronoUnit.DAYS.between(a, b).toInt().coerceAtLeast(0)
    }
}
