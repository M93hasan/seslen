package site.serula.seslen

/** Playback completion is separate from the explicit human acknowledgement. */
class RepeatCycle(private val limit:Int=3) {
 init { require(limit in 1..10) }
 private var completed=0
 private var cancelled=false
 fun playbackCompleted():Boolean { if(cancelled)return false;completed++;return completed<limit }
 fun acknowledge(){cancelled=true}
}
