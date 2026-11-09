package site.serula.seslen

/** Release metadata comes only from Seslen's own HTTPS update channel. */
data class UpdateRelease(
    val versionCode: Int,
    val versionName: String,
    val apkUrl: String,
    val sha256: String,
    val sizeBytes: Long
)

object UpdatePolicy {
    const val MANIFEST_URL = "https://seslen.serula.site/updates/stable.json"
    const val APK_URL = "https://seslen.serula.site/updates/Seslen.apk"
    const val MAX_APK_BYTES = 25L * 1024L * 1024L

    fun isEligible(release: UpdateRelease, installedVersion: Long): Boolean =
        release.versionCode.toLong() > installedVersion &&
        release.versionName.matches(Regex("[0-9]+\\.[0-9]+\\.[0-9]+")) &&
        release.apkUrl == APK_URL &&
        release.sha256.matches(Regex("[a-f0-9]{64}")) &&
        release.sizeBytes in 1..MAX_APK_BYTES
}
