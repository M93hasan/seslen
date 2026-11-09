package site.serula.seslen
import org.junit.Test
import org.junit.Assert.*
class DisplayLifetimeTest {
 @Test fun longAudioIsNotCutOffByDisplayTimeout(){val s=DisplayLifetime();assertFalse(s.minimumElapsed());assertTrue(s.playbackFinished())}
 @Test fun shortSpeechRemainsVisibleForMinimumDuration(){val s=DisplayLifetime();assertFalse(s.playbackFinished());assertTrue(s.minimumElapsed())}
 @Test fun timeoutDoesNotByItselfMarkAnythingSeen(){assertFalse(DisplayLifetime().minimumElapsed())}
}
