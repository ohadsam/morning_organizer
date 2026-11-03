package com.morningorganizer.app

import android.app.Activity
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.os.Handler
import android.os.Looper
import org.json.JSONObject

/**
 * Reads a text offered by the phone held against this one. Reader mode is on only while the person asked to receive (a few seconds,
 * auto-off, and off when the app is paused): a phone that always reads would pop up for every tag it passes.
 */
class NfcReaderLink(private val activity: Activity, private val emit: (JSONObject) -> Unit) {
    private val handler = Handler(Looper.getMainLooper())
    @Volatile private var active = false

    fun start(seconds: Int) {
        val nfc = NfcAdapter.getDefaultAdapter(activity)
        if (nfc == null || !nfc.isEnabled) { emit(event("unavailable")); return }
        stop()
        active = true
        runCatching {
            nfc.enableReaderMode(activity, { tag -> read(tag)?.let { text -> emit(JSONObject().put("type", "import").put("text", text)); emit(event("done")); finish() } },
                NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK, null)
        }.onFailure { active = false; emit(event("unavailable")); return }
        emit(event("listening"))
        handler.postDelayed({ if (active) { stop(); emit(event("timeout")) } }, seconds * 1000L)
    }

    /** Called from the reader callback (binder thread): stop on the main thread. */
    private fun finish() = handler.post { stop() }

    fun stop() {
        handler.removeCallbacksAndMessages(null)
        if (active) { active = false; runCatching { NfcAdapter.getDefaultAdapter(activity)?.disableReaderMode(activity) } }
    }

    private fun read(tag: Tag): String? {
        val iso = IsoDep.get(tag) ?: return null
        return try {
            iso.connect(); iso.timeout = 3_000
            NfcApdu.fetch { iso.transceive(it) }?.let { String(it, Charsets.UTF_8) }
        } catch (_: Exception) { null } finally { runCatching { iso.close() } }
    }

    private fun event(state: String) = JSONObject().put("type", "nfcrx").put("status", state)
}
