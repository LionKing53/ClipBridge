# İlk kurucu / First installer — engineering status

**Bu belge henüz son kullanıcıya “indir ve kur” rehberi değildir.**
Kurucu kaynak kodu, gerçek Windows adaptörü ve bağımsız Forms penceresi var.
Yalıtılmış işlem testleri çalışır. Derleme aracı yalnız korumalı mühendislik
adayına bağlanır: `SOURCE-CHECKOUT` veya `NOT-INSTALLABLE.txt` içeren paket
kurulmaz. Bu dosyaları silerek kurulum denenmemelidir.

## Uygulanan akış

1. Var olan `%LOCALAPPDATA%/Programs/PanoKopru` **veya**
   `%LOCALAPPDATA%/PanoKopru` varsa dur. Boş veri klasörü bile benimsenmez.
   Kurucu bir güncelleme/geçiş aracı değildir.
2. Derleme sırasında kurucuya gömülen manifest hash'ini ve bütün paket dosyalarını
   kontrol et. Kaynak koruması, bilinmeyen dosya, traversal, link veya bozuk hash
   varsa hiçbir program kopyası etkinleşmez. Node çalıştırılarak test edilmez.
3. Normal kullanıcı bağlamı, x64 Windows 10 build 19045+ / Windows 11, varsayılan
   yerel kullanıcı profili, Node PE sürümü, WebView2 Runtime, yazma hakkı, disk
   alanı ve IPv4 portlarını denetle. Bu dar ilk hedef diğer platform desteği
   anlamına gelmez; mimariyi algılamak kullanıcıların elle kod değiştirmesini önler.
4. Yalnız kullanıcıya ait kurulum kilidi ve benzersiz staging klasörü oluştur;
   yeni klasörlere kullanıcı/SYSTEM/Administrators ACL'si uygula. Mevcut klasör
   üzerinde ACL değiştirme. Kopyayı tekrar hash'lerle doğrula.
5. Ready kurulum kaydını en son hazırla; aynı diskte var olmayan program hedefine
   taşı. Hedef veya veri klasörü işlem sırasında oluştuysa üzerine yazma.
6. Başlat menüsü kısayolu, seçildiyse masaüstü kısayolu, **varsayılan kapalı**
   oturum başlangıç kısayolu oluştur. Mevcut kısayolun üzerine yazma. Kısayolda
   hedef, sabit argüman ve kurulum kimlikli açıklama bulunur; Bearer anahtarı yoktur.
7. Kısayol başarısızlığını kısmi başarı olarak bildir. Program/veri silerek geri
   alma yapma. Uygulamayı otomatik başlatma. Yeni veri/anahtarlar ilk gerçek
   uygulama açılışında oluşturulur; iPhone sertifikası ve ağ izni sonraki sihirbazdadır.

WebView2 asgari **uygulama paketleme politikası** 120.0.0.0'dır; bu değer güncel
güvenlik veya Microsoft destek süresi garantisi değildir. Güncel Evergreen Runtime
önerilir. Eksik/eski Runtime için resmi Microsoft sayfasını kullanıcı onayıyla
açan düğme vardır; otomatik indirme/UAC veya sabit Runtime dağıtımı yapılmaz.
Windows 10'un işletim sistemi güncelleme/destek durumunu bu kurucu doğrulamaz.

## Kesinti ve veri koruma

- İlk kopyalama başarısızlığında eski bir kurulum etkilenmez. Hazırlama klasörü
  teşhis için kalabilir; otomatik geniş klasör silme yoktur.
- İptal isteği dosya işlemleri arasında ve etkinleştirmeden önce uygulanır.
  Devam eden senkron dosya/Windows gözlemi anında kesilmez. Etkinleştirmeden sonra
  kurulum silinerek iptal yapılmaz; kısayolların sonucu ile tamamlanır.
- Kilit normal sonuçta yalnız kendi işareti eşleşirse kaldırılır. Süreç çökmesi
  kilit bırakabilir; yeniden kurulum bunu çalmaz, inceleme ister.
- Etkinleşmeden sonra kısayol ekleme başarısız olsa bile doğrulanmış program korunur.
  Receipt'teki `requestedDesktopShortcut`/`requestedStartAtLogin` alanları istenen
  tercihlerdir, Windows işleminin başarılı olduğunun kanıtı değildir.
- Eski veri bulunursa geçiş ayrı onaylı araç gerektirir. Bu kod kişisel kurulumun
  üzerine kopyalanmamalı; updater/rollback/uninstaller olarak kullanılmamalıdır.

## Derleme ve test sınırı

Temiz commit'ten `npm.cmd run build:candidate` sonrasında, üretilen göreli klasörle:

```powershell
npm.cmd run build:setup -- build/candidate-<üretilen-kimlik>
```

`PanoKopruSetup.exe`, payload yanında üretilir; payload manifest hash'i derlemeye
gömülür. `setup-build-evidence.json` kaynak hash'lerini ve kurucu SHA-256'sını
kaydeder. Araç hiçbir exe/kurucuyu çalıştırmaz, korumaları kaldırmaz, kurmaz.
Çıktı imzasızdır ve yayına veya başka kullanıcıya verilmek üzere onaylanmış değildir.
Gerçek kurucu paketinin bağımsız güvenilen hash/imza edinimi ayrıca tasarlanmalıdır.

2026-10-06: `fd00755` temiz commit'inden bağımsız kurucu ve tam uygulama derlemesi
başarılı; aynı adayın 1.386 dosyası doğrulandı. Exe çalıştırılmadı. Kesin hash ve
kanıt yolları PROJECT-STATUS.md'de; sonraki belge commit'i derleme girdisi değildir.

`fresh-install.test.js` gerçek Windows adaptörünü değil, derlenmiş işlem motorunu
sahte adaptör ve geçici, çalıştırılamaz dosyalarla sınar: ilk kurulum, var olan
hedef/veri, bozuk kaynak, port/prerequisite reddi, aktivasyon yarışı, kısmi kısayol
başarısızlığı, link ve kilit koruması. COM/ACL/gerçek port kabulünün yerine geçmez.

## Hâlâ gerekli

Gerçek standart kullanıcıda ACL/COM/kısayol/başlangıç kabulü, eksik Runtime ile
kurulum, gerçek kesinti kurtarma, üretim güncelleme/geri alma/kaldırma, imzalı veya
bağımsız pinli dağıtım, nihai lisans/SBOM ve gerçek iPhone akışı. Bu kapılar geçmeden
korumalı adayı çalışabilir kurulum paketine dönüştürmeyin.

English: the standalone first-installer is implemented but only compiled against
guarded candidates. It refuses existing data/programs, verifies pinned payloads,
stages privately, activates without overwrite and creates opt-in owned shortcuts.
Failed stages are retained, data is not migrated/deleted, and the app is not
launched automatically. The injected tests do not validate real Windows ACL/COM
or iPhone behavior. It is not yet an approved user acceptance package.
