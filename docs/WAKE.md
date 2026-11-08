# Philips bekleme ve otomatik başlatma

Philips 8506 ailesinin resmi kılavuzunda WoWLAN ve Chromecast ile açılma ayarları açıklanır:
https://www.download.p4c.philips.com/files/6/65pus8506_12/65pus8506_12_dfu_eng.pdf

Bu kaynak aynı ürün ailesine aittir; 58PUS8506/62 üzerinde doğrulama değildir. Kullanıcı TV'de ağdan uyandırmayı etkinleştirdiğini bildirdi. TV'nin beklemede uygulamaya CPU/ağ verdiği doğrulanmadı. “Ağ üzerinden açılabilir” olması Seslen'in beklemede çalıştığını kanıtlamaz.

Bu sürüm doğrudan internetten TV uyandırmaz. TV beklemede uygulamayı askıya alırsa polling durur. Mesaj D1'de 7 güne kadar bekler; TV/servis yeniden ağ erişimi elde ettiğinde alınır. İnternet üzerindeki iPhone'dan ev ağına WoL broadcast doğrudan gönderilmez. Ağdan uyandırma için evde sürekli açık bir relay ya da desteklenen üretici/Cast entegrasyonu gerekebilir. Böyle bir cihaz/entegrasyon kullanıcı hesabında tanımlı değil; varsayılarak eklenmedi.

## Gerçek cihaz kontrol sırası

1. APK'yı kurun, overlay izni verin, TTS yerel testi ve OK onayını deneyin.
2. TV model/Android sürümünü kaydedin: `adb shell getprop ro.product.model`, `adb shell getprop ro.build.version.release`, `adb shell getprop ro.build.version.sdk`.
3. Sunucu eşleştirmesinden sonra YouTube açıkken metin/ses gönderin. Sesi, OK odağını ve arka plandaki yayının devamını gözleyin.
4. TV'yi normal kumandadan beklemeye alın; 1, 10 ve 30 dakika sonra ayrı mesajlar gönderin. Kendiliğinden açılıp açılmadığını ve sunucudaki durumları kaydedin.
5. Açılmazsa kumandayla açın; bekleyen mesajın geldiğini kontrol edin. Ekran görüntülenmeden mesaj delivered/seen olmamalı.
6. Yeniden başlatın: `adb reboot`. Önceden alıcı başlatılmışsa boot receiver servisi açmayı dener. Üretici politikası engellerse elle bir kez başlatma gereksinimini kaydedin.
7. İnterneti kesip geri getirin; art arda üç mesaj gönderin ve sırayı kontrol edin. Uygulamayı zorla durdurmak Android'in otomatik başlangıcı engellemesine neden olabilir; tekrar elle açmak gerekir.
8. Netflix, YouTube ve TV yayını için audio focus duck davranışını ayrı test edin. Seslen global TV ses seviyesini değiştirmez; geçici audio focus ister ve bitince bırakır. Başka uygulama focus'u dikkate almazsa yayının sesi kısılmayabilir.

Android overlay API sistem pencerelerinin altında kalır ve sistem tarafından gizlenebilir:
https://developer.android.com/reference/android/view/WindowManager.LayoutParams#TYPE_APPLICATION_OVERLAY

TV'deki bütün uygulamaların üzerinde görünme garantisi verilmez. Android 8.0+ paket metaverisi doğrulandı; gerçek Philips kurulum/standby testleri yapılmadı.
