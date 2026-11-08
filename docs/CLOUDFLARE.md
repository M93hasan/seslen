# Cloudflare ve Google yapılandırması

Canlı yayın kullanıcı onayından sonra yapılmalıdır. Aşağıdaki komutlar hazırlanmıştır; bu teslimatta uzak kaynak oluşturulmadı ve deploy yapılmadı.

1. Cloudflare hesabınızda Workers, D1 ve R2 kullanılabilir olmalı. R2 hesap etkinleştirmesi/ücret bilgileri gerekebilir; herhangi bir ödeme veya kaynak bu oturumda açılmadı.
2. Bilgisayarda Node 24 kurun, `server` klasöründe `npm ci` ve `npx wrangler login` çalıştırın.
3. `npx wrangler d1 create seslen` çalıştırın. Dönen database_id değerini `wrangler.jsonc` içindeki yer tutucuya yazın.
4. `npx wrangler r2 bucket create seslen-audio`. Bucket'ı public yapmayın, `r2.dev` public erişimini açmayın.
5. Google Cloud Console → Google Auth Platform: OAuth consent ekranı, gerekiyorsa test kullanıcıları, Web application OAuth client oluşturun. Redirect URI tam olarak `https://SIZIN_ADRESINIZ/auth/callback` olmalı. Ayrı Google TV OAuth akışı gerekmiyor; TV tek kullanımlık kodla eşleşir. Google hesabının `sub` kimliği sahiplik için kullanılır; e-posta adresi DB'ye kaydedilmez.
6. `wrangler.jsonc`: ORIGIN gerçek HTTPS origin (sonunda / yok), GOOGLE_CLIENT_ID gerçek client ID. Client secret için `npx wrangler secret put GOOGLE_CLIENT_SECRET` kullanın. Secret'i Git'e veya sohbete yazmayın.
7. Onaylı ortamda `npx wrangler d1 migrations apply seslen --remote`, ardından `npx wrangler deploy`. Alan adını bağlayın. İlk denemeyi test domaininde yapın. Domain/Google redirect/ORIGIN birebir aynı olmalıdır.
8. iPhone Safari'de adresi açın, Google ile giriş yapın. TV'ye aynı HTTPS adresini kaydedin. TV kodunu web'deki eşleştirme bölümüne yazın. TV “Eşleştirildi” dedikten sonra alıcıyı başlatın.

Yerel kontroller: `npm test`, `npm run check`. `npx wrangler d1 migrations apply seslen --local` ve `npx wrangler dev` ile yerel runtime kontrol edilebilir. Gerçek Google callback için HTTPS test domaini gerekir. TV uygulaması HTTP kabul etmez.

Mesajlar D1'de kalır; TV beş saniyede bir kuyruk kontrol eder. “Teslim edildi” yalnız overlay başarıyla eklendikten sonra bildirilir. OK “seen”; süre dolması “finished” (arayüzde teslim edildi); medya hatası “failed” üretir. İşlenmiş mesajlar tekrar inbox'a dönmez. Benzersiz gönderim anahtarı tekrar POST'u çoğaltmaz; farklı içerikle aynı anahtar 409 döndürür.

Saat 03:17 UTC günlük temizleme görevi 7 günden eski mesajları ve ses kayıtlarını siler. 500'den fazla eski ses varsa kalanlar sonraki günlük turda silinir; ayrıca R2 lifecycle için 7 günlük silme kuralı kurun. Böylece R2 yükleme ve D1 kayıt hatası arasındaki sahipsiz dosyalar da silinir. Ses indirme ve inbox sorguları da 7 günlük sınırı uygular. Loglarda request body/cookie/Authorization yakalama açılmamalıdır.
