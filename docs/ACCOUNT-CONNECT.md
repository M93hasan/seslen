# Seslen 0.3 — Google hesabıyla TV bağlantısı

TV uygulaması sunucu adresiyle hazır gelir. Google hesabıyla bağlan düğmesi geçici ve tek kullanımlık TV oturumu için bir QR üretir. iPhone kamerası QR'ı açar; kullanıcı mevcut web OAuth istemcisiyle Google'a giriş yapıp ekrandaki TV kodunu kontrol ederek bağlantıyı açıkça onaylar. TV aynı Google hesabının cihaz listesine eklenir. E-posta yazmak veya TV'deki Google hesabını izinsiz okumak kimlik doğrulama sayılmaz.

Bu sürüm Android TV'nin sistem Google hesap seçicisini kullanmaz. Google doğrulaması telefondaki tarayıcıda yapılır. Yeni bir TV OAuth istemcisi veya TV'de şifre girişi gerekmez. QR'ın süresi 6 dakikadır; telefonla onay sonrasında TV token'ı yalnız poll sırrını bilen TV'ye bir defa verilir. Eski APK'nın manuel kod akışı korunur.

Web: giriş ekranı ve mesaj paneli ayrılır; hesap/TV durumu, metin/ses sekmeleri, hazır mesajlar, gönderim geçmişi, kayıt önizlemesi ve hata durumları gösterilir. Oturum ve cihaz yokken gönderim kapalıdır. Ayarlar ayrı, açılır bir bölümdedir. Web ve TV koyu yeşil/krem renklerle aynı kimliği kullanır; kumanda odağı yüksek kontrastlıdır.

Gerekli migration: `0004_account_connect.sql`. OAuth tamamlanınca doğrulanmış e-posta görüntüleme için kaydedilir; cihaz sahipliği değişmeyen Google `sub` kimliğiyle belirlenir. Var olan oturumlarda e-posta boş görünürse çıkış/giriş günceller. Şifre, Google client secret veya Google token'ları APK'ya eklenmez.

TV arka plan gösterimi için Android'in ekran üstü izni hâlâ gereklidir; uygulama izin ekranını açar ve geri dönünce alıcıyı başlatır. Standby uyandırma garantisi yoktur; gerçek Philips cihazında ayrıca doğrulanmalıdır.
