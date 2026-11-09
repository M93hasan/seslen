# SESLEN — PROJE KİTABI / KALICI TEKNİK VE ÜRÜN KAYDI
**Son güncelleme:** 9 Kasım 2026 (Türkiye) · **Proje:** Seslen · **Kaynak:** https://github.com/M93hasan/seslen

> **Önemli:** Bu kitap, ChatGPT'deki “Seslen Uygulama Geliştirme” sohbetinde verilen kararlarla GitHub ve bağlı Cloudflare hesabında doğrulanmış teknik durumun yazılı kaydıdır. Seslen 0.3 test APK'sı başarıyla derlendi. **Ancak gerçek iPhone–Philips TV testi tamamlanmış sayılmıyor.** Kullanıcı Google girişinden sonra `{"error":"Ä°stek tamamlanamadÄ±"}` hatası gördü; hata çözülüp tekrar doğrulanmadı. TV'yi beklemeden otomatik uyandırma garantisi yoktur.

## 1. Neden Seslen?
Telefonu duymayan veya görmeyen aile ferdine mesajı televizyon üzerinden ulaştırmak. Gönderen iPhone'dan metin yazabilir, dikte edebilir ya da kendi sesini kaydedebilir. TV mesajı büyük gösterir, Türkçe seslendirir veya kaydı oynatır; varsayılan olarak üç tekrar vardır. Kumandadaki OK ile “Görüldü” bildirimi gönderilir. Mesajı gönderirken aynı Wi-Fi ağına bağlı olma şartı yoktur; internet üzerinden HTTPS kullanılır.

## 2. Kullanıcı tarafından kararlaştırılan gereksinimler
1. Uygulama adı **Seslen**. Android TV için APK; iPhone için Safari tabanlı gönderici/PWA ve Kestirmeler.
2. Hedef TV **Philips 58PUS8506/62 Android TV**; iPhone'dan gönderim.
3. Mesajların TV'de büyük yazıyla ve sesle gösterilmesi, varsayılan **üç kez tekrarlanması**, OK ile durdurulması/onaylanması.
4. TV video/TV yayını izlerken ekran üstüne mesaj gelmesi. Overlay ve ses odağı Android/üretici politikalarına tabidir.
5. TV'nin normalde bekleme modunda olduğu senaryoya çözüm. Uyanma mekanizması gerçek donanımda test edilmeden “tamam” işaretlenmemeli.
6. Sunucu adresi ve eşleştirme kodu TV'ye elle girilmeyecek. TV'de QR gösterilecek; iPhone'da Google hesabıyla giriş yapılıp aynı hesap üzerinden açık onayla bağlanacak.
7. iPhone'dan metin, dikte ve ses kaydı; gönderme öncesi ses önizleme ve ayrı Gönder düğmesi.
8. Mesaj listesinde “Beklemede / Teslim edildi / Görüldü / Gösterilemedi”; Ana Ekran web uygulamasında “Görüldü” push bildirimi.
9. Veri ve kimlik bilgileri özel tutulacak; diğer Serula/PARA proje kaynaklarına dokunulmayacak.
10. **Geliştirme akışı:** `main` yalnız kararlı ve onaylı uygulama kodunu taşıyacak; ayrı dal + PR + test + kullanıcı onayı olmadan birleştirme yok. README ve bu proje kitabı gibi belgeleme işleri `main`'e doğrudan eklenebilir; uygulama kodu bu yolla yayınlanmamalı.

## 3. Sürüm geçmişi ve kilometre taşları
| Sürüm | İçerik | Kanıt / durum |
|---|---|---|
| 0.1-test | Kotlin TV alıcısı, overlay, TTS, 3 tekrar, OK, D1 mesaj kuyruğu, Google OAuth temeli, web gönderici, birim testleri | Geliştirme sürümü; gerçek cihaz testi eksik |
| 0.2-test | D1 içinde özel/parçalı ses kaydı, kotalar, iPhone ses önizleme ve ayrı gönder, push kuyruğu, polling/oynatma düzeltmeleri | Android ve Node CI geçmişte geçti |
| 0.3-test | TV'de hazır sunucu adresi, QR ile Google hesabında eşleştirme, yenilenmiş TV ve web arayüzleri, `0004_account_connect.sql` | [Başarılı GitHub Actions çalışması](https://github.com/M93hasan/seslen/actions/runs/42676721734) |
| 0.3 düzeltmeleri | Daha önce açılmış TV alıcısının uygulama açılışında toparlanması, iPhone'da boş metin gönderme kontrolü | [PR #4](https://github.com/M93hasan/seslen/pull/4), [CI başarılı](https://github.com/M93hasan/seslen/actions/runs/42678786191) |
| Kararlı yayın | Gerçek cihaz/Google/push/standby kabulü, release imzası ve güvenlik incelemesi | **Henüz yok** |

### 9 Kasım 2026'da doğrulanan somut durum
- Cloudflare hesabında **`seslen-staging` Worker** bulunuyor; yayımlanmış test script'i mevcut.
- Seslen'e özel **`seslen-staging` D1** mevcut; `0001.sql`, `0002_audio_storage.sql`, `0003_push.sql` ve `0004_account_connect.sql` migration kayıtları var.
- Worker binding adları: `DB`, `AUDIO_BACKEND`, `ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VAPID_PRIVATE_JWK` ve `VAPID_PUBLIC_KEY`. **Secret değerleri burada veya GitHub'da yer almıyor.**
- Test origin: **https://seslen-staging.m93hasan.workers.dev**
- Google callback adresi: **https://seslen-staging.m93hasan.workers.dev/auth/callback**
- Son geliştirilen dal `fix/seslen03-receiver-resume-send-validation`, commit `136fdefa0aa3c8c2d4ec971153febf1194a376dc` üzerinde Android ve sunucu işleri başarıyla sonuçlandı.
- Yeni APK GitHub Actions artifact adı `seslen-0.3.0-test-apk`, dosya içine konulan APK `app-debug.apk`. GitHub Actions artifact'leri **her zaman ZIP arşivi olarak** sunulur; doğrudan APK bağlantısı için sohbetten çıkarılmış `Seslen-0.3.0-test.apk` dosyası ya da daha sonra GitHub **Release assets** kullanılabilir. Bu dosya kararlı/production APK değildir.

## 4. Sistem mimarisi
~~~text
iPhone Safari / Ana Ekran PWA (iphone/)
   ├── Google giriş ve cihaz eşleştirme onayı
   ├── Metin, dikte, ses kaydı ve kayıt önizleme
   ├── Mesaj geçmişi / push aboneliği / Kestirmeler
   └── HTTPS
          ↓
Cloudflare Worker (server/src/index.js)
   ├── Google OAuth PKCE/state/nonce + oturum
   ├── TV eşleştirme ve erişim denetimi
   ├── D1: hesap, oturum, cihaz, mesaj, push
   ├── D1: özel parçalı ses depolama (R2 isteğe bağlı)
   └── cron: gönderim denemeleri ve kayıt temizliği
          ↑ HTTPS polling (yaklaşık 5 saniye)
Philips Android TV (android-tv/)
   ├── QR kod / TV alıcısı foreground service
   ├── Kalıcı gelen mesaj ve çıkış olayı kuyruğu
   ├── Overlay + Türkçe TTS veya ses kaydı
   ├── 3 oynatma + ses odağı
   └── Kumanda OK -> görüldü olayı
~~~

### Kaynak kodu
- `android-tv/app/src/main/java/site/serula/seslen/`: TV ana ekranı, API, alıcı servisi ve tekrarlama kodları.
- `android-tv/app/src/main/AndroidManifest.xml`: internet, ekran üstü gösterim, başlangıç, foreground servis izinleri.
- `iphone/index.html`, `iphone/app.js`, `iphone/style.css`, `iphone/sw.js`: iPhone web istemcisi ve push.
- `server/src/index.js`: Worker REST API, Google giriş ve cihaz oturumları.
- `server/src/audio-store.js`: D1/R2 ses saklama; `server/src/push.js`: Web Push.
- `server/migrations/`: D1 şemaları; `server/test/` ve Android test dizini: testler.
- `.github/workflows/build.yml`: APK, Android test/lint ve sunucu testleri; `release.yml`: kontrollü release altyapısı.

## 5. İşlevsel akış
### İlk TV eşleştirmesi
1. Test APK Philips TV'ye kurulur; “diğer uygulamaların üzerinde göster” izni verilir.
2. TV'de **Google hesabıyla bağlan** seçilir. Tek kullanımlık, süreli QR kodu görünür.
3. iPhone kamerasından QR açılır; Safari'de Google hesabıyla giriş yapılır.
4. Kullanıcı TV kodunu kontrol edip bu TV'yi hesabına bağlamayı onaylar.
5. TV bir kez cihaz token'ını alıp Android Keystore AES-GCM ile saklar.
6. TV'de alıcı foreground servisi çalışır. Manuel kod girişi eski sürüm için alternatif olarak kalır.

**Önemli:** Bu akış kodda bulunuyor; kullanıcının bildirdiği Google giriş hatası nedeniyle son gerçek akış henüz tamamlanmış sayılmıyor.

### Mesajlaşma
1. iPhone hesapta bağlı TV'yi seçer; metni veya önceden dinlenmiş kaydı gönderir.
2. Worker hesabın hedef TV'ye yetkisini ve mesaj biçimini doğrular; tekrarlanan istekler için aynı idempotency anahtarını kullanır.
3. Mesaj kalıcı D1 kuyruğuna eklenir.
4. TV aktifse inbox'ı düzenli sorgular; mesaj TV'de görüntülenir ve seslendirilir.
5. TV'de OK kullanıcı onayıyla **Görüldü** olur. Web gönderici durumunu düzenli yeniler; push kabul edilirse bildirim üretilebilir.
6. TV çevrimdışıysa mesaj en fazla 7 gün tutulur; TV yeniden erişilebilir olduğunda alınabilir.

### iPhone deneyimi
- Ana Ekrana Ekle: Safari paylaşım menüsü üzerinden PWA.
- Metin gönderimi ve klavye diktesi.
- Ses kaydı → Kaydı bitir → dinle → **ayrı gönder**. Kayıt otomatik olarak gönderilmez.
- Apple Kestirmeler üzerinden POST istekleri için 30 günlük, iptal edilebilir gönderici anahtarı hazırlanabilir; imzalı `.shortcut` dosyası henüz üretilmedi.
- Web Push yalnız destekli iOS ve Ana Ekrana eklenmiş uygulama üzerinde, kullanıcı izin verince çalışır; gerçek iPhone teslimatı test edilmelidir.

## 6. API özeti (geliştirme kodundaki uç noktalar)
| Uç nokta | Yöntem | Amaç |
|---|---|---|
| `/health` | GET | Uygulama sağlık ve sürüm bilgisi |
| `/auth/login` ve `/auth/callback` | GET | Google OAuth başlatma/dönüş |
| `/api/account` | GET | Oturum açan hesap |
| `/api/pair/start` | POST | TV'de tek kullanımlık eşleştirme |
| `/api/pair/poll` | POST | TV'nin onay sonucunu alması |
| `/api/pair/confirm` | POST | Tarayıcıda eşleştirmeyi onaylama |
| `/api/devices` | GET | Hesabın bağlı TV'leri |
| `/api/inbox` | GET | TV mesaj kuyruğu |
| `/api/events` | POST | Teslim/bitirme/görüldü/hata |
| `/api/messages` | POST/GET | Mesaj gönderme / geçmiş |
| `/api/audio` ve `/api/audio/:id` | POST/GET | Ses kaydı yükleme/okuma |
| `/api/push/key`, `/api/push/subscribe`, `/api/push/unsubscribe` | GET/POST | Web Push ayarları |
| `/api/sender-token` ve `/api/revoke-senders` | POST | Kestirme anahtarı |
| `/api/revoke` ve `/api/logout` | POST | Cihaz/oturum yönetimi |

İstekler hesap/cihaz yetkisine bağlıdır. Cihaz kimliği, gönderici token'ı ve gizli anahtarlar örnek belgelerde gerçek değerleriyle verilmemelidir.

## 7. Güvenlik ve sınırlamalar
- Google OAuth authorization-code akışı, PKCE S256, state/nonce, JWT imza/issuer/audience doğrulaması; Secure/HttpOnly/SameSite çerez.
- TV eşleştirme 6 dakika geçerli; 48 bit tek kullanımlık kod + 256 bit polling sırrı. Cihaz token'ı yalnız bir kez teslim edilir.
- Yetkiler kullanıcı, tarayıcı/gönderici/TV rolü ve cihaz sahipliğine göre ayrılır; TV hesabın diğer mesajlarına erişemez.
- D1'de token'ların SHA-256 özetleri tutulur; TV'de Keystore AES-GCM; HTTPS ve yönlendirme kısıtları.
- Mesaj sınırı 4.000 karakter; ses kayıt boyutu en fazla 5 MiB; kullanıcı başına toplam ses 20 MiB, tüm hizmette 100 MiB; günlük 100 ses ve 500 mesaj; saklama 7 gün.
- Web Push: VAPID, kayıtlı sağlayıcılar, özel mesaj içeriği bildirim gövdesine konulmaz. Push sağlayıcısının yanıtı telefonda görünmeyi garantilemez.
- Uçtan uca şifreleme **yoktur**; Android/Cloudflare sağlayıcı güvenliği ve cihaz erişimleri önemlidir.
- **Özel anahtarlar, Google secret, gerçek kullanıcı token'ları, e-posta/hesap sırları veya ses kayıtları asla bu depoya eklenmemelidir.**
- Bağımsız güvenlik denetimi ve kalıcı üretim imzası henüz yapılmamıştır.

## 8. Kurulum — APK test sürümü
### Dosyayı edinme
- [Son başarılı test APK derlemesi](https://github.com/M93hasan/seslen/actions/runs/42678786191) → **Artifacts** → `seslen-0.3.0-test-apk` (GitHub bunu ZIP olarak sunar).
- ZIP'in içinden `app-debug.apk` çıkar. ChatGPT sohbetinde aynı dosyanın ZIP dışına çıkarılmış, doğrudan indirilebilir `Seslen-0.3.0-test.apk` kopyası sağlanmıştır; ChatGPT geçici dosya adresi **kalıcı GitHub indirme adresi değildir**.
- Ayrı bir GitHub Release asset yayımlanmadıkça bu depo kökünden ZIP'siz APK indirme bağlantısı varmış gibi gösterilmemelidir.

### Android/ADB kurulum örneği
~~~sh
adb connect <TV_IP_ADRESI>:5555
adb devices
adb install -r Seslen-0.3.0-test.apk
adb shell am start -n site.serula.seslen/.MainActivity
~~~
ADB'yi yalnız güvenilen yerel ağda kullan; **5555 portunu internete açma**. TV IP'si örnektir; gerçek IP doğrulanmalıdır. APK debug imzalıdır; kararlı release farklı imzalanırsa bir defa kaldırıp yeniden eşleştirmek gerekebilir. Alternatif olarak TV destekliyorsa APK'yı USB/dosya yöneticisi ile açıp yükleyebilirsin. TV'de overlay iznini ver, önce **Görüntü ve Türkçe ses testi**ni yap.

## 9. Otomatik test ve derleme
| Kontrol | Sonuç |
|---|---|
| Son 0.3 temel sürüm Android + server CI | [Başarılı](https://github.com/M93hasan/seslen/actions/runs/42676721734) |
| 0.3 düzeltme dalı son CI (Android APK, Android test/lint, Node testleri/Worker dry-run) | [Başarılı](https://github.com/M93hasan/seslen/actions/runs/42678786191) |
| Gerçek Philips 58PUS8506/62 kurulumu, medya/TTS/OK testi | **Eksik / doğrulanmadı** |
| Google giriş/QR ile canlı eşleştirme | **Hata bildirildi, çözüm doğrulanmadı** |
| Gerçek iPhone Safari / Web Push / Kestirmeler | **Eksik / doğrulanmadı** |
| Philips standby/otomatik uyandırma | **Eksik / uygulanmış sayılmıyor** |
| Bağımsız güvenlik incelemesi ve kalıcı APK release imzası | **Eksik** |

Yerel derleme (JDK 17 + Android SDK 35):
~~~sh
cd android-tv
./gradlew assembleDebug testDebugUnitTest lintDebug
~~~
Sunucu:
~~~sh
cd server
npm ci
npm test
npm run check
~~~
Bu komutların çalışması gerçek iPhone/Philips kabul testlerinin yerini tutmaz.

## 10. Google giriş sorunu — açık hata
**Belirti:** Kullanıcı Google hesabını seçtikten sonra `{"error":"Ä°stek tamamlanamadÄ±"}` gördü. Bu metin UTF-8/Latin-1 karakter karışıklığıyla bozulmuş `İstek tamamlanamadı` mesajıdır.

**Doğrulananlar:** Worker'da Google Client ID, gizli secret binding ve ORIGIN bulunuyor; D1 dört migration'ı uygulanmış durumda. Önceki kayıtlar yeniden Google/Cloudflare hesabı kurmayı gerektirmez. Gözlenen D1 hesabı sayısının sıfır oluşu, girişin başarılı hesap kaydı aşamasına ulaşmadığını düşündürüyor; **tek başına kesin neden değildir**.

**Olası aşamalar:** `/auth/login` çıkışı, Google token exchange, state/cookie doğrulama, JWT/nonce doğrulama, D1 hesap/oturum yazımı. Kesin neden ancak **gizli bilgileri göstermeyen** Workers logu ve isteğin HTTP durumundan anlaşılır. Yanlış callback veya Google OAuth ayarları kontrol edilmeli; secret hiçbir yere yapıştırılmamalı. Sunucu genel hata yanıtını güvenli ve anlaşılabilir kategoriye çevirecek düzeltme test edilmeden çözülmüş sayılmaz.

## 11. Bekleme modunda TV'yi uyandırma — açık tasarım kararı
- Philips 8506 ailesinde WoWLAN/Chromecast ile uyandırma seçenekleri olabilir; **58PUS8506/62 üzerinde gerçek kabul yok**.
- Android TV beklemede ağ/CPU'yu askıya alırsa TV alıcısının 5 saniyelik sorgulaması durabilir.
- Worker mesajı D1'de 7 güne kadar saklar; TV açılınca teslim etmeye çalışır.
- İnternetteki iPhone doğrudan yerel ağın Wake-on-LAN broadcast adresine erişemez. Gerekirse evde sürekli açık, yetkili cihaz/relay ya da üreticinin desteklediği ağdan uyandırma entegrasyonu gerekir.
- “Her koşulda otomatik açılır” iddia edilmez. Önce TV'yi 1, 10 ve 30 dakikalık bekleme testlerinde dene; YouTube, Netflix ve TV yayını üzerinde overlay ve audio focus'u ayrı kontrol et.
- İlgili çalışma belgesi: [Philips bekleme planı](https://github.com/M93hasan/seslen/blob/develop/first-apk/docs/WAKE.md).

## 12. Açık yapılacaklar / kabul ölçütleri
- [ ] Google giriş hatası: gerçek hatayı loglarda belirle; yalnız ilgili dalda güvenli düzeltme + regresyon testi + yeniden doğrulama.
- [ ] Philips TV'de güncel APK kurulumu, overlay izni, TTS/OK, alıcı otomatik toparlanma.
- [ ] iPhone'dan QR'ı okut → Google giriş → TV onayı → tek TV'ye mesaj gönder; “Teslim edildi / Görüldü”yi karşılıklı doğrula.
- [ ] Ses kaydının gönderme, 3 tekrar, kullanıcı OK ve hata durumları.
- [ ] YouTube/Netflix/TV yayını sırasında ses odağı ve ekran üstü gösterim.
- [ ] Arka plan PWA Web Push'un iPhone Ana Ekran uygulamasında gerçekten görünmesi.
- [ ] TV 1/10/30 dk standby, reboot, bağlantı kesintisi, yeniden alma ve kuyruk sırası.
- [ ] Siri/Kestirmeler gerçek iPhone deneyi, tercihen imzalı paylaşılabilir .shortcut.
- [ ] Erişilebilirlik, Android emulator/instrumentation, uzun metin, eksik Türkçe TTS, hata ve spam denemeleri.
- [ ] Kalıcı release imzası, bağımsız güvenlik incelemesi ve kullanıcı onaylı stable release.
- [ ] PR'larda test tamamlanmadan, kullanıcı açık onayı olmadan `main` kodunu birleştirme; gereksiz dalları onaylı merge sonrası temizle.

## 13. GitHub çalışma düzeni ve kaynak gösterimleri
- **`main`:** GitHub ana sayfası README + bu kitap; kararlı uygulama kodu ancak tüm kontroller ve kullanıcı onayıyla.
- **`develop/first-apk`:** 0.1–0.3 çalışan geliştirme kaynakları; [PR #1](https://github.com/M93hasan/seslen/pull/1) henüz birleştirilmedi.
- **`fix/seslen03-receiver-resume-send-validation`:** 0.3 düzeltmeleri; [PR #4](https://github.com/M93hasan/seslen/pull/4) taslak ve birleştirilmemiş.
- [Issue #2 — gerçek cihaz kabul listesi](https://github.com/M93hasan/seslen/issues/2)
- [Issue #3 — Google/push kurulum ve doğrulama](https://github.com/M93hasan/seslen/issues/3)
- [0.3 doğrulanmış durum raporu](https://github.com/M93hasan/seslen/blob/fix/seslen03-receiver-resume-send-validation/docs/STATUS-2026-11-09.md)
- [iPhone & Kestirmeler](https://github.com/M93hasan/seslen/blob/develop/first-apk/docs/IPHONE.md)
- [Google hesabı ve QR eşleştirme](https://github.com/M93hasan/seslen/blob/develop/first-apk/docs/ACCOUNT-CONNECT.md)
- [Cloudflare kurulum notları / güncel düzeltme](https://github.com/M93hasan/seslen/blob/fix/seslen03-receiver-resume-send-validation/docs/CLOUDFLARE.md)
- [Güvenlik sınırlamaları](https://github.com/M93hasan/seslen/blob/develop/first-apk/docs/SECURITY.md)
- [Sürüm geçmişi](https://github.com/M93hasan/seslen/blob/develop/first-apk/CHANGELOG.md)

## 14. Değişiklik kayıtlarını güncelleme kuralı
Her iş sonunda önce bu kitaptaki ilgili satırı, sonra GitHub Issue/PR yorumunu ve gerekliyse README'deki son durumu güncelle. **Kodun varlığı ≠ testin geçmesi ≠ gerçek cihaz kabulü ≠ üretim yayını.** Tamamlandı denilen her aşamanın commit, CI çalışması veya gerçek cihaz sonucu bulunmalıdır. Tespit edilmeyen hataya kesin neden atfetme. Gizli bilgiler kayda alınmaz. Ayrı projeler izinsiz değiştirilmez.
