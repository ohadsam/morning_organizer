package com.morningorganizer.app

/** The little ring of the points widget: the nearest of five pictures (0, 25, 50, 75, 100 percent). */
object PointsMath {
    fun ringStep(pct: Int): Int = ((pct.coerceIn(0, 100) + 12) / 25 * 25).coerceIn(0, 100)
}
