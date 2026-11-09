# iPhone ve Siri

Sunucu yayınlandıktan sonra Safari'de kendi Seslen adresinizi açın → Google giriş → TV kodunu eşleştir. Paylaş → Ana Ekrana Ekle ile hızlı erişim oluşturabilirsiniz. Metin kutusunda iOS klavyesinin mikrofonu konuşmayı yazıya dönüştürür. “Ses kaydet” mikrofon izni ister; “Bitir ve gönder” ses kaydını gönderir. 60 saniyede otomatik durur ve gönderir. Safari gerçek cihaz testi yapılmadı.

## Kestirmeler için hazırlık

Web'de “Bağlantı ve güvenlik” → “Kestirmeler için 30 günlük anahtar oluştur”. Bu anahtarı kendi Kestirmeler uygulamanızda saklayın; paylaşmayın. TV cihaz kimliğini şu istekten alın:

- URL: `https://SIZIN_ADRESINIZ/api/devices`
- Yöntem: GET
- Başlık: `Authorization` = `Bearer ANAHTAR`
- Yanıtta `devices` listesindeki TV'nin `id` değerini alın.

Anahtar 30 gün geçerli; iptal için web'deki “Kestirme anahtarlarını iptal et”. TV erişimi ayrıca iptal edilebilir.

## 1. “Seslen yazı gönder”

Apple Kestirmeler'de yeni kestirme oluşturun:

1. **Girdi İste** → Metin, soru “Televizyona ne göndereyim?”
2. **UUID Oluştur** (bu işlem adı sürüme/dile göre UUID olarak bulunabilir).
3. **URL'nin İçeriğini Al** → `https://SIZIN_ADRESINIZ/api/messages`; POST; başlık `Authorization: Bearer ANAHTAR`; istek gövdesi JSON.
4. JSON alanları: `device` (TV id), `text` (istenen metin), `key` (UUID). Aynı gönderimi yeniden deniyorsanız UUID'yi değiştirmeyin.
5. Yanıttaki `id` ve `status` değerlerini **Sonucu Göster** ile görüntüleyin.

## 2. “Seslen konuş”

Birinci kestirmeyi çoğaltın; ilk adımı **Metni Dikte Et** (Türkçe) olarak değiştirin. `text` alanında dikte sonucunu kullanın. “Hey Siri, Seslen konuş” ile çağırın. Dikte'nin Siri/kilit ekranı izinlerini iPhone'da kontrol edin.

## 3. “Seslen ses gönder”

1. **Ses Kaydet** → dokununca başla / dokununca bitir. En fazla 60 saniye kayıt önerilir.
2. **URL'nin İçeriğini Al** → `https://SIZIN_ADRESINIZ/api/audio`; POST; Authorization aynı; Content-Type `audio/mp4`; gövde **Dosya**, kaydedilen M4A ses dosyası. JSON veya multipart kullanmayın.
3. Yanıttan **Sözlük Değerini Al** → `audio` değerini saklayın.
4. **UUID Oluştur**.
5. `/api/messages` adresine JSON POST: `device` TV id, `audio` önceki audio kimliği, `text` isteğe bağlı “Sesli mesaj”, `key` UUID.
6. Sonucu gösterin.

Bu teslimat imzalı `.shortcut` / iCloud kurulum bağlantısı içermez; Apple cihazında bu adımlarla oluşturulmalıdır. Kestirmeler ve Siri gerçek iPhone'da henüz doğrulanmadı. Web ekranındaki durum listesi beş saniyede yenilenir. Safari kapalıyken “görüldü” için arka plan push bildirimi bu sürümde yoktur; bu özellik ayrı iştir. Görüldü durumunu web'i açarak veya GET `/api/messages` isteğiyle kontrol edebilirsiniz.


## 0.2 güncellemesi: kayıt önizleme ve arka plan bildirimi

Önceki sürümün otomatik ses gönderme davranışı değişti: **Ses kaydet → Kaydı bitir → dinle → Dinlediğim ses kaydını gönder**. Ses kaydı bitince kendiliğinden gönderilmez.

Arka plan “Görüldü” bildirimi kodu eklendi. Sunucu Google/VAPID yapılandırması ve yayın tamamlandıktan sonra:

1. Safari'de Seslen'i açıp Google hesabınızla giriş yapın.
2. Paylaş → Ana Ekrana Ekle. Ana ekrandaki Seslen ikonundan açın.
3. Bu uygulama penceresinde gerekiyorsa Google ile yeniden giriş yapın.
4. Bağlantı ve güvenlik → **Görüldü bildirimlerini aç** → izin verin.
5. TV'de bir mesajı OK ile onaylayın; iPhone'a “Mesaj görüldü” bildirimi gelmelidir. Bildirime dokununca kimlik doğrulamalı mesaj geçmişi açılır.

iOS 16.4+ Ana Ekran web uygulaması ve kullanıcı tarafından verilen bildirim izni gerekir. Gerçek iPhone/push sağlayıcısı henüz test edilmedi. Bildirim sağlayıcıları Apple/Google/Mozilla ile sınırlıdır; telefon çevrimdışıysa sağlayıcı teslimi geciktirebilir. Çıkış yapınca ilgili oturumun sunucu push abonelikleri kaldırılır. “Bu cihazın bildirimlerini kapat” ile ayrıca iptal edebilirsiniz.

Bu bölüm önceki “arka plan push yok” notunun yerini alır. İmzalı Apple `.shortcut` dosyası hâlâ üretilmedi; yukarıdaki Kestirmeler adımları kullanılabilir.

Kaynak: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
