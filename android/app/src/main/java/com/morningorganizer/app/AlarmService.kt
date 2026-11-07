package com.morningorganizer.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.AlarmManager
import android.app.NotificationManager
import android.net.Uri
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.tts.TextToSpeech
import java.util.Locale
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/** Rings (sound at the chosen volume + vibration) for the chosen duration, with a Start / Stop notification. */
class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private var tts: TextToSpeech? = null
    private var last: Intent? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopSelf(); return START_NOT_STICKY }
        if (intent?.action == ACTION_SNOOZE) { snooze(); stopSelf(); return START_NOT_STICKY }
        last = intent?.let { Intent(it) }
        val templateId = intent?.getStringExtra("templateId") ?: run { stopSelf(); return START_NOT_STICKY }
        val name = intent.getStringExtra("name").orEmpty()
        val volume = intent.getIntExtra("volume", 80).coerceIn(0, 100)
        val vibrate = intent.getBooleanExtra("vibrate", true)
        val durationSec = intent.getIntExtra("durationSec", 30).coerceIn(5, 600)
        val sound = intent.getStringExtra("sound") ?: "alarm"
        val tone = intent.getStringExtra("tone") ?: ""
        val text = intent.getStringExtra("text").orEmpty().take(80)
        val speak = intent.getBooleanExtra("speak", false)
        val start = intent.getStringExtra("start") ?: "offer"
        val n = intent.getIntExtra("n", 1); val of = intent.getIntExtra("of", 1)

        ensureChannel()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(templateId, name, text, start, n, of), type)

        stopRinging()
        if (volume > 0) startSound(volume / 100f, sound, tone)
        if (vibrate) startVibration()
        if (speak) {
            val msg = text.ifBlank { getString(R.string.alarm_title, name) }
            val pitch = intent.getFloatExtra("pitch", 1f).coerceIn(0.1f, 2f); val rate = intent.getFloatExtra("rate", 1f).coerceIn(0.3f, 2f)
            val lang = intent.getStringExtra("lang") ?: "en-US"
            // let the alarm sound first, then say the message (it is meant to help the person actually get up)
            handler.postDelayed({
                tts = TextToSpeech(applicationContext) { status ->
                    val engine = tts
                    if (status == TextToSpeech.SUCCESS && engine != null) {
                        engine.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                        engine.setLanguage(Locale.forLanguageTag(lang)); engine.setPitch(pitch); engine.setSpeechRate(rate)
                        engine.speak(msg, TextToSpeech.QUEUE_FLUSH, null, "alarm")
                    }
                }
            }, 2500)
        }
        handler.postDelayed({ stopSelf() }, durationSec * 1000L)
        return START_NOT_STICKY
    }

    /** Rings again in five minutes with the same settings (one-shot alarm clock entry, no extra permission). */
    private fun snooze() {
        val src = last ?: return
        val templateId = src.getStringExtra("templateId") ?: return
        val again = Intent(this, AlarmReceiver::class.java).setAction(AlarmReceiver.ACTION).setData(Uri.parse("alarm://snooze/${Uri.encode(templateId)}")).putExtras(src)
        val pi = PendingIntent.getBroadcast(this, 5000 + templateId.hashCode(), again, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val show = PendingIntent.getActivity(this, 6, MainActivity.startIntent(this, templateId, "offer", src.getStringExtra("text")), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        (getSystemService(Context.ALARM_SERVICE) as AlarmManager).setAlarmClock(AlarmManager.AlarmClockInfo(System.currentTimeMillis() + SNOOZE_MS, show), pi)
    }

    private fun buildNotification(templateId: String, name: String, text: String, start: String, n: Int, of: Int): Notification {
        // tapping the alarm (or the lock-screen takeover) opens the app on the offer or starts straight away, as chosen; the Start button always starts
        val open = PendingIntent.getActivity(this, 1, MainActivity.startIntent(this, templateId, start, text), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val snoozeIntent = PendingIntent.getService(this, 4, Intent(this, AlarmService::class.java).setAction(ACTION_SNOOZE), PendingIntent.FLAG_IMMUTABLE)
        val startNow = PendingIntent.getActivity(this, 3, MainActivity.startIntent(this, templateId), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this, 2, Intent(this, AlarmService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_sonrise)
            .setContentTitle(if (of > 1) getString(R.string.alarm_title_n, name, n, of) else getString(R.string.alarm_title, name)).setContentText(text.ifBlank { getString(R.string.alarm_text) })
            .setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(open).setFullScreenIntent(open, true).setOngoing(true).setAutoCancel(true)
            .addAction(0, getString(R.string.alarm_start), startNow).addAction(0, getString(R.string.alarm_snooze), snoozeIntent).addAction(0, getString(R.string.alarm_stop), stop)
            .build()
    }

    private fun ensureChannel() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, getString(R.string.alarm_channel), NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null); enableVibration(false) })
        }
    }

    private fun startSound(level: Float, sound: String, tone: String = "") {
        try {
            // the web app's tone names map to the closest system sound; "device" is a sound the person picked from the phone
            val kind = when (sound) { "ringtone", "melody" -> RingtoneManager.TYPE_RINGTONE; "gentle", "bell", "birds" -> RingtoneManager.TYPE_NOTIFICATION; else -> RingtoneManager.TYPE_ALARM }
            val picked = if (sound == "device" && tone.startsWith("content://")) android.net.Uri.parse(tone) else null
            val uri = picked ?: RingtoneManager.getActualDefaultRingtoneUri(this, kind)
                ?: RingtoneManager.getDefaultUri(kind) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                setDataSource(this@AlarmService, uri); isLooping = sound != "gentle"; setVolume(if (sound == "rising") level * 0.2f else level, if (sound == "rising") level * 0.2f else level); prepare(); start()
            }
            if (sound == "rising") {   // gets louder over ~20 s: a gentler way to wake up
                var step = 1
                val ramp = object : Runnable { override fun run() { val v = (level * (0.2f + 0.8f * step / 10f)).coerceAtMost(level); player?.setVolume(v, v); if (step++ < 10) handler.postDelayed(this, 2000) } }
                handler.postDelayed(ramp, 2000)
            }
        } catch (_: Exception) { player = null } // no sound is better than a crash at 6am; vibration still runs
    }

    private fun vibrator(): Vibrator? =
        if (Build.VERSION.SDK_INT >= 31) (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        else @Suppress("DEPRECATION") getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    private fun startVibration() { vibrator()?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 400), 0)) }

    private fun stopRinging() {
        handler.removeCallbacksAndMessages(null)
        tts?.stop()
        try { player?.stop() } catch (_: Exception) { }
        player?.release(); player = null
        vibrator()?.cancel()
    }

    override fun onDestroy() { stopRinging(); tts?.stop(); tts?.shutdown(); tts = null; super.onDestroy() }

    companion object {
        const val CHANNEL = "routine_alarm"; const val NOTIF_ID = 4201; const val ACTION_STOP = "com.morningorganizer.app.STOP"; const val ACTION_SNOOZE = "com.morningorganizer.app.SNOOZE"; const val SNOOZE_MS = 5 * 60 * 1000L
    }
}
