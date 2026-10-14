# ClipBridge — ilk okuyun

**1.2.1 deneysel test paketi. Temiz Windows/iPhone kurulum ve aktarım kabulü
tamamlanmadı. Kurucu imzasızdır; kararlı sürüm değildir.**

1. Temiz Windows x64 bilgisayar/hesap kullanın: güncel ve desteklenen Windows 11
   veya Windows 10 build 19045+. Mevcut ClipBridge/PanoKopru programı veya verisinin
   üzerine kurulmaz. WebView2 Evergreen Runtime gerekir; eksikse kurucu Microsoft
   indirme sayfasını açabilir. Node paket içindedir.
2. ZIP'in SHA-256 değerini teslim kaydıyla karşılaştırın. **ZIP'in tamamını**
   yerel bir klasöre çıkarın: `ClipBridgeSetup.exe`, `payload/`, `READ-ME-FIRST.md`
   ve `READ-ME-FIRST.tr.md`. **EXE tek başına kullanılamaz.** ZIP içinden çalıştırmayın,
   payload dosyalarını silmeyin/değiştirmeyin. Kurucuyu normal kullanıcı olarak
   açın; oturum açılışında başlatma isteğe bağlıdır ve başlangıçta kapalıdır.
   Beklenmedik uyarıları aşmak için güvenlik korumalarını kapatmayın.
3. Uygulamayı açın; Ayarlar → Dil üzerinden Türkçe/English seçin. İlk kurulumda
   kontrolünüzdeki ağı seçin. Windows izni yönetici onayı ister ve ağı Özel yapar;
   diğer uygulamaların mevcut Özel ağ kuralları da etkinleşebilir.
4. iPhone'da geçici bağlantıdan public CA sertifikasını alın. İki cihazda görünen
   parmak izini bağımsız karşılaştırın, profili yükleyin ve sertifikaya tam güveni
   açıkça etkinleştirin. Kök güveni bu uygulamadan daha geniştir. TLS hatalarını
   atlamayın; eşleştirme QR'ını/anahtarı paylaşmayın.
5. HTTPS eşleştirmesini tamamlayın. Kendi adresiniz ve anahtarınızla gönder/al
   kestirmelerini oluşturun: [Kestirme rehberi](https://github.com/LionKing53/ClipBridge/blob/main/docs/SHORTCUTS.md),
   [ayrıntılı Türkçe kurulum](https://github.com/LionKing53/ClipBridge/blob/main/docs/QUICKSTART.tr.md).
   Rehberler eşleşen kaynak ZIP'inde `application/docs` altında da bulunur.
   İki yönde örnek metin, küçük fotoğraf ve PDF deneyin.

Yerel kullanım Tailscale gerektirmez. Uzaktan kullanımın Tailscale kestirmeleri
ayrıdır; **yol seçimi manueldir**, otomatik iPhone pano eşitlemesi yoktur.
Gelen dosya/video sınırı 512 MiB, metin/görsel işleme sınırı 64 MiB'dir.

Ağı listeden çıkarmak yalnız uygulama güvenini kaldırır; Windows profilini geri
çevirmez veya firewall kurallarını silmez. İzin temizliği ayrı yönetici onayıyla
yalnız sahip olunan kuralları kaldırır; ağ profili ve Tailscale ayarları korunur.

Çıkarılmış kurucu ve payload'ı saklayın. Kaldırmak için aynı sürümün kurucusunu
açıp **Kaldır (veriler korunur)** seçin. Sahip olunan program/kısayol/firewall
dosyaları kaldırılır; kişisel veri ve Windows CA kimliği korunur. Firewall onayı
iptal edilirse program kalır. iPhone'da yalnız bu uygulamanın sertifika profilini
elle kaldırın. Korunan veriler aynı hesapta tekrar temiz kurulumu engeller.
Otomatik güncelleme, üretim geri alma ve eski veri göçü dahil değildir.

Lisanslar ve eşleşen kaynak paketi bilgisi: `payload/licenses`.
`ClipBridge-1.2.1-sources.zip` binary ile aynı indirme yerinde sunulur;
yeniden derlemek içindir, kurucuyu başlatmak için gerekmez. Sorunda sürüm/hash ve
hassas bilgi içermeyen hata kodunu bildirin; [sorun giderme](https://github.com/LionKing53/ClipBridge/blob/main/docs/TROUBLESHOOTING.md).
