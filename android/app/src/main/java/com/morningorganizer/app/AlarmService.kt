package com.morningorganizer.app

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
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
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/** Rings (sound at the chosen volume + vibration) for the chosen duration, with a Start / Stop notification. */
class AlarmService : Service() {
    private var player: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopSelf(); return START_NOT_STICKY }
        val templateId = intent?.getStringExtra("templateId") ?: run { stopSelf(); return START_NOT_STICKY }
        val name = intent.getStringExtra("name").orEmpty()
        val volume = intent.getIntExtra("volume", 80).coerceIn(0, 100)
        val vibrate = intent.getBooleanExtra("vibrate", true)
        val durationSec = intent.getIntExtra("durationSec", 30).coerceIn(5, 600)

        ensureChannel()
        val type = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, NOTIF_ID, buildNotification(templateId, name), type)

        stopRinging()
        if (volume > 0) startSound(volume / 100f)
        if (vibrate) startVibration()
        handler.postDelayed({ stopSelf() }, durationSec * 1000L)
        return START_NOT_STICKY
    }

    private fun buildNotification(templateId: String, name: String): Notification {
        val open = PendingIntent.getActivity(this, 1, MainActivity.startIntent(this, templateId), PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val stop = PendingIntent.getService(this, 2, Intent(this, AlarmService::class.java).setAction(ACTION_STOP), PendingIntent.FLAG_IMMUTABLE)
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(getString(R.string.alarm_title, name)).setContentText(getString(R.string.alarm_text))
            .setCategory(NotificationCompat.CATEGORY_ALARM).setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(open).setFullScreenIntent(open, true).setOngoing(true).setAutoCancel(true)
            .addAction(0, getString(R.string.alarm_start), open).addAction(0, getString(R.string.alarm_stop), stop)
            .build()
    }

    private fun ensureChannel() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, getString(R.string.alarm_channel), NotificationManager.IMPORTANCE_HIGH).apply { setSound(null, null); enableVibration(false) })
        }
    }

    private fun startSound(level: Float) {
        try {
            val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM) ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                setDataSource(this@AlarmService, uri); isLooping = true; setVolume(level, level); prepare(); start()
            }
        } catch (_: Exception) { player = null } // no sound is better than a crash at 6am; vibration still runs
    }

    private fun vibrator(): Vibrator? =
        if (Build.VERSION.SDK_INT >= 31) (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        else @Suppress("DEPRECATION") getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    private fun startVibration() { vibrator()?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 600, 400), 0)) }

    private fun stopRinging() {
        handler.removeCallbacksAndMessages(null)
        try { player?.stop() } catch (_: Exception) { }
        player?.release(); player = null
        vibrator()?.cancel()
    }

    override fun onDestroy() { stopRinging(); super.onDestroy() }

    companion object {
        const val CHANNEL = "routine_alarm"; const val NOTIF_ID = 4201; const val ACTION_STOP = "com.morningorganizer.app.STOP"
    }
}
