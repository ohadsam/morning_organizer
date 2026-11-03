package com.morningorganizer.app

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothServerSocket
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStream
import java.util.UUID
import kotlin.concurrent.thread
import org.json.JSONArray
import org.json.JSONObject

/**
 * Direct phone-to-phone link over Bluetooth Classic (RFCOMM). The parent app listens, the child app connects to a phone that is
 * already paired in Android's Bluetooth settings. Frames are single text lines (the app's encrypted envelopes are base64url, so a
 * newline never occurs inside one). Authentication happens one level up: only envelopes that decrypt with a link key are accepted.
 */
class BtLink(private val context: Context, private val emit: (JSONObject) -> Unit) {
    private val uuid: UUID = UUID.fromString("e3c0f6ae-0b5a-4f0e-9a52-7a1d2f9d6b01")
    private val adapter: BluetoothAdapter? get() = (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter
    @Volatile private var server: BluetoothServerSocket? = null
    @Volatile private var socket: BluetoothSocket? = null
    @Volatile private var out: OutputStream? = null
    private val sendLock = Any()

    fun hasPermission(): Boolean =
        if (Build.VERSION.SDK_INT >= 31) context.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED else true

    /** "ok" | "none" (no Bluetooth) | "off" | "no-permission" */
    fun status(): String = when {
        adapter == null -> "none"
        !hasPermission() -> "no-permission"
        adapter?.isEnabled != true -> "off"
        else -> "ok"
    }

    @SuppressLint("MissingPermission")
    fun paired(): String {
        val arr = JSONArray()
        if (status() != "ok") return arr.toString()
        adapter?.bondedDevices?.take(50)?.forEach { d -> arr.put(JSONObject().put("name", d.name ?: d.address).put("address", d.address)) }
        return arr.toString()
    }

    @SuppressLint("MissingPermission")
    fun listen() {
        close()
        if (status() != "ok") { emit(event("error").put("reason", status())); return }
        thread(name = "bt-listen") {
            try {
                val srv = adapter!!.listenUsingRfcommWithServiceRecord("MorningOrganizer", uuid)
                server = srv
                emit(event("listening"))
                val s = srv.accept()
                runCatching { srv.close() }
                attach(s)
            } catch (e: Exception) {
                if (server != null) emit(event("error").put("reason", "listen"))
            }
        }
    }

    @SuppressLint("MissingPermission")
    fun connect(address: String) {
        if (!BluetoothAdapter.checkBluetoothAddress(address)) { emit(event("error").put("reason", "address")); return }
        if (status() != "ok") { emit(event("error").put("reason", status())); return }
        close()
        thread(name = "bt-connect") {
            try {
                adapter!!.cancelDiscovery()
                val s = adapter!!.getRemoteDevice(address).createRfcommSocketToServiceRecord(uuid)
                s.connect()
                attach(s)
            } catch (e: Exception) {
                emit(event("error").put("reason", "connect"))
            }
        }
    }

    @SuppressLint("MissingPermission")
    private fun attach(s: BluetoothSocket) {
        socket = s
        out = s.outputStream
        emit(event("connected").put("peer", runCatching { s.remoteDevice.name }.getOrNull() ?: ""))
        thread(name = "bt-read") {
            try {
                val reader = BufferedReader(InputStreamReader(s.inputStream, Charsets.UTF_8))
                while (true) {
                    val line = reader.readLine() ?: break
                    if (line.length in 1..MAX_LINE) emit(event("data").put("data", line))
                }
            } catch (_: Exception) { }
            if (socket === s) { emit(event("disconnected")); close() }
        }
    }

    fun send(text: String): Boolean {
        if (text.length > MAX_LINE || text.contains('\n')) return false
        return try {
            synchronized(sendLock) { out?.let { it.write((text + "\n").toByteArray(Charsets.UTF_8)); it.flush(); true } ?: false }
        } catch (_: Exception) { false }
    }

    fun close() {
        runCatching { server?.close() }; server = null
        runCatching { socket?.close() }; socket = null
        out = null
    }

    private fun event(state: String) = JSONObject().put("type", "bt").put("state", state)

    private companion object { const val MAX_LINE = 300_000 }
}
