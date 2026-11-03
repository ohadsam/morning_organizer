package com.morningorganizer.app

import java.time.DayOfWeek
import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class AlarmMathTest {
    private val zone = ZoneId.of("Asia/Jerusalem")
    private val tue8 = ZonedDateTime.of(2026, 11, 3, 8, 0, 0, 0, zone) // Tuesday 08:00

    @Test fun laterTodayWhenTimeNotPassed() {
        val r = AlarmMath.nextFire(9, 0, emptySet(), tue8)!!
        assertEquals(3, r.dayOfMonth); assertEquals(9, r.hour)
    }

    @Test fun tomorrowWhenTimeAlreadyPassed() {
        assertEquals(4, AlarmMath.nextFire(7, 0, emptySet(), tue8)!!.dayOfMonth)
    }

    @Test fun exactlyNowIsNotInTheFuture() {
        assertEquals(4, AlarmMath.nextFire(8, 0, emptySet(), tue8)!!.dayOfMonth)
    }

    @Test fun respectsJavaScriptWeekdayNumbering() {
        val monday = AlarmMath.nextFire(7, 0, setOf(1), tue8)!!
        assertEquals(DayOfWeek.MONDAY, monday.dayOfWeek); assertEquals(9, monday.dayOfMonth)
        val sunday = AlarmMath.nextFire(7, 0, setOf(0), tue8)!!
        assertEquals(DayOfWeek.SUNDAY, sunday.dayOfWeek); assertEquals(8, sunday.dayOfMonth)
    }

    @Test fun invalidTimesReturnNull() {
        assertNull(AlarmMath.nextFire(24, 0, emptySet(), tue8)); assertNull(AlarmMath.nextFire(7, 60, emptySet(), tue8))
    }

    @Test fun keepsWallClockAcrossDstChange() {
        // Israel leaves DST on Sun 2026-10-25 -> an alarm at 07:00 must still fire at 07:00 local time.
        val sat = ZonedDateTime.of(2026, 10, 24, 12, 0, 0, 0, zone)
        val next = AlarmMath.nextFire(7, 0, setOf(0), sat)!!
        assertEquals(25, next.dayOfMonth); assertEquals(7, next.hour)
    }
}
