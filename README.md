# Seslen — 0.1.0-test

Philips Android TV için büyük ekran mesaj alıcısı, iPhone web göndericisi ve Cloudflare sunucusu.

**Bu ilk test sürümüdür.** APK derleme doğrulaması ile gerçek cihaz testi farklıdır. Google/Cloudflare yapılandırılmadan internetten mesaj göndermez. Sunucu kurulmadan TV'deki “Yerel gösterim ve Türkçe ses testi” düğmesi denenebilir. Gerçek TV, bekleme, otomatik başlatma ve uygulamalar üzerindeki gösterim henüz doğrulanmadı. Üretime hazır olduğu iddia edilmiyor.

## İçerik

- `android-tv/`: Kotlin, Android 8.0+ (API 26), target 34, compile 35; mimariden bağımsız kod; Android TV launcher.
- `iphone/`: Safari uyumlu web göndericisi, Google giriş bağlantısı, metin, ses kaydı, durum listesi, eşleştirme ve iptal.
- `server/`: Worker, D1 kalıcı kuyruk, özel R2 ses dosyaları; 5 saniye aralıklı HTTPS polling.
- `docs/`: kurulum, Kestirmeler, yapılandırma, güvenlik ve test raporu.

## APK kurulumu — Termux

Termux Android cihazda çalışır; iPhone'a Termux kurulmaz. Önceden ADB kullandığınız Termux cihazını kullanın. APK'yı bu teslimattan indirin ve Android cihazın Download klasörüne `seslen.apk` adıyla kaydedin.

```sh
pkg install android-tools
termux-setup-storage
adb connect 192.168.1.13:5555
adb devices
adb install -r "$HOME/storage/downloads/seslen.apk"
adb shell am start -n site.serula.seslen/.MainActivity
```

TV'de ilk ADB bağlantı iznini onaylayın. IP değişirse komutta TV'nin yeni adresini kullanın. Bu adres yalnız kurulum içindir; mesaj sistemi IP'ye bağlı değildir.

Seslen'de **Diğer uygulamaların üzerinde gösterme izni** düğmesiyle izin verin. TV izin ekranını açamazsa ADB ile:

```sh
adb shell appops set site.serula.seslen SYSTEM_ALERT_WINDOW allow
adb shell appops get site.serula.seslen SYSTEM_ALERT_WINDOW
adb shell am start -n site.serula.seslen/.MainActivity
```

Android 13+ bildirim izni sorulursa izin verin. TTS çalışmazsa TV Ayarlar → Metin okuma/TTS bölümünde Türkçe ses verisini yükleyin. Önce yerel testi çalıştırın. OK, tekrarı ve sesi durdurmalıdır. Ardından sunucu adresini kaydedin, kod oluşturun, iPhone'dan eşleştirin ve alıcıyı başlatın. İşlem bitince YouTube'a dönün ve web göndericisinden mesaj gönderin. TV'de Seslen'i sürekli açık ekranda bırakmanız gerekmez; alıcı servisi çalışır.

Güncelleme aynı imzalı APK ile `adb install -r` kullanır. İlk APK debug imzalıdır. Kararlı sürümün kalıcı imzasına geçerken Android farklı imzalı güncellemeyi reddeder; o aşamada tek seferlik kaldırma ve yeniden eşleştirme gerekebilir. Üretim imza anahtarı henüz oluşturulmadı; özel anahtar paylaşılmaz/depolanmaz.

## Derleme

JDK 17, Android SDK platform 35 ve build tools 35.0.0 gerekli:

```sh
cd android-tv
chmod +x gradlew
./gradlew assembleDebug testDebugUnitTest lintDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions `build.yml` PR ve geliştirme dallarında APK artifact üretir. `main` üzerine otomatik push/merge/deploy yoktur. `release.yml` elle çalıştırılır; üretim ortamında zorunlu reviewer kuralı, kalıcı imza secrets ve onaylanmış main tag'i kurulmadan çalıştırılmamalıdır. Repository environment koruması ayrıca GitHub'da ayarlanmalıdır; workflow dosyası tek başına onay zorlamaz.

## Sunucu ve iPhone

[Cloudflare/Google kurulumu](docs/CLOUDFLARE.md), [iPhone ve Kestirmeler](docs/IPHONE.md), [test ve sınırlar](docs/TEST-REPORT.md), [güvenlik](docs/SECURITY.md).

Özel GitHub deposu: https://github.com/M93hasan/seslen

Kaynaklar `develop/first-apk` dalından Pull Request ile sunulur. GitHub Actions sonucu ayrıca doğrulanmalıdır. main'e birleştirme ve canlı yayın yapılmadı. [Kalan işler](docs/BACKLOG.md).
