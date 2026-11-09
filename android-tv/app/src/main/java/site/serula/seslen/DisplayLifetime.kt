package site.serula.seslen

/** Keep long speech/recordings visible until all repeats finish; timeout alone is not Seen. */
class DisplayLifetime {
 private var elapsed=false
 private var played=false
 fun minimumElapsed():Boolean {elapsed=true;return played}
 fun playbackFinished():Boolean {played=true;return elapsed}
}
