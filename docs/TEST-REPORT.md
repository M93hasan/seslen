# Seslen 0.2 — geliştirme doğrulaması

15 sunucu testi ve Worker dry-run yerelde geçti. Yeni kapsam: R2 olmadan D1 parçalı ses, erişim denetimi, kota/yarım yükleme temizliği, görülme başına tek push işi, izin/endpoint SSRF denetimi, ES256 VAPID doğrulaması ve başarılı telefona tekrar göndermeyen push retry kaydı. TV için 3 ek DisplayLifetime testi eklendi; toplam 8 Android birim testi CI'da doğrulanacak.

Seslen'e özel Cloudflare D1 oluşturuldu, 3 migration 23 statement olarak başarıyla uygulandı. Worker yayınlanmadı. Google yönetim sayfası bu ortamda “Site Unavailable” döndürüyor; OAuth kurulumu ve gerçek hesap/TV/iPhone/Web Push uçtan uca testleri tamamlanmış değildir. R2 etkinleştirmesi artık gerekli değildir. Otomatik uyandırma, imzalı Apple shortcut dosyası ve kalıcı release imzası önceki sınırlamalardır.

Aşağıdaki önceki 0.1 sonuçları tarihsel kayıttır; 0.2 APK hash'i olarak kullanılmamalıdır.

---

# Seslen 0.1.0-test — Test raporu

Tarih: 9 Kasım 2026 (Türkiye).

## Başarılı kontroller

| Kontrol | Sonuç |
|---|---|
| Gradle assembleDebug + testDebugUnitTest + lintDebug | BUILD SUCCESSFUL |
| Android tekrar/onay birim testleri | 5 geçti, 0 hata |
| Android lint | 0 hata, 21 uyarı |
| Sunucu API/güvenlik senaryoları | 6 geçti, 0 hata |
| Worker bundle dry-run | Başarılı; uzak yayın yapılmadı |
| D1 migration yerel uygulaması | 0001.sql başarılı |
| Üretim npm bağımlılığı audit | 0 bildirilen açık; bağımsız denetim değildir |
| JS sözdizimi (web ve Worker) | Başarılı |
| APK imzası | apksigner verify başarılı, v2 RSA 2048 debug imzası |
| Android TV manifest | Leanback launcher, touchscreen zorunlu değil, Seslen etiketi |
| SDK / ABI | min 26, target 34, compile 35; native .so yok, mimariden bağımsız |

APK boyutu: 841162 bayt.
SHA-256: `25b3a463ddd8c180ace4fdb02d2e63e7e3ca5c799112d0280ff966cf7c8e57d6`

## Testlerin kapsamı

Android testleri: varsayılan üç oynatma, ilk oynatma sırasında onay, tekrar aralığında onay, tek oynatma ayarı ve geçersiz sıfır tekrar.

Sunucu testleri: kimlik doğrulama zorunluluğu/veri doğrulama; tek kullanımlık eşleştirme ve rol sınırları; bağlantısız kalabilen kalıcı kuyruk/idempotency/seen gerilemesinin önlenmesi; hesaplar arası mesaj ve ses izolasyonu; CSRF/cihaz iptali/sender iptali/süre sonu; boyut/MIME/rate limit/saklama temizliği.

Sunucu testleri Node 24 + gerçek SQLite ile D1 benzeri adaptör ve bellek R2 adaptöründe çalışır. Uzak D1/R2 veya Cloudflare workerd entegrasyon testleri yerine geçmez.

Lint uyarıları Türkçe sabit arayüz metinleri, bilinçli senkron kuyruk kaydı, eski target API ve vector banner gibi başlıkları içerir. Uyarılar sıfırlanmış olarak raporlanmıyor. target 34 ilk sideload sürümüne aittir; yeni Android sürümlerine uyumluluk ve Play Store yayını ayrı doğrulama ister.

## Engellenen / yapılmayan doğrulamalar

- Yerel Wrangler runtime, `uv_interface_addresses ... Unknown system error 1` hatasıyla başlayamadı. Dry-run ve SQLite testleri geçti; runtime başarılı sayılmadı.
- Otomatik Chromium mobil ekran testi başlatıldı; sandbox ortamında `socket() failed: Operation not permitted` nedeniyle tarayıcı açılamadı. Görsel/mobil tarayıcı testi geçti denmiyor. Sözdizimi kontrolü bunun yerine geçmez.
- Gerçek Android TV veya emulator bağlı değil: kurulum, boot, overlay, OK odağı, Türkçe TTS, ses kaydı ve ses focus davranışı denenmedi.
- Philips 58PUS8506/62 bekleme ve otomatik uyandırma testi yapılmadı; otomatik uyandırma bu sürümde uygulanmadı. Kuyruk alternatifi var.
- Gerçek iPhone Safari, Siri ve Kestirmeler testi yapılmadı. İmzalı shortcut dosyası yok; adımlar sağlandı.
- Google OAuth gerçek hesap ve mobil ağ üzerinden uçtan uca test yapılmadı; Cloudflare/Google yapılandırması henüz yok.
- iPhone arka plan “görüldü” push bildirimi yok; web ekranında durum yenilemesi var.
- Kesinti anında oynayan sesin tam olarak bir kere fiziksel çalması garanti edilmez; ağ tekrarı kuyruğu çoğaltmaz.
- Bağımsız güvenlik denetimi, kararlı release imzası ve Releases yayını yapılmadı. GitHub Actions güncel durumu aşağıdadır.

## GitHub ve yayın — güncelleme

Özel depo ve [PR #1](https://github.com/M93hasan/seslen/pull/1) oluşturuldu. GitHub sunucu testleri ve Worker dry-run başarılı. İlk Android işi SDK kurulumunda artık bulunmayan `tools` paketi yüzünden başarısız oldu. CI ve release iş akışları `platform-tools platforms;android-35 build-tools;35.0.0` paketlerini açıkça kuracak şekilde düzeltildi; [yeni çalışma](https://github.com/M93hasan/seslen/actions/runs/42533789874) başlatıldı. Nihai sonuç ve artifact bağlantısı [Issue #2](https://github.com/M93hasan/seslen/issues/2) üzerinde takip edilir.

Cloudflare hesabı kontrol edildi: R2 etkin değil (API 10042). Google OAuth ve sunucu yayını hazırlanmış koddan ayrı kurulum adımlarıdır; [Issue #3](https://github.com/M93hasan/seslen/issues/3). Gerçek cihaz testleri ve canlı yayın yapılmadı; main değiştirilmedi. Yukarıdaki APK hash'i ilk yerel teslimata aittir; Actions APK'sı farklı debug imzası/hash içerebilir.

