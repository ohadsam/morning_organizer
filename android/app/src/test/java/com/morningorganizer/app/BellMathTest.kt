package com.morningorganizer.app

import java.time.ZoneId
import java.time.ZonedDateTime
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class BellMathTest {
    private val zone = ZoneId.of("Asia/Jerusalem")
    private val tue8 = ZonedDateTime.of(2026, 11, 3, 8, 0, 0, 0, zone).toInstant().toEpochMilli()   // Tuesday 08:00
    private fun alarm(id: String, h: Int, m: Int, days: Set<Int> = emptySet(), offDays: Boolean = true) =
        RoutineAlarm(id, "t$id", "Routine $id", h, m, days, 80, true, 30, offDays = offDays)

    @Test fun theSoonestAlarmWins() {
        val n = BellMath.next(listOf(alarm("a", 21, 0), alarm("b", 9, 30), alarm("c", 7, 0)), AlarmRules(), tue8, zone)!!
        assertEquals("b", n.alarm.id)
    }
    @Test fun noAlarmsMeansNothingNext() { assertNull(BellMath.next(emptyList(), AlarmRules(), tue8, zone)) }
    @Test fun pausedMeansNothingNext() {
        assertTrue(BellMath.isPaused(AlarmRules(pausedUntil = -1L), tue8)); assertNull(BellMath.next(listOf(alarm("a", 9, 0)), AlarmRules(pausedUntil = -1L), tue8, zone))
        assertTrue(BellMath.isPaused(AlarmRules(pausedUntil = tue8 + 1000), tue8)); assertFalse(BellMath.isPaused(AlarmRules(pausedUntil = tue8 - 1000), tue8)); assertFalse(BellMath.isPaused(AlarmRules(), tue8))
    }
    @Test fun quietDaysAreSkippedOnlyForAlarmsThatKeepQuietOnDaysOff() {
        val rules = AlarmRules(skip = setOf("2026-11-03"))
        assertEquals(1, BellMath.dayOffset(BellMath.next(listOf(alarm("a", 9, 0)), rules, tue8, zone)!!.millis, tue8, zone))   // today is quiet: tomorrow
        assertEquals(0, BellMath.dayOffset(BellMath.next(listOf(alarm("a", 9, 0, offDays = false)), rules, tue8, zone)!!.millis, tue8, zone))
    }
    @Test fun dayOffsetCountsCalendarDays() {
        val later = ZonedDateTime.of(2026, 11, 3, 23, 0, 0, 0, zone).toInstant().toEpochMilli()
        assertEquals(0, BellMath.dayOffset(later, tue8, zone)); assertEquals(1, BellMath.dayOffset(later + 3_600_000 * 2, tue8, zone)); assertEquals(5, BellMath.dayOffset(later + 5 * 86_400_000L, tue8, zone))
    }
}
