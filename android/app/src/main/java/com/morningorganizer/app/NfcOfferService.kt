package com.morningorganizer.app

import android.nfc.cardemulation.HostApduService
import android.os.Bundle

/**
 * Answers a reading phone with whatever [NfcOffer] currently holds (see [NfcApdu]). Declared exported because the NFC system service
 * must bind it; BIND_NFC_SERVICE (held only by the platform) protects it, and requireDeviceUnlock means a locked phone offers nothing.
 */
class NfcOfferService : HostApduService() {
    override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray = NfcApdu.respond(commandApdu ?: ByteArray(0), NfcOffer.current())
    override fun onDeactivated(reason: Int) = Unit
}
