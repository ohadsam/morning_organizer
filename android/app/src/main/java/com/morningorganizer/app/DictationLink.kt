package com.morningorganizer.app

import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import org.json.JSONObject

/**
 * Speech-to-text for journal dictation, using the phone's own recognizer (prefers offline). Must run on the main thread.
 * Keeps listening (restarting after each phrase) until [stop]. Results go to the page as {type:'dictation', status, text}.
 */
class DictationLink(private val activity: MainActivity, private val send: (JSONObject) -> Unit) {
    private var rec: SpeechRecognizer? = null
    private var want = false
    private var lang = "en-US"
    private var failures = 0

    fun available(): Boolean = SpeechRecognizer.isRecognitionAvailable(activity)

    fun start(language: String) {
        if (want) return
        lang = if (language == "he-IL") "he-IL" else "en-US"
        if (!available()) { send(event("error").put("reason", "unavailable")); return }
        want = true; failures = 0
        activity.withMic { ok -> if (ok && want) begin() else { want = false; send(event("error").put("reason", "denied")) } }
    }

    fun stop() {
        want = false
        rec?.run { runCatching { cancel() }; runCatching { destroy() } }
        rec = null
        send(event("stopped"))
    }

    private fun event(status: String) = JSONObject().put("type", "dictation").put("status", status)

    private fun begin() {
        if (!want) return
        rec?.destroy()
        val r = SpeechRecognizer.createSpeechRecognizer(activity).also { rec = it }
        r.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty().take(2000)
                if (text.isNotBlank()) { failures = 0; send(event("final").put("text", text)) }
                begin()
            }
            override fun onPartialResults(partial: Bundle?) {
                val text = partial?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty().take(2000)
                if (text.isNotBlank()) send(event("partial").put("text", text))
            }
            override fun onError(error: Int) {
                if (!want) return
                // "nothing heard" is normal while someone thinks: just listen again. Anything else repeated a few times = give up.
                val quiet = error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                if (!quiet && ++failures > 3) { want = false; send(event("error").put("reason", "failed")); return }
                activity.window.decorView.postDelayed({ begin() }, if (quiet) 100 else 500)
            }
            override fun onReadyForSpeech(params: Bundle?) { send(event("listening")) }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, activity.packageName))
    }
}
