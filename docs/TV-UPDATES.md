# Seslen TV — güvenli, ZIP'siz güncelleme kanalı

## Durum (9 Kasım 2026)

Bu dal TV'nin yeni bir **onaylanmış kararlı** sürümü bulmasını, sürüm bildirimi göstermesini, APK'yı doğrudan Seslen'in HTTPS adresinden indirip doğrulamasını ve Android'in sistem kurulum işlemini başlatmasını uygular. **İlk kararlı paket, kalıcı imza ve CDN yayını hazır değilse güncelleme sunulmaz.** Mevcut kurulu test sürümü kendiliğinden değiştirilmez. TV gerçek cihaz kabul testi henüz yapılmadı.

- Manifest: \`https://seslen.serula.site/updates/stable.json\`
- Doğrudan APK: \`https://seslen.serula.site/updates/Seslen.apk\`
- APK paket adı: \`site.serula.seslen\`
- Manifest alanları: \`versionCode\`, \`versionName\`, \`apkUrl\`, \`sha256\`, \`sizeBytes\`
- Kararlı sürüm adı biçimi: \`1.0.0\` gibi yalnız üç noktalı rakam; \`*-test\` yayımlanmaz.
- Dosya üst sınırı: 25 MiB; cihazda URL, SHA-256, dosya boyutu, paket kimliği, artan \`versionCode\` ve mevcut kurulumun APK imzası karşılaştırılır. Hata olursa çalışan kurulum korunur.

## TV akışı

1. TV alıcısı açıkken, ilk 1 dakikadan sonra ve ardından 6 saatte bir HTTPS manifest'i kontrol eder. Yalnız daha yeni, biçimi geçerli bir kararlı sürüm görürse Android bildirimi üretir. Bildirim izinleri kısıtlıysa yeni sürüm uygulama ekranı açıldığında görülebilir.
2. TV'de Seslen açılınca sürüm kontrolü yapılır. Yeni sürüm varsa **Yeni sürüm ... · Güncelle** butonu görünür.
3. Kullanıcı Güncelle dediğinde APK indirilir, SHA-256 ve uygulama imzası doğrulanır. Android izin gerekiyorsa **Bu kaynaktan uygulama yükleme** sistem ekranı açılır.
4. Sistem uygun bulursa PackageInstaller kendi güncellemeyi uygular; kurulum onayı zorunluysa TV kumandasından sistem onayı gerekir. İmza uyuşmazlığı, eski sürüm, hata, kesinti, bozuk dosya kurulmaz.

### Önemli Android sınırları

Android'in \`PackageInstaller\` API'si her koşulda sessiz kurulum sunmaz. Özellikle sideload ile kurulmuş debug APK'nın ilk kararlı sürüme geçişinde **farklı imza varsa yerinde güncelleme mümkün değildir**. İlk kez kalıcı üretim imzasıyla kurulum yapılması gerekebilir; bundan sonraki üretim sürümleri hep aynı anahtarla imzalanmalıdır. Eski test APK'nın üzerine farklı imza yükleyip mevcut veriler korunur diye iddia edilmez.

\`REQUEST_INSTALL_PACKAGES\` yüksek riskli izin olduğu için bu proje Play Store'a çıkarılırsa Google Play politikası ayrıca değerlendirilmelidir. Bu yol Play Store dışında, TV'de kullanıcının istediği kurulum akışı içindir. Sessiz kurulum cihazın Android sürümü ve installer/updater yetkilerine bağlıdır.

## Onaylı kararlı APK yayınlama

Mevcut \`.github/workflows/release.yml\` yalnız manuel \`workflow_dispatch\` ile, \`main\` üzerinde **önceden onaylanmış bir tag** ve \`production\` environment kullanılarak çalışır. GitHub environment'ında gerekli **reviewer korumasının gerçekten etkin olduğundan emin olunmalıdır**. Kodun kendisi bu korumayı oluşturmaz.

Önkoşullar:
1. TV/Worker kodu test edilmiş, kullanıcının açık onayıyla \`main\` dalına alınmış olmalıdır.
2. \`versionCode\` her sürümde önceki kararlı APK'nın sürümünden büyük olmalıdır; \`versionName\` \`X.Y.Z\` biçimindedir.
3. Sabit bir Android keystore güvenle yedeklenir; aşağıdaki GitHub Secrets yalnız yetkili kurulum/cihaz sahibi tarafından oluşturulup korunan ortamda saklanır: \`ANDROID_KEYSTORE_BASE64\`, \`ANDROID_STORE_PASSWORD\`, \`ANDROID_KEY_PASSWORD\`, \`ANDROID_KEY_ALIAS\`. Secret değeri issue/README içine yazılmaz.
4. Cloudflare Worker'a **yalnız onaylı yayın** için erişim gerektiğinde ek GitHub secrets: \`CLOUDFLARE_API_TOKEN\`, \`CLOUDFLARE_ACCOUNT_ID\`. Hesabın diğer Serula/PARA servislerine erişecek geniş kapsamlı token kullanmayın.
5. Google ve TV'nin mevcut çalışan Worker sürümü ile yayın için seçilen tag karşılaştırılır: Worker deploy, uygulama backend'ini de yeniden yayımlar; yanlış tag geri alma yapabilir. Kasıtsız rollback önlenmeden \`publish_tv_update=true\` seçilmemelidir.
6. GitHub Actions'ta \`Approved stable APK release\` → onaylı tag → \`publish_tv_update\` kutusu işaretlenerek, korunan ortam onaylandıktan sonra çalıştırılır. Varsayılan **false** güvenli davranıştır.

Akış: unsigned release oluştur → kalıcı imzayla \`seslen.apk\` üret → \`apksigner verify\` → Node script'i \`iphone/updates/Seslen.apk\` ve \`stable.json\` oluşturur → GitHub Release asset'i hazırlar → **onaylı seçeneğe bağlı olarak** Cloudflare Workers statik varlığına direkt APK ve metadata yüklenir. Özel GitHub Actions ZIP artifact'i otomatik güncelleme kaynağı değildir. \`wrangler\` kaynakları doğrulanmadan üretime dağıtım yapılmaz.

**Kaynak notu:** İleride staging/Worker farklı daldan yeniden deploy edilirse statik varlıkların kaybolmaması için deploy sürecine bu imzalı dosyaların korunması ve sürüm bütünlüğü kontrolü eklenmelidir. En güvenli uzun vadeli seçenek, sabit bir sürüm deposu/CDN ve bağımsız yayımlama kanalına geçmektir. Bu aşamada canlı yayına dokunulmadı.

## Test planı

- [x] Sürüm/URL/hash/boyut politikasının JVM birim testleri eklendi.
- [x] APK manifest üretim script'i için Node testleri eklendi.
- [ ] GitHub Android build + lint, Node test + Worker dry-run tam geçişi.
- [ ] Onaylı release imzası ve korunan production environment yapılandırması.
- [ ] ZIP'siz, doğrudan yayınlanan bir üretim APK'sı ve manifest'inin gerçek Cloudflare üzerinden HTTP 200/Content-Type/boyut/hash testi.
- [ ] Philips TV'de güncelleme butonu, Android unknown-app-source izni, PackageInstaller onayı, ağ kesintisi ve bozuk APK davranışı.
- [ ] Önceki Google oturumunun/TV eşleşmesinin aynı imzalı sürüm yükseltmesinde korunduğunun kontrolü.
- [ ] TV'nin beklemede olduğu durumda kontrolün Android tarafından durdurulup durdurulmadığı.

[Resmî Android PackageInstaller belgesi](https://developer.android.com/reference/android/content/pm/PackageInstaller) · [Android imzalama](https://developer.android.com/studio/publish/app-signing).
