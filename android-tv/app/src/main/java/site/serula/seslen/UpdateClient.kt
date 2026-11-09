package site.serula.seslen

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageInstaller
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/** Only fetches published, approved APK files from the fixed Seslen domain. */
object UpdateClient {
    private const val UPDATE_CHANNEL = "seslen_updates"
    private const val UPDATE_NOTIFICATION = 3
    private const val INSTALL_NOTIFICATION = 4
    private const val INSTALL_ACTION = "site.serula.seslen.UPDATE_RESULT"

    @Suppress("DEPRECATION")
    fun installedVersion(context: Context): Long {
        val p = context.packageManager.getPackageInfo(context.packageName, 0)
        return if (Build.VERSION.SDK_INT >= 28) p.longVersionCode else p.versionCode.toLong()
    }

    private fun connection(url: String): HttpURLConnection =
        (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 10000
            readTimeout = 20000
            instanceFollowRedirects = false
            useCaches = false
        }

    /** A missing manifest is normal before the first approved stable release. */
    fun findUpdate(context: Context): UpdateRelease? {
        val conn = connection(UpdatePolicy.MANIFEST_URL)
        try {
            when (conn.responseCode) {
                404 -> return null
                200 -> Unit
                else -> throw IOException("Güncelleme kaynağına erişilemedi.")
            }
            val raw = ByteArrayOutputStream()
            conn.inputStream.use { input ->
                val buffer = ByteArray(1024)
                while (true) {
                    val n = input.read(buffer)
                    if (n == -1) break
                    if (raw.size() + n > 8192) throw IOException("Güncelleme bilgisi çok büyük.")
                    raw.write(buffer, 0, n)
                }
            }
            val json = JSONObject(raw.toString("UTF-8"))
            val release = UpdateRelease(
                json.optInt("versionCode", -1),
                json.optString("versionName", ""),
                json.optString("apkUrl", ""),
                json.optString("sha256", ""),
                json.optLong("sizeBytes", -1)
            )
            return release.takeIf { UpdatePolicy.isEligible(it, installedVersion(context)) }
        } finally {
            conn.disconnect()
        }
    }

    /** Run this on a background thread, only after the user chooses to update. */
    fun downloadAndInstall(context: Context, release: UpdateRelease, progress: (String) -> Unit) {
        if (!UpdatePolicy.isEligible(release, installedVersion(context))) {
            throw IOException("Uygun bir güncelleme bulunamadı.")
        }
        val file = File(context.cacheDir, "seslen-update-" + release.versionCode + ".apk")
        try {
            progress("Güncelleme indiriliyor…")
            val digest = MessageDigest.getInstance("SHA-256")
            val conn = connection(UpdatePolicy.APK_URL)
            try {
                if (conn.responseCode != 200) throw IOException("APK dosyasına erişilemedi.")
                if (conn.contentLengthLong > UpdatePolicy.MAX_APK_BYTES) {
                    throw IOException("APK boyutu izin verilen sınırı aşıyor.")
                }
                var downloaded = 0L
                conn.inputStream.use { input ->
                    file.outputStream().use { output ->
                        val buffer = ByteArray(16384)
                        while (true) {
                            val n = input.read(buffer)
                            if (n == -1) break
                            downloaded += n
                            if (downloaded > UpdatePolicy.MAX_APK_BYTES) {
                                throw IOException("APK dosyası çok büyük.")
                            }
                            output.write(buffer, 0, n)
                            digest.update(buffer, 0, n)
                        }
                    }
                }
                if (downloaded != release.sizeBytes ||
                    !digest.digest().contentEquals(hexBytes(release.sha256))) {
                    throw IOException("APK doğrulaması başarısız; güncelleme iptal edildi.")
                }
            } finally {
                conn.disconnect()
            }

            progress("APK ve uygulama imzası doğrulanıyor…")
            val pm = context.packageManager
            val flags = if (Build.VERSION.SDK_INT >= 28)
                PackageManager.GET_SIGNING_CERTIFICATES
            else @Suppress("DEPRECATION") PackageManager.GET_SIGNATURES
            @Suppress("DEPRECATION")
            val installed = pm.getPackageInfo(context.packageName, flags)
            @Suppress("DEPRECATION")
            val archive = pm.getPackageArchiveInfo(file.absolutePath, flags)
                ?: throw IOException("APK paketi okunamadı.")
            if (archive.packageName != context.packageName ||
                version(archive) != release.versionCode.toLong() ||
                version(archive) <= version(installed)) {
                throw IOException("APK paketi veya sürümü uyuşmuyor.")
            }
            val oldSigners = signatures(installed)
            val newSigners = signatures(archive)
            if (oldSigners.isEmpty() || oldSigners != newSigners) {
                throw IOException("APK imzası mevcut kurulumla aynı değil; güncelleme iptal edildi.")
            }

            progress("Android kurulum sistemi açılıyor…")
            val installer = pm.packageInstaller
            val params = PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL)
            params.setAppPackageName(context.packageName)
            if (Build.VERSION.SDK_INT >= 31) {
                // Android may still require a TV remote confirmation, especially after sideload.
                params.setRequireUserAction(PackageInstaller.SessionParams.USER_ACTION_NOT_REQUIRED)
            }
            val sessionId = installer.createSession(params)
            var committed = false
            try {
                installer.openSession(sessionId).use { session ->
                    session.openWrite("base.apk", 0, release.sizeBytes).use { output ->
                        file.inputStream().use { it.copyTo(output) }
                        session.fsync(output)
                    }
                    val intent = Intent(context, UpdateInstallReceiver::class.java).apply {
                        action = INSTALL_ACTION
                    }
                    val flagsIntent = PendingIntent.FLAG_UPDATE_CURRENT or
                        (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
                    val callback = PendingIntent.getBroadcast(context, sessionId, intent, flagsIntent)
                    session.commit(callback.intentSender)
                    committed = true
                }
            } finally {
                if (!committed) installer.abandonSession(sessionId)
            }
        } finally {
            file.delete() // The system installer owns its copy after commit.
        }
    }

    private fun hexBytes(hex: String): ByteArray = ByteArray(hex.length / 2) { index ->
        hex.substring(index * 2, index * 2 + 2).toInt(16).toByte()
    }

    @Suppress("DEPRECATION")
    private fun version(info: PackageInfo): Long =
        if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else info.versionCode.toLong()

    @Suppress("DEPRECATION")
    private fun signatures(info: PackageInfo): Set<String> {
        val signatures: Array<Signature> = if (Build.VERSION.SDK_INT >= 28)
            info.signingInfo?.apkContentsSigners ?: emptyArray()
        else info.signatures ?: emptyArray()
        return signatures.map { signature ->
            MessageDigest.getInstance("SHA-256").digest(signature.toByteArray())
                .joinToString("") { byte -> "%02x".format(byte.toInt() and 255) }
        }.toSet()
    }

    private fun manager(context: Context): NotificationManager =
        context.getSystemService(NotificationManager::class.java).also {
            it.createNotificationChannel(
                NotificationChannel(
                    UPDATE_CHANNEL, "Seslen güncellemeleri",
                    NotificationManager.IMPORTANCE_DEFAULT
                )
            )
        }

    fun notifyAvailable(context: Context, release: UpdateRelease) {
        if (!UpdatePolicy.isEligible(release, installedVersion(context))) return
        val openApp = PendingIntent.getActivity(
            context, 31,
            Intent(context, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        try {
            manager(context).notify(
                UPDATE_NOTIFICATION,
                Notification.Builder(context, UPDATE_CHANNEL)
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle("Yeni Seslen sürümü: " + release.versionName)
                    .setContentText("Güncellemek için aç. Mesajlar ve ayarlar korunur.")
                    .setContentIntent(openApp).setAutoCancel(true).build()
            )
        } catch (_: SecurityException) {
            // Android 13+: without notification permission, show it on the TV screen next time.
        }
    }

    fun notifyInstall(context: Context, title: String, text: String, confirm: Intent? = null) {
        val pendingIntent = PendingIntent.getActivity(
            context, 32,
            (confirm ?: Intent(context, MainActivity::class.java)).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        try {
            manager(context).notify(
                INSTALL_NOTIFICATION,
                Notification.Builder(context, UPDATE_CHANNEL)
                    .setSmallIcon(android.R.drawable.stat_sys_download_done)
                    .setContentTitle(title).setContentText(text)
                    .setContentIntent(pendingIntent).setAutoCancel(true).build()
            )
        } catch (_: SecurityException) {
            // A system dialog can still appear while the user is in the foreground.
        }
    }
}

class UpdateInstallReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE)
        when (status) {
            PackageInstaller.STATUS_SUCCESS ->
                UpdateClient.notifyInstall(context, "Seslen güncellendi", "Yeni sürüm kuruldu.")
            PackageInstaller.STATUS_PENDING_USER_ACTION -> {
                @Suppress("DEPRECATION")
                val confirm = if (Build.VERSION.SDK_INT >= 33)
                    intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent::class.java)
                else intent.getParcelableExtra(Intent.EXTRA_INTENT) as? Intent
                if (confirm != null) {
                    UpdateClient.notifyInstall(
                        context, "Seslen kurulumu için onay gerekli",
                        "Kumandadan açıp Android kurulumunu onayla.", confirm
                    )
                    try {
                        confirm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        context.startActivity(confirm)
                    } catch (_: Exception) {
                        // Notification above is the user-initiated fallback on restricted TVs.
                    }
                }
            }
            else -> UpdateClient.notifyInstall(
                context, "Seslen güncellemesi kurulamadı",
                "Çalışan sürüm korunuyor. Seslen'i açıp tekrar dene."
            )
        }
    }
}
