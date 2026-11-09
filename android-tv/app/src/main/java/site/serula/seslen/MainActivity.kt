package site.serula.seslen
import android.app.*
import android.os.*
import android.content.*
import android.provider.Settings
import android.net.Uri
import android.widget.*
import org.json.JSONObject

class MainActivity:Activity() {
 private val h=Handler(Looper.getMainLooper())
 override fun onCreate(b:Bundle?) {super.onCreate(b)
 val p=getSharedPreferences("seslen",0)
 val box=LinearLayout(this).apply {orientation=LinearLayout.VERTICAL;setPadding(70,25,70,25)}
 val scroll=ScrollView(this);scroll.addView(box);setContentView(scroll)
 fun label(t:String)=TextView(this).apply{text=t;textSize=24f;box.addView(this)}
 fun button(t:String,f:()->Unit) {box.addView(Button(this).apply{text=t;setOnClickListener{f()}})}
 label("Seslen • TV mesaj alıcısı 0.2.0")
 val base=EditText(this).apply{hint="https://seslen sunucu adresi";setText(p.getString("base",""));box.addView(this)}
 val status=label(if(Vault(this).token().isNotBlank()) "Cihaz eşleştirilmiş" else "Sunucu adresini kaydedin ve eşleştirin")
 button("1. Sunucuyu kaydet") {try {require(base.text.toString().startsWith("https://"));p.edit().putString("base",base.text.toString().trimEnd('/')).apply();status.text="Kaydedildi"}catch(e:Exception){status.text="HTTPS adresi gerekli"}}
 button("2. Diğer uygulamaların üzerinde gösterme izni") {startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,Uri.parse("package:$packageName")))}
 button("3. Eşleştirme kodu oluştur") {
 Thread {try {val url=p.getString("base","")!!;val pair=Api.call(url,"/api/pair/start",body=JSONObject());h.post{status.text="iPhone'da $url adresini açın. Kod: ${pair.getString("code")}"}
 repeat(120) {Thread.sleep(3000);val r=Api.call(url,"/api/pair/poll",body=JSONObject().put("poll",pair.getString("poll")));if(r.has("token")){Vault(this).save(r.getString("token"));h.post{status.text="Eşleştirildi. Alıcıyı başlatın."};return@Thread}}
 }catch(e:Exception){h.post{status.text="Eşleştirme başarısız. Sunucuyu kontrol edin."}}}.start()
 }
 button("4. Alıcıyı başlat") {if(Build.VERSION.SDK_INT>=33)requestPermissions(arrayOf("android.permission.POST_NOTIFICATIONS"),1);if(Settings.canDrawOverlays(this)){p.edit().putBoolean("enabled",true).apply();startForegroundService(Intent(this,MessageService::class.java));status.text="Alıcı başlatıldı"}else status.text="Önce ekran üstü iznini verin"}
 button("Yerel gösterim ve Türkçe ses testi") {startForegroundService(Intent(this,MessageService::class.java).putExtra("test",true))}
 fun number(key:String,title:String,default:Int,min:Int,max:Int) {label(title);val input=EditText(this).apply{inputType=2;setText(p.getInt(key,default).toString());box.addView(this)};button("$title kaydet"){val n=input.text.toString().toIntOrNull();if(n!=null&&n in min..max){p.edit().putInt(key,n).apply();status.text="Kaydedildi"}else status.text="$min–$max arası değer girin"}}
 number("repeat","Tekrar sayısı",3,1,10);number("gap","Tekrar aralığı (saniye)",3,1,60);number("size","Yazı boyutu",42,24,80);number("duration","Gösterim süresi (saniye)",60,10,300);number("rate","Ses hızı (%)",100,50,200);number("volume","Mesaj sesi (%)",100,10,100)
 val full=Switch(this).apply{text="Tam ekran";isChecked=p.getBoolean("full",false);setOnCheckedChangeListener{_,v->p.edit().putBoolean("full",v).apply()}};box.addView(full)
 button("Alıcıyı durdur / cihaz kaydını sil") {p.edit().putBoolean("enabled",false).apply();stopService(Intent(this,MessageService::class.java));Vault(this).save("");status.text="Yerel bağlantı silindi. iPhone'dan cihaz erişimini de iptal edin."}
 }
}
class BootReceiver:BroadcastReceiver(){override fun onReceive(c:Context,i:Intent){if(i.action==Intent.ACTION_BOOT_COMPLETED&&c.getSharedPreferences("seslen",0).getBoolean("enabled",false))try{c.startForegroundService(Intent(c,MessageService::class.java))}catch(e:Exception){/* OS may require manual start; no message data logged. */}}}

