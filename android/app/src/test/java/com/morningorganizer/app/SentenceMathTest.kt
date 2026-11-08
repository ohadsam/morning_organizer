package com.morningorganizer.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class SentenceMathTest {
    private val h = 3_600_000L

    @Test fun sameSentenceInsideTheInterval() {
        assertEquals(SentenceMath.index(10 * h, 3, 7, 8), SentenceMath.index(11 * h, 3, 7, 8))
        assertEquals(SentenceMath.index(9 * h, 3, 7, 8), SentenceMath.index(9 * h + h, 3, 7, 8))
    }

    @Test fun changesAfterTheInterval() {
        assertNotEquals(SentenceMath.index(9 * h, 3, 7, 8), SentenceMath.index(12 * h, 3, 7, 8))
    }

    @Test fun everySentenceComesUpBeforeOneRepeats() {
        for (size in listOf(8, 56)) {
            val seen = (0 until size).map { SentenceMath.index(it * 6 * h, 6, 3, size) }.toSet()
            assertEquals(size, seen.size)
        }
    }

    @Test fun neverOutOfRangeEvenForOddInputs() {
        for (id in listOf(0, 1, 2147483647, -5)) for (t in listOf(0L, 1L, 123456789012L)) {
            val i = SentenceMath.index(t, 99, id, 8); assertTrue(i in 0..7)
        }
        assertEquals(0, SentenceMath.index(5L, 3, 1, 0))
    }

    @Test fun badSettingsFallBackToTheDefaults() {
        assertEquals("all", SentenceMath.cleanMethod("evil")); assertEquals("all", SentenceMath.cleanMethod(null)); assertEquals("nlp", SentenceMath.cleanMethod("nlp"))
        assertEquals(3, SentenceMath.cleanHours(7)); assertEquals(24, SentenceMath.cleanHours(24))
    }
}
