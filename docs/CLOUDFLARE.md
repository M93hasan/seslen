# Seslen 0.2 — sunucu kurulumu

Seslen'e özel `seslen-staging` D1 veritabanı oluşturuldu ve 0001–0003 şemaları uygulandı. Diğer Serula/PARA veritabanları kullanılmaz. `server/wrangler.jsonc` bu test kaynağına bağlıdır. Worker henüz yayınlanmadı.

## R2 artık zorunlu değil

Varsayılan `AUDIO_BACKEND=d1`: kayıtlar özel D1 BLOB parçalarında saklanır. Tek kayıt 5 MiB, kullanıcı başına 20 MiB, toplam 100 MiB ve kullanıcı başına günde 100 ses yükleme sınırı vardır. Mesaj gönderimi kullanıcı başına günde 500 ile sınırlıdır. Erişim yetkileri aynı kalır; dosyalar public değildir. Kayıtlar 7 gün sonra temizlenir. D1 kullanım kotaları yine geçerlidir; sınırsız kullanım/ücretsiz çalışma garantisi verilmez.

R2 kullanılacaksa ayrıca bucket etkinleştirip oluşturun; binding `AUDIO`, vars `AUDIO_BACKEND=r2` ve 7 günlük lifecycle kuralı ekleyin. Mevcut D1 kayıtları backend değişince okunmaya devam eder. R2'yi açmak için bu sürümde işlem yapmanız gerekmiyor.

## Google OAuth — kalan hesap kurulumu

1. Google Cloud Console → Google Auth Platform bölümünde **Seslen** için Web application client oluşturun; gerekiyorsa onay ekranı ve test kullanıcılarını ayarlayın.
2. Planlanan HTTPS origin: `https://seslen-staging.m93hasan.workers.dev`.
3. Redirect URI: `https://seslen-staging.m93hasan.workers.dev/auth/callback`.
4. `wrangler.jsonc` içindeki `GOOGLE_CLIENT_ID` yer tutucusunu client ID ile değiştirin.
5. `cd server`, `npm ci`, `npx wrangler login`, `npx wrangler secret put GOOGLE_CLIENT_SECRET`. Secret'i Git'e veya sohbete yazmayın.

Google yönetim sayfasına geliştirme ortamının tarayıcısından erişilemedi (“Site Unavailable”); bu hesap işlemi tamamlanmış sayılmıyor. Client secret olmadan giriş endpoint'i kapalı kalır; sahte giriş veya kimlik doğrulama atlama yoktur.

## Arka plan görüldü bildirimi

```sh
cd server
node scripts/prepare-vapid.mjs
npx wrangler secret put VAPID_PRIVATE_JWK < .secrets/vapid-private.json
npx wrangler secret put VAPID_PUBLIC_KEY < .secrets/vapid-public.txt
```

Script mevcut anahtarı korur; özel anahtar ekrana yazılmaz ve `.secrets/` Git tarafından dışlanır. Anahtarı güvende yedekleyin; anahtar değişirse iPhone'ların yeniden abone olması gerekir. Bu komutlar Worker secret yapılandırmasıdır; yayın/onay aşamasında çalıştırılmalıdır.

## Yayın ve kontrol

Kullanıcı onayından sonra `npx wrangler d1 migrations apply seslen-staging --remote` (uygulanmış migration'lar atlanır), ardından `npx wrangler deploy`. D1 migration kayıtları oluşturulmuştur. Google callback origin, ORIGIN ve gerçek yayın adresi birebir aynı olmalıdır. Test yayını için de kimlik doğrulama açık tutulur.

`npm test` API, kotalar, erişim denetimi, push kuyruğu, kriptografik VAPID ve tekrar denemeleri test eder. `npm run check` Worker bundle dry-run'dır; yayın değildir. Gerçek Google, push sağlayıcısı, mobil internet ve Philips TV testleri ayrıca gerekir.

TV beş saniyede bir kuyruk kontrol eder; mesajlar 7 güne kadar saklanır. Görüntüleme “Teslim edildi”, yalnız kumanda onayı “Görüldü” üretir. Push bildiriminde mesaj içeriği bulunmaz. Kalıcı bildirim kuyruğu ve geri çekilerek 5 deneme vardır; sağlayıcıya kabul, telefonda görünme garantisi değildir. Her dakikada işlenen sınırlı kuyruk/temizleme cron'u vardır.
