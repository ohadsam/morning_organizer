package com.morningorganizer.app

import java.time.ZoneId
import java.time.ZonedDateTime

/** Pure alarm maths (no Android types) so it is unit-tested on the JVM. Mirrors web/js/alarms.js. */
object AlarmMath {
    /**
     * Next time an alarm at [hour]:[minute] fires strictly after [now].
     * [days] uses the JavaScript convention (0 = Sunday .. 6 = Saturday); empty means every day.
     */
    fun nextFire(hour: Int, minute: Int, days: Set<Int>, now: ZonedDateTime, skip: Set<String> = emptySet(), pausedUntil: Long = 0L): ZonedDateTime? {
        if (hour !in 0..23 || minute !in 0..59) return null
        val allowed = if (days.isEmpty()) (0..6).toSet() else days
        // quiet days (holidays/vacations) and a pause can push the next ring weeks ahead (the summer vacation is two months)
        val horizon = if (skip.isNotEmpty() || pausedUntil != 0L) 430L else 7L
        for (add in 0L..horizon) {
            val candidate = now.toLocalDate().plusDays(add).atTime(hour, minute).atZone(now.zone)
            // java.time: Monday=1..Sunday=7  ->  JS: Sunday=0..Saturday=6
            val jsDay = candidate.dayOfWeek.value % 7
            val paused = pausedUntil == -1L || candidate.toInstant().toEpochMilli() < pausedUntil
            if (candidate.isAfter(now) && jsDay in allowed && !paused && candidate.toLocalDate().toString() !in skip) return candidate
        }
        return null
    }

    fun nextFireMillis(hour: Int, minute: Int, days: Set<Int>, nowMillis: Long, zone: ZoneId = ZoneId.systemDefault(), skip: Set<String> = emptySet(), pausedUntil: Long = 0L): Long? =
        nextFire(hour, minute, days, ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(nowMillis), zone), skip, pausedUntil)?.toInstant()?.toEpochMilli()
}
