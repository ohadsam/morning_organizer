package com.morningorganizer.app

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class NfcApduTest {
    private fun fetchFrom(offer: ByteArray?) = NfcApdu.fetch { NfcApdu.respond(it, offer) }

    @Test fun smallAndMultiSliceOffersRoundTrip() {
        for (size in listOf(1, 10, 238, 239, 240, 241, 700, 4096)) {
            val offer = ByteArray(size) { (it * 31 + 7).toByte() }
            assertArrayEquals("size $size", offer, fetchFrom(offer))
        }
    }

    @Test fun unicodeTextSurvives() {
        val text = "ML1.abc.אבג 🎒 שלום"
        assertEquals(text, String(fetchFrom(text.toByteArray(Charsets.UTF_8))!!, Charsets.UTF_8))
    }

    @Test fun nothingOnOfferAnswersNotFoundAndFetchReturnsNull() {
        assertTrue(NfcApdu.respond(NfcApdu.selectCommand(), null).contentEquals(NfcApdu.SW_NOT_FOUND))
        assertNull(fetchFrom(null))
    }

    @Test fun wrongApplicationIdIsRefused() {
        val wrong = NfcApdu.selectCommand().also { it[it.size - 1] = 0x55 }
        assertTrue(NfcApdu.respond(wrong, byteArrayOf(1)).contentEquals(NfcApdu.SW_NOT_FOUND))
    }

    @Test fun garbageAndShortCommandsAreRejected() {
        assertTrue(NfcApdu.respond(byteArrayOf(1, 2), byteArrayOf(1)).contentEquals(NfcApdu.SW_BAD_COMMAND))
        assertTrue(NfcApdu.respond(byteArrayOf(0x12, 0x34, 0, 0, 0), byteArrayOf(1)).contentEquals(NfcApdu.SW_BAD_COMMAND))
        assertTrue(NfcApdu.respond(NfcApdu.readCommand(5000, 10), byteArrayOf(1)).contentEquals(NfcApdu.SW_WRONG_PARAMS))
    }

    @Test fun readerGivesUpOnAHostilePhone() {
        // lies about the length (more than the allowed maximum)
        val huge = NfcApdu.fetch { cmd -> if (cmd[1] == 0xA4.toByte()) NfcApdu.SW_OK else byteArrayOf(0x7F, 0x00, 1, 2, 3, 0x90.toByte(), 0x00) }
        assertNull(huge)
        // never stops answering with a tiny chunk: bounded loop
        var calls = 0
        assertNull(NfcApdu.fetch { cmd -> calls++; if (cmd[1] == 0xA4.toByte()) NfcApdu.SW_OK else byteArrayOf(0, 5, 1, 0x90.toByte(), 0x00) })
        assertTrue(calls < 40)
    }

    @Test fun aidHexMatchesTheAidBytes() {
        assertEquals(NfcApdu.AID.joinToString("") { "%02X".format(it) }, NfcApdu.AID_HEX)
        assertFalse(NfcApdu.isOk(byteArrayOf(0x6A, 0x82.toByte())))
    }
}
