package com.morningorganizer.app

import java.time.ZoneId
import java.time.ZonedDateTime

/** Pure alarm maths (no Android types) so it is unit-tested on the JVM. Mirrors web/js/alarms.js. */
object AlarmMath {
    /**
     * Next time an alarm at [hour]:[minute] fires strictly after [now].
     * [days] uses the JavaScript convention (0 = Sunday .. 6 = Saturday); empty means every day.
     */
    fun nextFire(hour: Int, minute: Int, days: Set<Int>, now: ZonedDateTime): ZonedDateTime? {
        if (hour !in 0..23 || minute !in 0..59) return null
        val allowed = if (days.isEmpty()) (0..6).toSet() else days
        for (add in 0L..7L) {
            val candidate = now.toLocalDate().plusDays(add).atTime(hour, minute).atZone(now.zone)
            // java.time: Monday=1..Sunday=7  ->  JS: Sunday=0..Saturday=6
            val jsDay = candidate.dayOfWeek.value % 7
            if (candidate.isAfter(now) && jsDay in allowed) return candidate
        }
        return null
    }

    fun nextFireMillis(hour: Int, minute: Int, days: Set<Int>, nowMillis: Long, zone: ZoneId = ZoneId.systemDefault()): Long? =
        nextFire(hour, minute, days, ZonedDateTime.ofInstant(java.time.Instant.ofEpochMilli(nowMillis), zone))?.toInstant()?.toEpochMilli()
}
