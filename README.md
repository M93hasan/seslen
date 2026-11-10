# SESLEN — iPhone'dan Android TV'ye sesli ve yazılı mesaj

## 📥 Android TV APK — GitHub'dan doğrudan indir

**[Seslen 0.4.1 APK indir (ZIP değil, doğrudan APK)](https://github.com/M93hasan/seslen/releases/download/v0.4.1-test-20261110/Seslen-0.4.1-TEST.apk)**

**[GitHub Releases — sürüm sayfası](https://github.com/M93hasan/seslen/releases/tag/v0.4.1-test-20261110)** · Dosya adı: `Seslen-0.4.1-TEST.apk` · Yaklaşık 1,15 MB.

> **Önemli:** GitHub'da yayımlanan bu **0.4.1 test/debug APK'dır**, kararlı/üretim imzalı sürüm değildir. Mevcut APK'nın üzerine farklı imza nedeniyle kurulamayabilir; eski uygulamayı henüz silme. TV son bağlantı göstergesi için gereken Cloudflare Worker + D1 güncellemesi canlıda henüz doğrulanmadı. Bu sürüm, televizyonu uykudan uyandırma işlevini eklemez.


**Seslen**, iPhone'dan uzaktaki Philips Android TV'ye mesaj gönderip ekranda büyük gösteren ve yüksek anlaşılabilirlik için Türkçe seslendiren bir aile iletişim uygulamasıdır. TV'deki mesajlar varsayılan olarak **3 kez** tekrarlanır; kumandada **OK** ile “Görüldü” olarak onaylanır.

> **Son durum: 10 Kasım 2026 — 0.4.1 TEST APK GitHub Releases'a yüklendi.** Android ve sunucu otomatik testleri başarılı. TV'nin son bağlantı zamanını göstermek üzere kod ve [PR #13](https://github.com/M93hasan/seslen/pull/13) hazır. **Worker/D1 canlı geçişi ve gerçek TV doğrulaması tamamlanmadı.** Google girişinin gerçek cihazda sorunsuz çalıştığı ayrıca doğrulanmalı. Bu henüz üretim sürümü değildir.

## 📖 Projenin tamamını buradan oku
**[SESLEN PROJE KİTABI — Tüm özellikler, önceki kararlar, kurulum, testler, teknik yapı, hatalar ve kalan işler](docs/PROJECT-BOOK.md)**

Bu dosya GitHub'ın varsayılan **`main` dalında** bulunmaktadır. Geliştirme kodu ise PR üzerinden ayrı dallarda tutulur; kullanıcı onayı olmadan birleştirilmez.

## Hedef cihazlar
- **Philips 58PUS8506/62 Android TV**: APK olarak kurulan mesaj alıcısı.
- **iPhone**: Safari'de çalışan web/PWA göndericisi; Ana Ekrana Ekle ve Apple Kestirmeler/Siri desteği hazırlanmıştır.
- **Sunucu:** Cloudflare Workers + Seslen'e özel D1 veritabanı.
- **Test adresi:** https://seslen-staging.m93hasan.workers.dev (Google oturumu ve gerçek cihaz akışı test edilmelidir).

## Uygulamada neler var?
1. TV'de büyük yazılı mesaj, Türkçe seslendirme, ses kaydı oynatma, üç tekrar ve **OK ile Görüldü**.
2. iPhone'da mesaj yazma, klavye diktesi, ses kaydı, önce dinleme ve ayrı gönderme.
3. TV'ye **hazır sunucu adresi + QR + iPhone'da Google hesabıyla açık onay** ile bağlantı. TV'ye elle hesap/sunucu kodu yazmak gerekmiyor (eski APK kod yolu yedek olarak duruyor).
4. “Beklemede / Teslim edildi / Görüldü / Gösterilemedi” durumları; görülme için Web Push kodu.
5. İnternet kesilince kalıcı kuyruk; mesajlar yedi gün saklanır.
6. Android Keystore ve hesap/cihaz bazlı yetkilendirme; gizli anahtarlar kodda paylaşılmaz.

### Geliştirme / doğrulama tablosu
| Bölüm | Kod durumu | Gerçek ortam |
|---|---|---|
| 0.4.1 Android TV test APK ve iPhone web arayüzü | ✅ APK GitHub Releases'ta | ⚠️ Gerçek Philips/iPhone testleri eksik |
| Google giriş ve QR eşleştirme | ✅ Var | ❌ Kullanıcı giriş hatası bildirdi |
| D1, Worker, VAPID ayarları | ✅ Bağlı hesapta doğrulandı | ⚠️ Gerçek uçtan uca test eksik |
| Tekrarlama, OK, TTS, ses kaydı | ✅ Geliştirildi | ⚠️ TV'de tüm medya senaryoları denenmedi |
| TV'yi bekleme modundan açma | ❌ Kanıtlanmış çözüm yok | ❌ Philips cihaz testi eksik |
| Üretim imzalı sürüm | ❌ Henüz yok | ❌ Son kabul ve onay bekleniyor |

## 📱 Güncel test APK (Android TV)

**Güncel GitHub dosyası: [Seslen-0.4.1-TEST.apk](https://github.com/M93hasan/seslen/releases/download/v0.4.1-test-20261110/Seslen-0.4.1-TEST.apk)**. Bu doğrudan APK bağlantısıdır; **Actions artifact ZIP'ini indirmene gerek yok.** [Sürüm ayrıntıları](https://github.com/M93hasan/seslen/releases/tag/v0.4.1-test-20261110).

0.3 APK geçmiş sürümdür: [önceki 0.3 CI kaydı](https://github.com/M93hasan/seslen/actions/runs/42678786191). 0.4.1 test sürümünde TV alıcısının son temasını izleme için sunucu değişikliği hazırlanmıştır; canlı yayında görünmesi için Worker/D1 güncellemesi ayrıca gerekir.

**TV'ye kurulum:** APK'yı TV'ye USB/dosya yöneticisiyle aktar veya yerel ağda ADB kullan:
~~~sh
adb connect <TV_IP>:5555
adb install -r Seslen-0.4.1-TEST.apk
adb shell am start -n site.serula.seslen/.MainActivity
~~~
TV'nin internet bağlantısı ve **Diğer uygulamaların üzerinde gösterme** izni gerekli. ADB 5555 portunu internete açma. Önce uygulama içindeki **Görüntü ve Türkçe ses testi**ni yap. APK debug imzalıdır; üretim APK'sına güncellerken farklı imza nedeniyle tek seferlik yeniden kurulum gerekebilir.

## 🔗 Google ile TV'yi bağlama — hedef akış
1. Philips TV'de Seslen'i aç, **Google hesabıyla bağlan** seç ve QR kodunu gör.
2. iPhone kamerasıyla QR'ı okut; Safari'de aynı Google hesabıyla giriş yap.
3. Bağlanacak TV kodunu kontrol ederek **Bu televizyonu hesabıma bağla** de.
4. TV alıcısını aç ve overlay iznini ver.
5. iPhone panelinden mesaj gönder; televizyonda tekrarlamayı ve **OK → Görüldü** durumunu doğrula.

**Açık hata:** Kullanıcı Google girişinden sonra `{"error":"Ä°stek tamamlanamadÄ±"}` bildirdi. Bu bozuk karakterlerle görünen genel sunucu hatasıdır; **kesin neden ve düzelme henüz kanıtlanmadı**. Secret veya kişisel giriş bilgilerini kimseyle paylaşma. [Ayrıntılar ve teşhis planı](docs/PROJECT-BOOK.md#10-google-giriş-sorunu--açık-hata).

## 🧩 Kod nerede, neden ana sayfada görünmüyor?
- **`main`:** README, [proje kitabı](docs/PROJECT-BOOK.md) ve onaylı kararlı belgeler; henüz geliştirmenin tamamını birleştirmedik.
- **[`develop/first-apk`](https://github.com/M93hasan/seslen/tree/develop/first-apk):** 0.1–0.3 TV, iPhone ve Worker kaynakları. [PR #1](https://github.com/M93hasan/seslen/pull/1).
- **[`fix/seslen03-receiver-resume-send-validation`](https://github.com/M93hasan/seslen/tree/fix/seslen03-receiver-resume-send-validation):** Son alıcı toparlanma ve iPhone boş mesaj kontrolü. [PR #4](https://github.com/M93hasan/seslen/pull/4) taslak.

## 📋 Kalan işler
- [ ] Google girişindeki genel hatayı gizli anahtarları ifşa etmeden teşhis et ve düzelttiğini gerçek girişle doğrula.
- [ ] Philips TV'de APK, overlay, TTS/ses kaydı, OK, YouTube/Netflix sırasında mesajı dene.
- [ ] iPhone ile gerçek QR eşleştirmesi, uzaktan metin/ses gönderimi ve “Görüldü” teslimatı.
- [ ] iPhone PWA push/Siri/Kestirmeler cihaz testleri.
- [ ] TV standby (1/10/30 dakika), ağdan uyandırma seçeneği, boot ve ağ kesintisi senaryoları.
- [ ] Güvenlik incelemesi, kalıcı release imzası, kullanıcı onayıyla stable APK ve PR birleştirme.

**Takip:** [Issue #2 — gerçek cihaz kabulü](https://github.com/M93hasan/seslen/issues/2) · [Issue #3 — Google ve bildirimler](https://github.com/M93hasan/seslen/issues/3) · [0.3 düzeltme PR #4](https://github.com/M93hasan/seslen/pull/4).

### 🛡️ Proje çalışma ilkesi
Mevcut çalışan kodları koru. Geliştirmeyi ayrı dalda test et, PR hazırla; **`main` dalına uygulama kodunu ancak bütün kontroller başarılıysa ve kullanıcı açıkça onayladıysa birleştir**. Gerçek cihaz doğrulanmadan “tamamlandı” deme. Diğer Serula/PARA proje verilerine dokunma. Secret ve token'ları GitHub'a koyma.
