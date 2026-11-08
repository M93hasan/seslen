# Güvenlik incelemesi — ilk sürüm

Bu belge geliştirme sırasında yapılan iç incelemedir; bağımsız güvenlik denetimi değildir.

## Uygulananlar

- Google OAuth authorization code, PKCE S256, HttpOnly/Secure/SameSite cookie, tarayıcıya bağlı tek kullanımlık state, nonce, JOSE ile imza/issuer/audience/expiry doğrulaması.
- Kullanıcı sahipliği Google `sub` üzerinden; oturum, sender ve TV rolleri ayrı. Cihaz eşleştirme onayı yalnız browser rolünde.
- 48 bit tek kullanımlık eşleştirme kodu, 256 bit polling sırrı, 6 dakika geçerlilik; token yalnız bir kez poll ile döner. Poll yanıtı kaybolursa yeniden eşleştirme gerekir.
- Sunucu DB'sinde oturum/cihaz anahtarlarının SHA-256 özetleri; Android cihaz anahtarı Android Keystore AES-GCM ile şifrelenmiş. Pair tablosunda teslimi bekleyen açık token kısa süreli tutulur, teslim/expiry sonrası silinir.
- TV'nin erişimi yalnız kendi inbox ve mesajlarına bağlı seslere; gönderenin erişimi yalnız kendi hesabının cihazlarına/mesajlarına/seslerine.
- Cihaz iptali anında sonraki API isteğinde uygulanır. Tüm sender anahtarları iptal edilebilir. Browser oturumu logout ile DB'den kaldırılır.
- D1 parametreli SQL; mesaj kimliği ve unique idempotency key; durumun “seen”den “delivered”a gerilemesi engellenir.
- 4.000 karakter metin; 16 KB JSON; 5 MB ses; MIME allowlist; özel R2. İstemci dış ses URL'si gönderemez.
- Cookie ile mutasyonlarda Origin kontrolü; bearer API CORS izni vermez. UI metni textContent kullanır; CSP inline script ve framing'i engeller.
- HTTPS zorunlu; APK cleartext kapalı; API ve medya redirect takibi kapalı.
- IP/path/dakika başına 60 istek; süreli kayıt temizliği. İçerik, token ve cookie uygulama loglarına yazılmaz.

## Açık sınırlamalar

- Google gerçek hesap akışı, TLS uçtan uca ve Cloudflare uzak erişimi henüz test edilmedi.
- Toplam kullanıcı bazlı depolama/gönderim kotası, gelişmiş abuse kontrolleri ve bağımsız inceleme kararlı yayından önce tamamlanmalı.
- MIME kontrolü dosyanın gerçek bir ses olduğunu kanıtlamaz; Android medya çözücüsü oynatamazsa failed üretir. Transcoding/antivirus yoktur.
- Mesaj içerikleri TV uygulamasının özel dizininde kalıcıdır; cihaz anahtarı dışında mesajlar için uygulama düzeyi disk şifrelemesi yapılmadı. Android cihaz şifrelemesi/hesap güvenliği ayrıca önemlidir. Root/ADB erişimi olan cihaz tehdit modelinde güvenilir sayılır. ADB 5555'i internete açmayın.
- Sunucuda şifreleme sağlayıcı yönetimindedir; uçtan uca şifreleme uygulanmadı.
- Android boot/foreground ve overlay politikaları üretici/OS sürümüne göre değişir. Servis özel kullanım (specialUse) olarak bildirilir; Play Store yayını hedeflenmedi ve mağaza incelemesi yapılmadı.
- R2 lifecycle kuralı ayrıca kurulmalıdır. Günlük cleanup tek başına yükleme ile SQL yazımı arasındaki sahipsiz objeleri bulamaz.
- TV/medya aniden kapanırsa oynatma kaldığı saniyeden devam etmez; mesaj yeniden başlatılabilir. Kesinti boyunca fiziksel seslendirmeye “tam olarak bir kez” garantisi yoktur. Ağ polling tekrarları aynı local kuyruğu çoğaltmaz.
