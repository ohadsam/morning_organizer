package com.morningorganizer.app

import org.junit.Assert.assertEquals
import org.junit.Test

class PointsMathTest {
    @Test fun nearestOfFivePictures() {
        assertEquals(0, PointsMath.ringStep(0)); assertEquals(0, PointsMath.ringStep(12)); assertEquals(25, PointsMath.ringStep(13)); assertEquals(25, PointsMath.ringStep(37))
        assertEquals(50, PointsMath.ringStep(38)); assertEquals(50, PointsMath.ringStep(50)); assertEquals(75, PointsMath.ringStep(62)); assertEquals(100, PointsMath.ringStep(88)); assertEquals(100, PointsMath.ringStep(100))
    }
    @Test fun outOfRangeIsClamped() { assertEquals(0, PointsMath.ringStep(-30)); assertEquals(100, PointsMath.ringStep(400)) }
}
