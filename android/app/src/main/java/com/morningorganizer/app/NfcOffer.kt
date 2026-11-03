package com.morningorganizer.app

/**
 * The one text this phone currently offers to a phone held against it. Card emulation answers ANY reader that selects our application
 * id, so the offer exists only while the person has asked to hand something over and expires on its own; the rest of the time the
 * service answers "nothing here" and a stranger brushing past learns nothing.
 */
object NfcOffer {
    @Volatile private var bytes: ByteArray? = null
    @Volatile private var expiresAt = 0L

    fun set(b: ByteArray, ttlMs: Long = 60_000) { bytes = b; expiresAt = System.currentTimeMillis() + ttlMs }
    fun clear() { bytes = null }
    fun current(): ByteArray? {
        val b = bytes ?: return null
        if (System.currentTimeMillis() > expiresAt) { bytes = null; return null }
        return b
    }
}
