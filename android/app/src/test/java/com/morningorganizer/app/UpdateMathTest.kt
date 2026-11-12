package com.morningorganizer.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateMathTest {
    @Test fun readsTheVersionOutOfAReleaseTitle() {
        assertEquals(listOf(1, 49, 1), UpdateMath.parse("v1.49.1 (build 333)")); assertEquals(listOf(2, 0, 10), UpdateMath.parse("2.0.10")); assertNull(UpdateMath.parse("latest")); assertNull(UpdateMath.parse(null))
    }
    @Test fun aHigherVersionIsNewAndTheSameOrLowerIsNot() {
        assertTrue(UpdateMath.isNewer("1.49.1", "v1.50.0 (build 340)")); assertTrue(UpdateMath.isNewer("1.49.1", "v1.49.2")); assertTrue(UpdateMath.isNewer("1.9.0", "v1.10.0 (build 1)"))
        assertFalse(UpdateMath.isNewer("1.49.1", "v1.49.1 (build 340)")); assertFalse(UpdateMath.isNewer("1.50.0", "v1.49.9")); assertFalse(UpdateMath.isNewer("junk", "v1.50.0")); assertFalse(UpdateMath.isNewer("1.49.1", "nothing"))
    }
    @Test fun onlyOurOwnApkDownloadIsTrusted() {
        assertTrue(UpdateMath.isTrustedApk("https://github.com/ohadsam/morning_organizer/releases/download/build-333/morning-organizer.apk"))
        assertFalse(UpdateMath.isTrustedApk("https://evil.example/releases/download/x/morning-organizer.apk")); assertFalse(UpdateMath.isTrustedApk("http://github.com/ohadsam/morning_organizer/releases/download/b/morning-organizer.apk"))
        assertFalse(UpdateMath.isTrustedApk("https://github.com/ohadsam/morning_organizer/releases/download/b/other.apk")); assertFalse(UpdateMath.isTrustedApk(null)); assertFalse(UpdateMath.isTrustedApk("https://github.com/ohadsam/morning_organizer/releases/download/b/morning-organizer.apk evil"))
    }
}
