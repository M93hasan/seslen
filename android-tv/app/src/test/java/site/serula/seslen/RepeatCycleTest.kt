package site.serula.seslen
import org.junit.Test
import org.junit.Assert.*
class RepeatCycleTest {
 @Test fun defaultsToThreePlays(){val c=RepeatCycle();assertTrue(c.playbackCompleted());assertTrue(c.playbackCompleted());assertFalse(c.playbackCompleted());assertFalse(c.playbackCompleted())}
 @Test fun acknowledgeDuringFirstPlayStopsFurtherRepeats(){val c=RepeatCycle();c.acknowledge();assertFalse(c.playbackCompleted())}
 @Test fun acknowledgeDuringGapStopsScheduledRepeat(){val c=RepeatCycle(5);assertTrue(c.playbackCompleted());c.acknowledge();assertFalse(c.playbackCompleted())}
 @Test fun onePlayDisablesRepeat(){assertFalse(RepeatCycle(1).playbackCompleted())}
 @Test(expected=IllegalArgumentException::class) fun rejectsZero(){RepeatCycle(0)}
}
