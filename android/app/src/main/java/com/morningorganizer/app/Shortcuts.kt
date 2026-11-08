package com.morningorganizer.app

import android.content.Context
import android.content.Intent
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat

/** Long-press launcher shortcuts: straight to the calm corner, the journal or "how do I feel" (the page decides what a locked journal shows). */
object Shortcuts {
    val ROUTES = setOf("#/calm", "#/journal", "#/feel", "#/feel/1", "#/feel/2", "#/feel/3", "#/feel/4", "#/feel/5")

    fun publish(ctx: Context) {
        runCatching {
            val icon = IconCompat.createWithResource(ctx, R.mipmap.ic_launcher)
            fun make(id: String, label: Int, route: String) = ShortcutInfoCompat.Builder(ctx, id).setShortLabel(ctx.getString(label)).setIcon(icon)
                .setIntent(MainActivity.routeIntent(ctx, route)).build()
            ShortcutManagerCompat.setDynamicShortcuts(ctx, listOf(make("calm", R.string.shortcut_calm, "#/calm"), make("journal", R.string.shortcut_journal, "#/journal"), make("feel", R.string.shortcut_feel, "#/feel")))
        }
    }
}
