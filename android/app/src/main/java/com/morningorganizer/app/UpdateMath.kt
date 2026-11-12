package com.morningorganizer.app

/** Pure helpers of the "check for a new version" button (no Android types, unit-tested on the JVM). */
object UpdateMath {
    private val VERSION = Regex("""(\d+)\.(\d+)\.(\d+)""")
    const val APK_PREFIX = "https://github.com/ohadsam/morning_organizer/releases/download/"
    const val APK_NAME = "morning-organizer.apk"

    /** The first x.y.z in [s] ("v1.49.1 (build 333)" -> [1, 49, 1]), or null. */
    fun parse(s: String?): List<Int>? = VERSION.find(s ?: "")?.destructured?.toList()?.map { it.toIntOrNull() ?: return null }

    /** True when [latest] (a release title such as "v1.50.0 (build 340)") is a higher version than [installed] ("1.49.1"). The same version in another build is not new. */
    fun isNewer(installed: String?, latest: String?): Boolean {
        val a = parse(installed) ?: return false
        val b = parse(latest) ?: return false
        for (i in 0..2) if (a[i] != b[i]) return b[i] > a[i]
        return false
    }

    /** Only a download of our own APK from our own releases is ever opened. */
    fun isTrustedApk(url: String?): Boolean = url != null && url.length <= 300 && url.startsWith(APK_PREFIX) && url.endsWith("/$APK_NAME") && !url.contains(' ')
}
