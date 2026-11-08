package site.serula.seslen
import android.app.*
import android.os.*
import android.content.*
import android.graphics.Color
import android.media.*
import android.speech.tts.*
import android.provider.Settings
import android.view.*
import android.widget.*
import org.json.*
import java.util.Locale
import java.net.*
import java.util.concurrent.Executors

class MessageService:Service(),TextToSpeech.OnInitListener {
 private val h=Handler(Looper.getMainLooper())
 private val io=Executors.newSingleThreadExecutor()
 private val p by lazy{getSharedPreferences("seslen",0)}
 private lateinit var tts:TextToSpeech
 private var ready=false
 private var view:View?=null
 private var current:JSONObject?=null
 private var player:MediaPlayer?=null
 private var cycle=RepeatCycle()
 private var generation=0
 private var stopped=false
 private var focus:AudioFocusRequest?=null
 private val audio by lazy{getSystemService(AudioManager::class.java)}
 private val wm by lazy{getSystemService(WindowManager::class.java)}
 override fun onBind(i:Intent?)=null
 override fun onCreate(){super.onCreate()
 val nm=getSystemService(NotificationManager::class.java);nm.createNotificationChannel(NotificationChannel("receiver","Seslen alıcısı",NotificationManager.IMPORTANCE_LOW))
 val pi=PendingIntent.getActivity(this,0,Intent(this,MainActivity::class.java),PendingIntent.FLAG_IMMUTABLE)
 startForeground(1,Notification.Builder(this,"receiver").setSmallIcon(android.R.drawable.ic_dialog_email).setContentTitle("Seslen mesaj bekliyor").setContentText("Alıcı etkin • ayarlar için açın").setContentIntent(pi).build())
 tts=TextToSpeech(this,this);h.post(poll)
 }
 override fun onInit(status:Int){ready=status==TextToSpeech.SUCCESS&&tts.setLanguage(Locale.forLanguageTag("tr-TR"))>=0
 tts.setOnUtteranceProgressListener(object:UtteranceProgressListener(){override fun onStart(id:String?){};override fun onDone(id:String?){h.post{if(id==generation.toString())again()}};@Deprecated("API") override fun onError(id:String?){h.post{if(id==generation.toString())fail()}}})
 next()
 }
 override fun onStartCommand(i:Intent?,flags:Int,id:Int):Int {if(i?.getBooleanExtra("test",false)==true){enqueue(JSONObject().put("id","test-"+System.currentTimeMillis()).put("text","Seslen hazır. Türkçe sesli mesaj testi. Ğ, ş, ı, ö, ü, ç."));next()};return START_STICKY}
 private fun read(key:String)=JSONArray(p.getString(key,"[]"))
 private fun write(key:String,a:JSONArray){p.edit().putString(key,a.toString()).commit()}
 @Synchronized private fun enqueue(m:JSONObject){val a=read("inbox");val done=read("outbox");if((0 until a.length()).any{a.getJSONObject(it).getString("id")==m.getString("id")}||(0 until done.length()).any{done.getJSONObject(it).getString("id")==m.getString("id")})return;a.put(m);write("inbox",a)}
 private val poll=object:Runnable{override fun run(){if(stopped)return
 val base=p.getString("base","")!!;val token=Vault(this@MessageService).token()
 if(token.isNotEmpty()&&base.isNotEmpty())io.execute{try{
 val out= synchronized(this@MessageService){read("outbox")}
 for(j in 0 until out.length()){val event=out.getJSONObject(j);Api.call(base,"/api/events",token,event);synchronized(this@MessageService){val a=read("outbox");val b=JSONArray();for(k in 0 until a.length())if(a.getJSONObject(k).getString("id")!=event.getString("id"))b.put(a.getJSONObject(k));write("outbox",b)}}
 val a=Api.call(base,"/api/inbox",token).getJSONArray("messages")
 h.post{for(j in 0 until a.length())enqueue(a.getJSONObject(j));next()}
 }catch(e:Exception){/* Poll retry; retain durable inbox and outbox. */}}
 h.postDelayed(this,5000)
 }}
 private fun next(){if(stopped)return;if(current!=null||view!=null)return;val a=read("inbox");if(a.length()==0)return
 if(!Settings.canDrawOverlays(this))return
 current=a.getJSONObject(0);cycle=RepeatCycle(p.getInt("repeat",3).coerceIn(1,10));generation++
 val box=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(35,25,35,25);setBackgroundColor(Color.rgb(15,30,48));isFocusableInTouchMode=true}
 box.addView(TextView(this).apply{text="SESLEN";textSize=20f;setTextColor(Color.rgb(90,235,195))})
 val scroll=ScrollView(this);scroll.addView(TextView(this).apply{text=current!!.optString("text","Sesli mesaj");textSize=p.getInt("size",42).toFloat();setTextColor(Color.WHITE);setPadding(10,20,10,20)})
 box.addView(scroll,LinearLayout.LayoutParams(-1,0,1f))
 val ok=Button(this).apply{text="OK • Gördüm, kapat";setOnClickListener{finish("seen")}};box.addView(ok)
 box.setOnKeyListener{_,key,event->if((key==KeyEvent.KEYCODE_DPAD_CENTER||key==KeyEvent.KEYCODE_ENTER)&&event.action==KeyEvent.ACTION_UP){finish("seen");true}else false}
 val full=p.getBoolean("full",false);val width=if(full)-1 else (resources.displayMetrics.widthPixels*0.85).toInt();val height=if(full)-1 else (resources.displayMetrics.heightPixels*0.80).toInt()
 try{wm.addView(box,WindowManager.LayoutParams(width,height,WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,android.graphics.PixelFormat.TRANSLUCENT).apply{gravity=Gravity.CENTER});view=box;ok.requestFocus()}catch(e:Exception){current=null;return}
 val mid=current!!.getString("id");if(!mid.startsWith("test-"))io.execute{try{Api.call(p.getString("base","")!!,"/api/events",Vault(this).token(),JSONObject().put("id",mid).put("status","delivered"))}catch(e:Exception){}}
 focus=AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK).setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()).setOnAudioFocusChangeListener{change->if(change==AudioManager.AUDIOFOCUS_LOSS)h.post{fail()}}.build()
 audio.requestAudioFocus(focus!!)
 val g=generation;h.postDelayed({if(g==generation)finish("finished")},p.getInt("duration",60)*1000L)
 speak(g)
 }
 private fun speak(g:Int){if(stopped)return;if(g!=generation||current==null)return
 val m=current!!;val media=m.optString("audio")
 if(media.isNotEmpty()){
 io.execute{try{val base=p.getString("base","")!!;val c=URL(base+"/api/audio/"+UriEncode(media)).openConnection() as HttpURLConnection;c.connectTimeout=10000;c.readTimeout=15000;c.instanceFollowRedirects=false;c.setRequestProperty("Authorization","Bearer "+Vault(this).token())
 val file=java.io.File(cacheDir,"voice-$g");try{require(c.responseCode==200);c.inputStream.use{input->file.outputStream().use{out->val buf=ByteArray(8192);var total=0;while(true){val n=input.read(buf);if(n<0)break;total+=n;require(total<=5*1024*1024);out.write(buf,0,n)}}}}finally{c.disconnect()}
 h.post{if(g!=generation){file.delete();return@post};try{player=MediaPlayer().apply{setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY).build());setDataSource(file.absolutePath);val vol=p.getInt("volume",100)/100f;setVolume(vol,vol);setOnCompletionListener{file.delete();again()};setOnErrorListener{_,_,_->file.delete();fail();true};prepare();start()}}catch(e:Exception){file.delete();fail()}}
 }catch(e:Exception){h.post{if(g==generation)fail()}}}
 }else if(ready){tts.setSpeechRate(p.getInt("rate",100)/100f);tts.speak(m.optString("text"),TextToSpeech.QUEUE_FLUSH,Bundle().apply{putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME,p.getInt("volume",100)/100f)},g.toString())}else {h.postDelayed({if(g==generation){if(ready)speak(g)else fail()}},2500)}
 }
 private fun UriEncode(s:String)=java.net.URLEncoder.encode(s,"UTF-8")
 private fun again(){player?.release();player=null;if(cycle.playbackCompleted()){val g=generation;h.postDelayed({speak(g)},p.getInt("gap",3)*1000L)}}
 private fun fail(){finish("failed")}
 @Synchronized private fun finish(status:String){val m=current?:return;cycle.acknowledge();generation++;tts.stop();player?.release();player=null;focus?.let{audio.abandonAudioFocusRequest(it)};focus=null;view?.let{wm.removeView(it)};view=null;current=null
 val id=m.getString("id");if(!id.startsWith("test-")){val out=read("outbox");out.put(JSONObject().put("id",id).put("status",status));write("outbox",out)}
 val a=read("inbox");val b=JSONArray();for(i in 0 until a.length())if(a.getJSONObject(i).getString("id")!=id)b.put(a.getJSONObject(i));write("inbox",b);h.postDelayed({next()},500)
 }
 override fun onDestroy(){stopped=true;h.removeCallbacksAndMessages(null);generation++;tts.stop();tts.shutdown();player?.release();focus?.let{audio.abandonAudioFocusRequest(it)};view?.let{wm.removeView(it)};io.shutdownNow();super.onDestroy()}
}
