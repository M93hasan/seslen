package site.serula.seslen

import android.app.*
import android.os.*
import android.content.*
import android.provider.Settings
import android.net.Uri
import android.graphics.Color
import android.graphics.Bitmap
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.content.res.ColorStateList
import android.view.Gravity
import android.view.View
import android.widget.*
import com.google.zxing.BarcodeFormat
import com.google.zxing.MultiFormatWriter
import com.google.zxing.EncodeHintType
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicInteger

class MainActivity:Activity() {
 companion object { const val SERVER="https://seslen-staging.m93hasan.workers.dev" }
 private val h=Handler(Looper.getMainLooper())
 private val generation=AtomicInteger()
 private lateinit var content:LinearLayout
 private lateinit var status:TextView
 private lateinit var subtitle:TextView
 private lateinit var qr:ImageView
 private lateinit var code:TextView
 private lateinit var pairButton:Button
 private lateinit var updateAction:Button
 private var availableUpdate:UpdateRelease?=null
 private var checkingUpdate=false
 private var installingUpdate=false
 private val ink=Color.rgb(235,242,225)
 private val muted=Color.rgb(168,191,172)
 private val accent=Color.rgb(204,225,168)
 private val prefs by lazy { getSharedPreferences("seslen",0) }
 private fun dp(n:Int)=(n*resources.displayMetrics.density).toInt()
 private fun shape(color:Int,radius:Int=18)=GradientDrawable().apply{setColor(color);cornerRadius=dp(radius).toFloat()}
 private fun text(t:String,size:Float,color:Int=ink)=TextView(this).apply{text=t;textSize=size;setTextColor(color);setPadding(0,dp(4),0,dp(8))}
 private fun button(t:String,parent:LinearLayout=content,action:()->Unit):Button {
  val b=Button(this).apply {text=t;isAllCaps=false;textSize=16f;minHeight=dp(52);setPadding(dp(18),dp(7),dp(18),dp(7));backgroundTintList=ColorStateList(arrayOf(intArrayOf(android.R.attr.state_focused),intArrayOf()),intArrayOf(accent,Color.rgb(46,78,63)));setTextColor(ColorStateList(arrayOf(intArrayOf(android.R.attr.state_focused),intArrayOf()),intArrayOf(Color.rgb(20,47,36),ink)));setOnClickListener{action()}}
  parent.addView(b,LinearLayout.LayoutParams(-1,-2).apply{topMargin=dp(7)});return b
 }
 override fun onCreate(b:Bundle?) {super.onCreate(b)
  // Retain the existing endpoint for paired installations; new installations need no address entry.
  if(prefs.getString("base","").isNullOrBlank())prefs.edit().putString("base",SERVER).apply()
  val root=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(42),dp(25),dp(42),dp(25));setBackgroundColor(Color.rgb(16,36,28))}
  root.addView(text("seslen.",35f,accent).apply{setTypeface(null,Typeface.BOLD)})
  root.addView(text("BİR SES KADAR YAKIN",11f,muted).apply{letterSpacing=.18f})
  val columns=LinearLayout(this).apply{orientation=LinearLayout.HORIZONTAL}
  root.addView(columns,LinearLayout.LayoutParams(-1,0,1f).apply{topMargin=dp(18)})
  val scroll=ScrollView(this).apply{isFillViewport=true}
  content=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;setPadding(dp(24),dp(15),dp(24),dp(24));background=shape(Color.rgb(26,51,39))}
  scroll.addView(content)
  columns.addView(scroll,LinearLayout.LayoutParams(0,-1,1.25f).apply{rightMargin=dp(22)})
  content.addView(text("Evinin sesi burada.",29f).apply{setTypeface(null,Typeface.BOLD)})
  subtitle=text("Telefonundan gelen mesajlar televizyonda görünür ve seslendirilir.",16f,muted);content.addView(subtitle)
  status=text("Bağlantıya hazır",16f,accent);content.addView(status)
  pairButton=button("Google hesabıyla bağlan") {beginPairing()}
  button("Mesaj alıcısını aç") {startReceiver()}
  button("Ekranda gösterme iznini aç") {startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:$packageName")))}
  button("Görüntü ve Türkçe ses testi") {if(Settings.canDrawOverlays(this))startForegroundService(Intent(this,MessageService::class.java).putExtra("test",true))else status.text="Önce ekranda gösterme iznini aç."}
  updateAction=button("Güncellemeleri kontrol et") {
   val release=availableUpdate
   if(release==null)checkForUpdates(manual=true) else confirmUpdate(release)
  }
  val advanced=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;visibility=View.GONE}
  button("Ses ve görüntü ayarları") {advanced.visibility=if(advanced.visibility==View.GONE)View.VISIBLE else View.GONE}
  content.addView(advanced)
  fun number(key:String,title:String,default:Int,min:Int,max:Int){advanced.addView(text(title,14f,muted));val input=EditText(this).apply{inputType=2;setTextColor(ink);setText(prefs.getInt(key,default).toString());contentDescription=title};advanced.addView(input);button("$title kaydet",advanced){val n=input.text.toString().toIntOrNull();if(n!=null&&n in min..max){prefs.edit().putInt(key,n).apply();status.text="Ayar kaydedildi"}else status.text="$min–$max arasında bir değer gir."}}
  number("repeat","Tekrar sayısı",3,1,10);number("gap","Tekrar aralığı (saniye)",3,1,60);number("size","Yazı boyutu",42,24,80);number("duration","Gösterim süresi (saniye)",60,10,300);number("rate","Ses hızı (%)",100,50,200);number("volume","Mesaj sesi (%)",100,10,100)
  advanced.addView(Switch(this).apply{text="Tam ekran mesaj";setTextColor(ink);isChecked=prefs.getBoolean("full",false);setOnCheckedChangeListener{_,v->prefs.edit().putBoolean("full",v).apply()}})
  button("Bu TV’nin bağlantısını kaldır",advanced){AlertDialog.Builder(this).setTitle("TV bağlantısı kaldırılsın mı?").setMessage("Mesaj alıcısı duracak. Yeniden bağlamak için QR’ı tekrar okutabilirsin.").setNegativeButton("Vazgeç",null).setPositiveButton("Bağlantıyı kaldır"){_,_->generation.incrementAndGet();prefs.edit().putBoolean("enabled",false).remove("account").apply();stopService(Intent(this,MessageService::class.java));Vault(this).save("");showState()}.show()}
  val right=LinearLayout(this).apply{orientation=LinearLayout.VERTICAL;gravity=Gravity.CENTER;setPadding(dp(16),dp(10),dp(16),dp(10));background=shape(Color.rgb(33,62,46))}
  columns.addView(right,LinearLayout.LayoutParams(0,-1,1f))
  right.addView(text("Telefonundan bir kez onayla",20f,accent).apply{gravity=Gravity.CENTER})
  qr=ImageView(this).apply{contentDescription="Google hesabıyla TV bağlantısı için QR kodu";visibility=View.GONE};right.addView(qr,LinearLayout.LayoutParams(dp(208),dp(208)).apply{topMargin=dp(10);bottomMargin=dp(12)})
  code=text("ADRES YAZMANA GEREK YOK",13f,muted).apply{gravity=Gravity.CENTER};right.addView(code)
  right.addView(text("iPhone kameranla QR’ı okut.\nGoogle hesabınla giriş yapıp bu TV’yi onayla.\nAynı hesapla açtığın panelde TV’n hazır olacak.",14f,ink).apply{gravity=Gravity.CENTER;setPadding(dp(4),dp(12),dp(4),0)})
  root.addView(text("GÖSTERİM: 3 TEKRAR     •     KUMANDADAN OK İLE GÖRÜLDÜ     •     0.3 TEST",10f,muted).apply{setPadding(0,dp(14),0,0)})
  setContentView(root);showState();pairButton.requestFocus()
  checkForUpdates(manual=false)
 }
 private fun checkForUpdates(manual:Boolean){
  if(checkingUpdate||installingUpdate)return
  checkingUpdate=true
  if(manual)updateAction.text="Güncelleme kontrol ediliyor…"
  Thread{
   try{
    val release=UpdateClient.findUpdate(this)
    h.post{
     if(isFinishing||isDestroyed)return@post
     availableUpdate=release
     updateAction.text=if(release!=null)"Yeni sürüm "+release.versionName+" · Güncelle" else "Güncellemeleri kontrol et"
     if(manual&&release==null)Toast.makeText(this,"Yeni sürüm bulunamadı.",Toast.LENGTH_SHORT).show()
     checkingUpdate=false
    }
   }catch(e:Exception){
    h.post{
     if(isFinishing||isDestroyed)return@post
     checkingUpdate=false
     updateAction.text="Güncellemeleri kontrol et"
     if(manual)Toast.makeText(this,"Güncelleme kaynağına ulaşılamadı.",Toast.LENGTH_LONG).show()
    }
   }
  }.start()
 }
 private fun confirmUpdate(release:UpdateRelease){
  if(installingUpdate)return
  if(Build.VERSION.SDK_INT>=26&&!packageManager.canRequestPackageInstalls()){
   AlertDialog.Builder(this).setTitle("Kurulum izni gerekli")
    .setMessage("Seslen güncellemelerini yüklemek için Android'in bu uygulamaya kurulum izni vermesi gerekiyor. Bir kez izin verdikten sonra yeniden Güncelle'yi seç.")
    .setNegativeButton("Vazgeç",null)
    .setPositiveButton("İzin ekranını aç"){_,_->
     startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+packageName)))
    }.show()
   return
  }
  AlertDialog.Builder(this)
   .setTitle("Seslen "+release.versionName+" güncellensin mi?")
   .setMessage("APK Seslen'in güvenli adresinden indirilecek. Uygulama imzası ve dosya bütünlüğü kontrol edilecek. Android ek bir kurulum onayı isteyebilir.")
   .setNegativeButton("Daha sonra",null)
   .setPositiveButton("Güncelle"){_,_->
    installingUpdate=true
    updateAction.isEnabled=false
    Thread{
     try{
      UpdateClient.downloadAndInstall(this,release){message->
       h.post{if(!isFinishing&&!isDestroyed)status.text=message}
      }
      h.post{if(!isFinishing&&!isDestroyed)status.text="Android kurulum sonucu bekleniyor…"}
     }catch(e:Exception){
      h.post{
       if(!isFinishing&&!isDestroyed){
        status.text=e.message?:"Güncelleme kurulamadı; mevcut sürüm korunuyor."
       }
      }
     }finally{
      h.post{
       if(!isFinishing&&!isDestroyed){
        installingUpdate=false
        updateAction.isEnabled=true
       }
      }
     }
    }.start()
   }.show()
 }
 private fun showState(){val paired=Vault(this).token().isNotBlank();pairButton.text=if(paired)"Google hesabını yeniden bağla" else "Google hesabıyla bağlan";val account=prefs.getString("account","")!!;subtitle.text=if(paired)if(account.isNotBlank())"Google hesabına bağlı: $account" else "Google hesabına bağlı televizyon" else "Telefonundan gelen mesajlar televizyonda görünür ve seslendirilir.";status.text=if(paired)if(Settings.canDrawOverlays(this))"TV bağlı · Mesaj alıcısını açabilirsin" else "TV bağlı · Ekranda gösterme izni gerekli" else "Bağlanmak için Google hesabıyla bağlan’a bas."}
 private fun startReceiver(){if(Vault(this).token().isBlank()){status.text="Önce Google hesabına bağlan.";return};if(!Settings.canDrawOverlays(this)){status.text="Ekranda gösterme iznini aç, ardından geri dön.";prefs.edit().putBoolean("resumeReceiver",true).apply();startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:$packageName")));return};if(Build.VERSION.SDK_INT>=33)requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"),1);prefs.edit().putBoolean("enabled",true).putBoolean("resumeReceiver",false).apply();startForegroundService(Intent(this,MessageService::class.java));status.text="Mesaj alıcısı açık · Seslenmeye hazır"}
 private fun beginPairing(){val g=generation.incrementAndGet();pairButton.isEnabled=false;status.text="Güvenli bağlantı hazırlanıyor…";qr.visibility=View.GONE
  Thread {try{val base=prefs.getString("base",SERVER)!!;val pair=Api.call(base,"/api/pair/start",body=JSONObject());val link=base+"/?pair="+pair.getString("code");val matrix=MultiFormatWriter().encode(link,BarcodeFormat.QR_CODE,600,600,mapOf(EncodeHintType.MARGIN to 3));val bitmap=Bitmap.createBitmap(600,600,Bitmap.Config.ARGB_8888);val pixels=IntArray(600*600){i->if(matrix[i%600,i/600])Color.rgb(16,36,28) else Color.WHITE};bitmap.setPixels(pixels,0,600,0,0,600,600)
   h.post{if(g==generation.get()){qr.setImageBitmap(bitmap);qr.visibility=View.VISIBLE;code.text="TV KODU: "+pair.getString("code");status.text="QR’ı telefonunla okut ve Google hesabınla onayla.";pairButton.isEnabled=true;pairButton.text="QR kodunu yenile"}}
   val until=System.currentTimeMillis()+pair.getInt("expires")*1000L
   while(System.currentTimeMillis()<until&&g==generation.get()){Thread.sleep(3000);if(g!=generation.get())return@Thread;val result=Api.call(base,"/api/pair/poll",body=JSONObject().put("poll",pair.getString("poll")));if(result.has("token")){if(g!=generation.get())return@Thread;Vault(this).save(result.getString("token"));prefs.edit().putString("account",result.optString("email")).apply();h.post{if(g==generation.get()){qr.visibility=View.GONE;code.text="GOOGLE HESABINA BAĞLANDI";showState();startReceiver()}};return@Thread}}
   h.post{if(g==generation.get()){qr.visibility=View.GONE;status.text="QR’ın süresi doldu. Yenileyerek tekrar bağlanabilirsin.";pairButton.isEnabled=true}}
  }catch(e:Exception){h.post{if(g==generation.get()){status.text="Bağlantı kurulamadı. TV’nin internetini kontrol edip tekrar dene.";pairButton.isEnabled=true}}}}.start()
 }
 override fun onResume(){super.onResume();if(::status.isInitialized&&prefs.getBoolean("resumeReceiver",false)&&Settings.canDrawOverlays(this))startReceiver()}
 override fun onDestroy(){generation.incrementAndGet();h.removeCallbacksAndMessages(null);super.onDestroy()}
}
class BootReceiver:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){if(i.action==Intent.ACTION_BOOT_COMPLETED&&c.getSharedPreferences("seslen",0).getBoolean("enabled",false))try{c.startForegroundService(Intent(c,MessageService::class.java))}catch(e:Exception){/* Android may require manual start. */}}}
