# Seslen — Yerel iPhone uygulaması (SwiftUI)

Proje: M93hasan/seslen · Dal: feat/ios-native-seslen-sender · [Taslak PR #11](https://github.com/M93hasan/seslen/pull/11).

## iPhone ile TV'nin görevleri

Android TV APK'sı mevcut mesaj **alıcısı** olarak kalır. SwiftUI ile geliştirilen iPhone uygulaması aynı Seslen hesabına bağlı televizyona yazılı veya sesli mesaj **gönderir**. Android APK iPhone'da çalıştırılmaya çalışılmaz. Diğer projeler ve canlı sunucu kendiliğinden değiştirilmez.

## Eklenen özellikler

- Google ile oturum açma: Apple AuthenticationServices tarayıcı oturumu; PKCE, kısa ömürlü tek kullanımlık bilet ve iOS Keychain.
- Kullanıcının hesabına bağlı TV'leri listeleme, TV seçimi, kamera ile QR okutma veya 12 haneli kod ile eşleştirme.
- Yazılı Türkçe mesaj, hazır mesajlar, karakter sayacı, gönderme.
- En fazla 60 saniyelik AAC/M4A ses kaydı, önizleme, en fazla 5 MB yükleme ve gönderme.
- Son mesajların beklemede / teslim edildi / görüldü / gösterilemedi durumlarını uygulama açıkken izleme.
- Kullanıcının gönderdiği Seslen logosu; ios/prepare-assets.sh ile Xcode app icon'u oluşturulur.
- 30 günlük oturum anahtarını cihazın güvenli Keychain alanında saklama ve çıkışta kaldırma.

TV'deki üç tekrar ve kumandadan OK ile Görüldü işlevi değişmez.

## Google giriş köprüsü

Yeni, henüz canlıya yüklenmemiş native uç noktalar:

- GET /auth/ios/login?challenge=... (Google hesabına yönlendirir)
- POST /api/ios/token (ticket ve PKCE verifier değişimi)

iPhone 32 rastgele bayt üretir; Google şifresini uygulama içine almaz. Google'ın mevcut Web OAuth client'ı ve seslen.serula.site/auth/callback adresi kullanılır. Doğrulanan Google kullanıcısına, sunucuda yalnız SHA-256 hash'i saklanan 120 saniyelik tek kullanımlık bilet gönderilir. Seslen uygulaması seslen://auth derin bağlantısından bu bileti alır ve yalnız PKCE verifier ile kullanabilir. Başka uygulama bileti görse de verifier olmadan oturum alamaz. Session bearer token iOS Keychain'de saklanır; Google / TV veritabanı modeli korunur.

Yeni D1 migration: server/migrations/0005_ios_native.sql. Yalnız yeni ios_tickets tablosu ve süre index'i ekler; mevcut OAuth tablosunu yeniden oluşturmaz. Native Worker deploy'undan önce migration gerekir. Yeni native yollar yalnız kullanıcının onayıyla yayınlanabilir.

**Önemli:** Google Cloud Console'da halihazırda bilinen redirect_uri_mismatch sorununun düzeltilmiş olması gerekir. Mevcut web OAuth Client'ın Authorized redirect URIs listesinde https://seslen.serula.site/auth/callback ve eski staging callback adresi bulunmalıdır.

## Derleme ve test

1. Mac üzerinde Xcode ve XcodeGen kur (Homebrew: brew install xcodegen).
2. Repo kökünde bash ios/prepare-assets.sh komutuyla kullanıcı logosundan AppIcon.png oluştur.
3. xcodegen generate --spec ios/project.yml komutuyla proje dosyasını üret.
4. Xcode'da ios/Seslen.xcodeproj dosyasını aç; Signing & Capabilities kısmından Apple Developer Team seç. Bundle identifier: site.serula.seslen.ios.
5. iPhone'unda Xcode Run veya imzalı TestFlight/Ad Hoc sürümü ile test et.

GitHub [iOS CI](../.github/workflows/ios-build.yml) macOS'ta Simulator uygulamasını ve iPhoneOS için **imzasız IPA** üretir. Simulator uygulaması gerçek iPhone'a kurulamaz; imzasız IPA da Apple imzalama olmadan iPhone'a doğrudan yüklenemez. İmzalı IPA / TestFlight / App Store dağıtımı Apple Developer hesap ve provisioning gerektirir.

## Kabul kriterleri ve eksikler

- [x] Native SwiftUI kaynakları, API, Keychain, QR, metin ve ses.
- [x] Mac iOS Simulator CI derlemesi ve sunucu testleri başarılı.
- [x] İmzasız iPhoneOS IPA CI derleme ve paketleme başarılı.
- [ ] Kullanıcı onaylı D1 migration ve Worker native login yayını.
- [ ] Gerçek iPhone'da Google girişi, kamera, ses, mesaj geçmişi ve Philips TV 3 tekrar/OK uçtan uca doğrulama.
- [ ] Apple Developer imzasıyla kurulabilir IPA / TestFlight.
- [ ] İsteniyorsa APNs aracılığıyla iPhone arka plan bildirimi ve yerel Siri App Intents.

**Ana kural:** Main ve çalışan yayın ancak tüm kontroller ve kullanıcının açık onayı ile değiştirilir. Google credentials, Apple sertifikaları ve özel anahtarlar GitHub'a düz metin yüklenmez.

## Native uygulama kurulana kadar iPhone'da hemen kullanılabilen yol

Safari'de https://seslen.serula.site aç → Paylaş → Ana Ekrana Ekle. Bu mevcut web/PWA'dır; native IPA ile karıştırılmamalıdır.
