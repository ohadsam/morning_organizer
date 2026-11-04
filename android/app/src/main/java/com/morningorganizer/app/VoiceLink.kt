package com.morningorganizer.app

import android.content.Intent
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale

/**
 * The app's own text-to-speech through the phone's engine. The WebView's built-in speechSynthesis often hides most installed voices and ignores
 * pitch, which made every character sound the same; here the page picks a real installed voice and gets exact pitch and pace.
 * Events to the page: {type:'tts', status:'ready'} once voices are known, {type:'tts', status:'done'|'error', id} per phrase.
 */
class VoiceLink(private val activity: MainActivity, private val send: (JSONObject) -> Unit) {
    private var tts: TextToSpeech? = null
    @Volatile private var ready = false
    private var starting = false
    private val waiting = ArrayDeque<() -> Unit>()
    private var enginePkg: String? = null

    fun available(): Boolean = activity.packageManager.queryIntentServices(Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE), 0).isNotEmpty()

    private fun ensure(then: (() -> Unit)? = null) {
        activity.runOnUiThread {
            if (ready) { then?.invoke(); return@runOnUiThread }
            if (then != null) waiting.add(then)
            if (starting) return@runOnUiThread
            starting = true
            tts = TextToSpeech(activity.applicationContext, { status ->
                starting = false
                if (status == TextToSpeech.SUCCESS) {
                    ready = true
                    tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                        override fun onStart(utteranceId: String?) {}
                        override fun onDone(utteranceId: String?) { send(JSONObject().put("type", "tts").put("status", "done").put("id", utteranceId ?: "")) }
                        @Deprecated("Deprecated in Java") override fun onError(utteranceId: String?) { send(JSONObject().put("type", "tts").put("status", "error").put("id", utteranceId ?: "")) }
                    })
                    send(JSONObject().put("type", "tts").put("status", "ready"))
                    while (waiting.isNotEmpty()) waiting.removeFirst().invoke()
                } else { tts = null; waiting.clear(); send(JSONObject().put("type", "tts").put("status", "unavailable")) }
            }, enginePkg)
        }
    }

    /** Installed voices as [{name, lang, quality, network}]; empty until the engine is ready (a 'ready' event follows). */
    fun voices(): String {
        if (!ready) { ensure(); return "[]" }
        val out = JSONArray()
        runCatching {
            for (v: Voice in tts?.voices.orEmpty()) {
                if (v.features?.contains("notInstalled") == true) continue
                out.put(JSONObject().put("name", v.name).put("lang", v.locale.toLanguageTag()).put("quality", v.quality).put("network", v.isNetworkConnectionRequired))
            }
        }
        return out.toString()
    }

    /** Installed text-to-speech engines as [{name (package), label, current}]; the person can pick e.g. an offline neural engine they installed. */
    fun engines(): String {
        if (!ready) { ensure(); return "[]" }
        val out = JSONArray()
        runCatching { val cur = tts?.defaultEngine; for (e in tts?.engines.orEmpty()) out.put(JSONObject().put("name", e.name).put("label", e.label ?: e.name).put("current", e.name == (enginePkg ?: cur))) }
        return out.toString()
    }

    /** Switches to another installed engine (an empty name = the phone's default). The page gets a new 'ready' event and re-reads the voices. */
    fun setEngine(pkg: String) {
        val want = pkg.takeIf { it.isNotEmpty() && Regex("^[\\w.]{1,100}$").matches(it) }
        if (want == enginePkg && ready) return
        if (want != null && ready && tts?.engines.orEmpty().none { it.name == want }) return
        activity.runOnUiThread { runCatching { tts?.stop(); tts?.shutdown() }; tts = null; ready = false; starting = false; enginePkg = want; ensure() }
    }

    fun speak(id: String, text: String, voiceName: String, lang: String, pitch: Float, rate: Float) {
        ensure {
            val e = tts ?: return@ensure
            runCatching {
                val v = if (voiceName.isNotEmpty()) e.voices?.firstOrNull { it.name == voiceName } else null
                if (v != null) e.voice = v else e.language = if (lang.startsWith("he")) Locale("iw", "IL") else Locale.US
                e.setPitch(pitch.coerceIn(0.3f, 2f)); e.setSpeechRate(rate.coerceIn(0.4f, 2f))
                e.speak(text.take(500), TextToSpeech.QUEUE_FLUSH, null, id.take(64))
            }.onFailure { send(JSONObject().put("type", "tts").put("status", "error").put("id", id)) }
        }
    }

    fun stop() { if (ready) activity.runOnUiThread { runCatching { tts?.stop() } } }

    /** Opens the phone's own screen for downloading more voices (Google / Samsung voice data), falling back to the TTS settings. */
    fun installVoices() {
        activity.runOnUiThread {
            val tries = listOf(Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA), Intent("com.android.settings.TTS_SETTINGS"), Intent(android.provider.Settings.ACTION_SETTINGS))
            for (i in tries) { if (runCatching { activity.startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }.isSuccess) break }
        }
    }

    fun shutdown() { runCatching { tts?.stop(); tts?.shutdown() }; tts = null; ready = false; starting = false }
}
