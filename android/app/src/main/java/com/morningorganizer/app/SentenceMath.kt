package com.morningorganizer.app

/** Which sentence a "good sentence" widget shows now (pure, so it can be tested): it changes every [hours] hours and differs between widgets. */
object SentenceMath {
    val METHODS = listOf("all", "cbt", "cogfun", "nlp", "adhd", "anxiety", "organize", "motivation")
    val HOURS = listOf(1, 3, 6, 24)

    fun cleanMethod(m: String?): String = if (m != null && m in METHODS) m else "all"
    fun cleanHours(h: Int): Int = if (h in HOURS) h else 3

    /** Index in a list of [size] sentences at [nowMs]; 5 is coprime with the list sizes (8 and 56), so every sentence comes up before one repeats. */
    fun index(nowMs: Long, hours: Int, widgetId: Int, size: Int): Int {
        if (size <= 0) return 0
        val bucket = Math.floorDiv(nowMs, cleanHours(hours) * 3_600_000L)
        return Math.floorMod(bucket * 5 + widgetId, size.toLong()).toInt()
    }
}
