package site.serula.seslen

import org.junit.Assert.*
import org.junit.Test

class UpdatePolicyTest {
    private val trusted = UpdateRelease(
        4, "1.0.0", UpdatePolicy.APK_URL, "a".repeat(64), 1_200_000L
    )

    @Test fun acceptsHigherSignedChannelCandidate() {
        assertTrue(UpdatePolicy.isEligible(trusted, 3))
    }

    @Test fun rejectsSameOrOlderVersions() {
        assertFalse(UpdatePolicy.isEligible(trusted, 4))
        assertFalse(UpdatePolicy.isEligible(trusted.copy(versionCode = 2), 3))
    }

    @Test fun rejectsArbitraryDownloadHostsAndRedirectTargets() {
        assertFalse(UpdatePolicy.isEligible(trusted.copy(apkUrl = "https://other.example/Seslen.apk"), 3))
        assertFalse(UpdatePolicy.isEligible(trusted.copy(apkUrl = "http://seslen.serula.site/updates/Seslen.apk"), 3))
        assertFalse(UpdatePolicy.isEligible(trusted.copy(apkUrl = UpdatePolicy.APK_URL + "?redirect=1"), 3))
    }

    @Test fun rejectsMalformedDigestAndExcessiveSize() {
        assertFalse(UpdatePolicy.isEligible(trusted.copy(sha256 = "not-a-digest"), 3))
        assertFalse(UpdatePolicy.isEligible(trusted.copy(sizeBytes = 0), 3))
        assertFalse(UpdatePolicy.isEligible(trusted.copy(sizeBytes = UpdatePolicy.MAX_APK_BYTES + 1), 3))
    }

    @Test fun acceptsOnlyStableVersionNames() {
        assertFalse(UpdatePolicy.isEligible(trusted.copy(versionName = "1.0.0-test"), 3))
        assertFalse(UpdatePolicy.isEligible(trusted.copy(versionName = "../bad"), 3))
    }
}
