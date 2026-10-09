# PanoKöprü 1.1.0 — özel kabul testi / private acceptance test

[English setup guide](QUICKSTART.md)

Bu paket genel yayın değildir. Gerçek Windows/iPhone kabulü ve sharp/libvips
dağıtım incelemesi henüz tamamlanmadı. Paketi testiniz için kullanın; henüz
başkalarına dağıtmayın. Kaynak ve kurucu imzalı değildir. Beklenmedik güvenlik
uyarısında korumaları kapatmayın; dosyanın SHA-256 özetini teslim kaydıyla
karşılaştırın ve durumu bildirin.

## Türkçe — hazırlık ve kurulum

1. Mevcut çalışan PanoKöprü kurulumunuzun **olmadığı** bilgisayarı kullanın.
   İlk hedef Windows 11 veya Windows 10 22H2 (build 19045+) Intel/AMD **x64**.
   ARM64/32-bit desteklenmez. Bu, bütün Windows sürümlerinin güvenlik desteğinin
   sürdüğü anlamına gelmez; işletim sisteminizi güncel ve destekli tutun.
   Yönlendirilmiş kullanıcı profilleri ilk pakette desteklenmez.
2. ZIP'in **tamamını** yerel bir klasöre çıkarın. ZIP içinden çalıştırmayın;
   `PanoKopruSetup.exe` ile `payload` klasörü yan yana kalmalı.
3. `PanoKopruSetup.exe` dosyasını normal kullanıcı olarak açın; **Yönetici olarak
   çalıştır** kullanmayın. Gerekirse kurucunun WebView2 düğmesiyle Microsoft'un
   resmi sayfasından x64 Evergreen Runtime kurup kurucuyu yeniden açın. Node
   pakette bulunur; Node veya Tailscale kurmanız gerekmez.
4. Açıklamayı okuyup onaylayın ve ilk kurulumu başlatın. Başlangıçta çalışma
   isteğe bağlı ve varsayılan kapalıdır. Mevcut program **veya veri** varsa
   kurucu durur; üzerine kurma, otomatik güncelleme ve eski veri göçü yoktur.
5. Başlat menüsünden PanoKöprü'yü açın. Program ile kişisel veriler ayrıdır:
   `%LOCALAPPDATA%/Programs/PanoKopru` ve `%LOCALAPPDATA%/PanoKopru`.

## İlk iPhone eşleştirmesi — Tailscale gerekmez

1. Bilgisayar ve iPhone'u aynı güvenilir ev ağına bağlayın. Misafir ağında cihaz
   yalıtımı, mDNS engeli veya kurumsal ağ politikası bağlantıyı önleyebilir.
2. Uygulamadaki ilk kurulum sihirbazından bağlı ağı seçin. Windows izinleri için
   UAC onayını verin. Bu işlem ağı **Özel** profile geçirir; başka uygulamaların
   mevcut Özel profil kurallarını da etkileyebilir. Ortak/üniversite ağını sırf
   testi geçirmek için güvenilir yapmayın. İptal ederseniz sihirbazdan tekrar
   başlayabilir veya verilmiş PanoKöprü izinlerini temizleyebilirsiniz.
3. Sihirbazın süreli sertifika QR bağlantısını iPhone'da açın. Bu ilk HTTP
   bağlantısı yalnız **açık CA sertifikasını** taşır; pano veya erişim anahtarını
   taşımamalıdır. Sertifika parmak izini bilgisayardaki değerle karşılaştırın;
   eşleşmiyorsa devam etmeyin. TLS hatasını yok saymayın.
4. iPhone Ayarlar'da indirilen profili yükleyin (Genel → VPN ve Aygıt Yönetimi).
   Ardından Genel → Hakkında → Sertifika Güven Ayarları'nda bu PanoKöprü köküne
   tam güveni elle açın. Ekran adları dil/sürüme göre değişebilir. Kök güveni
   yalnız bu uygulamaya özel bir izin değildir; bu CA'nın imzaladığı sertifikalara
   güven verir. Tanımadığınız profilleri yüklemeyin.
5. Sihirbazda tamamlandığını doğrulayın. Yerel HTTPS eşleştirme ekranının
   **kendi adresinizi ve anahtarınızı** gösterdiğini kontrol edin. Sır içeren QR
   veya başlık ekranlarını paylaşmayın.
6. [Kestirme rehberindeki](SHORTCUTS.md) iki yerel kestirmeyi oluşturun. Paketin
   kökündeki bu kopyayı okuyorsanız rehber `payload/source/docs/SHORTCUTS.md`
   konumundadır. iPhone → Windows **POST**, Windows → iPhone iki **GET** kullanır.
   Her istekte kendi Authorization başlığınız gerekir. Hazır/imzalı kestirme
   paketi yoktur; rehberle elle kurulur. Tailscale kestirmeleri ayrı ve isteğe bağlıdır.

## Temel kabul listesi

Sırayla deneyin; hata olursa tam hata kodunu ve hangi adımda olduğunu bildirin.
Anahtar, gerçek pano içeriği veya kişisel dosya yolu içeren görüntü paylaşmayın.

- [ ] Temiz kurulum ve ilk açılış başarılı.
- [ ] İlk UAC isteğini iptal edip tekrar başlatma başarılı.
- [ ] Yarım ilk kurulumda Windows izinlerini temizleme ve tekrar başlama başarılı.
- [ ] Tailscale kapalıyken sertifika/eşleştirme tamamlandı.
- [ ] İki yönde `Deneme: çğıöşü ÇĞİÖŞÜ` metni doğru yapışıyor.
- [ ] İki yönde küçük bir JPEG/PNG fotoğraf ve sentetik PDF aktarılıyor.
- [ ] Windows'a gelen dosya masaüstüne yapışıyor; iPhone'a gelen fotoğraf
      Fotoğraflar'a, PDF seçilen Dosyalar konumuna kaydoluyor.
- [ ] Uygulamayı tepsi menüsünden tamamen durdurup tekrar açınca aktarım çalışıyor.
- [ ] Aşağıdaki kaldırma yolu başarılı; veriler korunuyor.

Ek hata kontrolü: UAC beklerken/aktarım sırasında tam çıkış isteği verin; devam
eden işlem güvenli biçimde sonlanmalı ve hizmet kendiliğinden yeniden açılmamalı.
Kapanış bekleyen UAC'yi cevaplamanızı gerektirebilir. Takılırsa işlemleri elle
öldürmek veya kurulum klasörünü silmek yerine hata durumunu bildirin.

Test kaydı: Windows sürümü/mimarisi, paket sürümü ve SHA-256, geçen/kalan maddeler,
hata kodu. Bu liste doldurulmadan gerçek cihaz kabulü geçti sayılmaz.

## Güvenli kaldırma

Çıkardığınız **aynı sürümün** `PanoKopruSetup.exe` dosyasını tekrar açıp
**Kaldır (veriler korunur)** seçin. Uygulama durdurulur; yalnız sahipliği doğrulanan
program dosyaları, kısayollar/başlangıç kısayolu ve PanoKöprü firewall izinleri
temizlenir. Firewall temizliği UAC ister; iptalde program silinmez.
Windows ağ profili ve Tailscale değiştirilmez. Kullanıcı verileri ve Windows CA
kimliği silinmez. iPhone'da Genel → VPN ve Aygıt Yönetimi'nden yalnız bu kurulumun
PanoKöprü sertifika profilini ayrıca kaldırın.

Korunan veriler bulunduğundan ilk-kurulum kurucusu aynı kullanıcıya yeniden
kurulumu reddeder; bu sürüm veri benimseme/göç yapmaz. Yeniden temiz kabul için
ayrı temiz Windows hesabı/VM kullanın. Kaldırma yarım kalırsa bakım kilidini veya
dosyaları rastgele silmeyin. Setup'ı saklayın; Ayarlar uygulamasında ayrı kaldırma
kaydı bu test paketinde yoktur.

## Bilinen sınırlar

Otomatik iPhone pano eşitlemesi ve otomatik yerel/Tailscale yol seçimi yoktur.
Kestirmeler kullanıcı tarafından tetiklenir. Fotoğraf/dosya alma kaydeder; metni
kullanıcı yapıştırır. Windows → iPhone iki GET arasında panoyu değiştirmeyin.
iPhone → Windows dosya/video yükleme 512 MiB; metin/görsel işleme 64 MiB.
Windows → iPhone yolunda aynı genel üst sınır yoktur. Geçmiş kotası toplam disk
kotası değildir. İlk sürümde güncelleme, üretim rollback'i ve kişisel veri göçü
yoktur. Kaynakta deneysel motor bulunması desteklendiği anlamına gelmez.

