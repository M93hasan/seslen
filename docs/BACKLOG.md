# Seslen — kalan işler

Kaynak aktarımı tamamlandı: [PR #1](https://github.com/M93hasan/seslen/pull/1). Güncel kabul listesi [Issue #2](https://github.com/M93hasan/seslen/issues/2), sunucu kurulum engelleri [Issue #3](https://github.com/M93hasan/seslen/issues/3) üzerinden takip edilir.

- [x] Private `M93hasan/seslen` deposu; yalnız başlangıç belgesi olan main; `develop/first-apk` kaynak dalını yükle ve taslak PR aç. PR'ı onaysız birleştirme.
- [ ] Actions kontrollerini gerçek GitHub ortamında çalıştır; APK artifact erişimini doğrula.
- [ ] Google web OAuth client ve test Cloudflare kaynaklarını yapılandır; onaydan sonra test yayını.
- [ ] Philips gerçek cihaz APK kurulumu, Android sürümü ve overlay odağı/OK testi.
- [ ] TV boot, standby bağlantısı, WoWLAN/Chromecast ile uyandırma araştırmasının gerçek cihaz deneyi. Gerekirse aynı ev ağında açık bir cihaz üzerinden yetkilendirilmiş relay tasarla.
- [ ] Gerçek mobil internet/iPhone Siri/Kestirmeler ve ses kaydı testleri.
- [ ] “Görüldü” arka plan web push bildirimi.
- [ ] Android emulator/instrumentation ve görsel kontroller; uzun mesaj, kuyruk, TTL, TTS eksikliği, medya hatası ve reboot senaryoları.
- [ ] Kill anındaki tekrarların ürün kararı: aynı mesajın oynatma ortasında çökmesi sonrası yeniden başlatılma ihtimali görünür raporlansın; tam olarak bir kez fiziksel seslendirme iddia edilmesin.
- [ ] Ses/mikrofon erişiminde hata deneyimini iyileştir; çevrimdışı iPhone gönderim outbox'ı ve kullanıcı kontrollü ses önizleme ekle.
- [ ] Yayın öncesi bağımsız güvenlik incelemesi, kullanıcı bazında toplam mesaj/ses kota sınırı ve ek spam koruması.
- [ ] Kalıcı APK release imzası ve GitHub production reviewer koruması; onaydan sonra stable tag ve Release.


## 0.2 güncellemesi

- [x] R2 zorunluluğunu kaldıran, erişim kontrollü D1 ses backend'i ve migration.
- [x] Ses boyutu/depolama/günlük yükleme ve mesaj kotaları.
- [x] iPhone kayıt önizlemesi ve ayrı gönderme düğmesi.
- [x] Görüldü Web Push kaynak kodu, PWA/service worker, VAPID ve kalıcı tekrar kuyruğu.
- [x] Uzun ses/metin üç tekrar bitmeden kapanmaz; odak verilmezse ses başlamaz; bitişte kuyruk/outbox tek yazımda kaydedilir.
- [x] Seslen'e özel test D1 ve 0001–0003 migration'ları hazır.
- [ ] Google OAuth hesap kurulumu: yönetim sayfasına bu ortamdan erişilemiyor.
- [ ] Google/VAPID secrets ile onaylı test yayını ve gerçek cihaz kabul testleri.

Yukarıdaki önceki maddeler içinde R2 gerekliliği ve “push kodu yok” notları bu güncellemeyle aşılmıştır. Kodun bulunması gerçek TV/iPhone testinin geçtiği anlamına gelmez.
