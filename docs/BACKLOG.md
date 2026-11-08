# GitHub'a aktarılacak işler

GitHub oturumu ve depo oluşturma erişimi yokluğu nedeniyle Issues/PR henüz açılmadı.

- [ ] Private `M93hasan/seslen` deposu; yalnız başlangıç belgesi olan main; `develop/first-apk` kaynak dalını yükle ve taslak PR aç. PR'ı onaysız birleştirme.
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
