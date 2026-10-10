# Geliştirme ve yayın kapıları

2026-10-10 logo düzeltmesi: Masaüstü c/b aralığı ve açık/koyu belge görselleri
yenilendi. Hazır `c3a269f` paketi bu sonraki düzeltmeyi içermez; paket yeniden
üretimi yayın/dağıtım incelemesiyle ayrıca ele alınır. Kişisel kurulum değişmez.

2026-10-10: Yeni özellik yok; ClipBridge 1.2.1 EXE/ZIP, native kaynak eşlikçisi,
lisans/bütünlük/gizlilik kontrolleri yayın sohbetine teslim için hazırlanır.
Kişisel kurulum değişmez. Temiz Windows/iPhone kabulü bekler; hedef kararlı sürüm
değil deneysel ön sürümdür. Native yeniden derleme ayrı ortamda doğrulanmadan
dağıtım kapısı kapanmaz; ön sürüm etiketi lisans yükümlülüklerini kaldırmaz.

2026-10-09 son kullanıcı kararı: Mevcut GitHub deposunun adı ClipBridge olur;
güncel URL https://github.com/LionKing53/ClipBridge. Önceki adresi koruma kararı
bu istekle güncellendi. Ana kaynak klasörü ve kişisel kurulum yerinde kalır.

2026-10-09 yayın sohbeti: ClipBridge 1.2.1 kaynak/README/görselleri mevcut
GitHub deposuna aktarılır; ürün açıklaması yenilenir, depo adresi korunur.
Kaynak/geçmiş/görsel incelemesi ve uzak içerik doğrulaması yayın kapılarıdır.
Bu adım genel EXE yayını veya temiz cihaz kabulü değildir.

2026-10-09: Aynı TR/EN marka ClipBridge, kaynak sürümü 1.2.1. Yeni kurulumun
teknik adları da yenilendi; eski kişisel kimlik/veri için göç veya yeniden
eşleştirme yapılmaz. Uyumluluk: BRANDING.md. GitHub depo adı/yayını bu sohbetten
değiştirilmez; temiz cihaz/native dağıtım kapıları aynı kalır.

2026-10-09 yayın güncellemesi: 1.2.0 kaynakları ve gerçek English seçimiyle
alınan dört sentetik ekran görüntüsü GitHub'a hazırlanır. README'de dil
desteği açıklanır; eski yalnız Türkçe/etiket enjeksiyonu açıklaması kaldırılır.
Kişisel kurulum değişmez; temiz Windows/iPhone ve libvips kapıları açık kalır.

2026-10-09 ek karar: Gerçek TR/EN yerelleştirme 1.2.0 tamamlandı; kullanıcı
onayıyla mevcut kişisel düzene yalnız dil yaması ve doğrulanmış özel yedek/
kod geri alma yolu uygulandı. İlk kurulum/native form testleri sentetiktir;
temiz Windows/iPhone kabulü ve yeni genel dağıtım paketinin üretimi ayrıdır.
Eski belge önizleme ve kişisel kuruluma dokunmama kayıtları tarihsel kalır.

2026-10-09: GitHub ana README ve kurulum rehberi İngilizce öne alınır; Türkçe
kopyalar korunur. Sentetik İngilizce belge ekran görüntüleri ve akış şemaları
eklendi; bu çalışma uygulama yerelleştirmesi veya cihaz kabulü değildir.

2026-10-09: Kullanıcı kaynakların son gizlilik/geçmiş incelemesinden sonra herkese
açık GitHub kaynak deposu yayınına izin verdi. Bu aşamada EXE/ZIP dağıtımı yok.
Temiz Windows/iPhone kabulü ve native yeniden derleme/dağıtım incelemesi binary
sürüm için beklemektedir; kaynak deposunun açılmasını engellemez.

2026-10-08: Kullanıcı ayrı cihaz kabulünü erteledi. Paket üretimi devam eder;
gerçek temiz kurulum/native/iPhone kabulü doğrulanmamış olarak kaydedilir.
Bu karar native bağımlılıkların lisans/kaynak sağlama incelemesini kapatmaz.

## 2026-10-07 ilk sürüm kararı (aşağıdaki geniş planın önündedir)

1.1.0 yalnız temiz Windows x64 kurulumu ve veri koruyan kaldırma hedefler.
Güncelleme/üretim rollback'i/legacy kişisel veri göçü sonraki sürümdedir;
ilk sürümün yayın kapısı değildir. Deneysel çekirdekler kapalı kalır.
Dört somut yarış/izin/ağ bulgusu ve hedefli testler kaynakta düzeltildi.
Açık build politikasıyla kurulabilir **özel kabul** paketi hazırlanır; kaynak
checkout koruması elle silinmez. Ayrı bilgisayar ve gerçek iPhone temel kabulü,
native bileşenlerin dağıtım lisansları ve son gizlilik incelemesi hâlâ kapıdır.
Test adımları: QUICKSTART.md. Eski kapsam/kayıtlar aşağıda tarihsel olarak kalır.

Bu plan 2026-10-02 tarihli salt okunur inceleme ve güncel kaynak karşılaştırmasına
dayanır. Tamamlanmış özellikleri tekrar yazmak yerine eksik altyapı tamamlanır.
Bir aşamanın tamamlanması sonraki aşamanın veya kişisel dağıtımın onayı değildir.

## A — Tek kaynak ve güvenli başlangıç (tamamlandı)

- İncelenmiş kaynak izin listesi; özel veriler/bağımlılıklar/eski yedekler yok.
- Sentetik test verileri, özel bilgisayar/Tailscale bilgisi okumayan UI testleri.
- AGENTS, durum/değişiklik kayıtları, yerel Git, tek-yazarlı çalışma kilidi.
- Temiz kilit dosyasından bağımlılık kurulumu ve yalıtılmış test tabanı.
- Kaynak sürümünden üretim çalıştırmasını geçici olarak kapatan koruma.

## B — Ortak veri kökü ve yalıtım (çekirdek test edildi; native geçiş bekliyor)

- Node, C# launcher, WebView2 profili ve PowerShell aynı veri kökü sözleşmesini
  kullanmalı. Kurulum programı ve kullanıcı verisi ayrı olmalı.
- Geliştirme/test için ayrı veri kökü, portlar, süreç kilitleri; eksik ayarda
  kişisel kuruluma geri düşme yok. Yalıtım testleri yanlış ortamı reddetmeli.
- Şema sürümü, üst sürüm reddi ve sürümlü geçişler; eski mutlak geçmiş yolları
  ve tema/WebView ayarları dahil kimlik/veri korunumu.
- Kopyalama/geçiş öncesi özel yedeğin kullanılabilirliğini doğrula. CA özel
  anahtarı/DPAPI nedeniyle dosya yedeği tek başına taşınabilir kimlik değildir.
- SOURCE-CHECKOUT koruması ancak tüm bileşenler ve kabul testleri hazır olunca
  kontrollü değiştirilir. Üretim veri geçişi ayrıca yetkilendirilir.

## C — İzin ve ilk kurulum

- Tailscale olmadan gerçek iPhone'a ilk sertifika aktarımı + bağımsız parmak izi
  doğrulaması. TLS atlatma yok. iPhone tam kök güveninin kapsamını açıkla.
- Node/WebView2, port, yazma izni, başlangıç seçeneği, kullanıcıya özgü token,
  hostname/CA ve açık ağ seçimi içeren sihirbaz.
- Yeni/eski firewall kurallarını sahiplik doğrulayarak temizleme; listeden
  çıkarma ile Windows izinlerini temizleme ayrı. Windows profilini eski
  previousCategory bilgisine bakarak körlemesine değiştirme.
- Standart kullanıcı/farklı yönetici UAC, iptal/zaman aşımı/kısmi başarı,
  ağ değişimi/iki ağ/izinsiz ağ/aktarılırken çıkarma testleri.

## D — Güncelleme, depolama ve tanılama

- Sürüm/commit/paket özeti/veri şeması manifesti, kontrollü durdurma, doğrulanan
  yeni sürümü etkinleştirme, kesintili güncellemeden kurtulma ve kod geri alma.
- Kod geri alma veri yedeğini otomatik geri yüklemez; yeni aktarımlar korunur.
- Kaldırmada veri koruma/silme seçeneği; yalnız sahip olunan görev/izin/Serve
  ayarları kaldırılır. Paylaşılan Tailscale 443 uç noktasını topluca kapatma yok.
- Gelen dosya saklama politikası, toplam disk bilgisi, disk dolması, çökme
  sonrası kendi geçici dosyalarını temizleme. 256 MiB geçmiş toplam kota değil.
- Bağlantı/TLS/auth/pano/boyut/disk/UAC/ağ değişimi ayrı hata mesajları.
  Tanılama minimum metadata içerir; sır/pano/kişisel yol sızdırmaz.

## E — Dağıtım ve yayın öncesi kabul

- Temiz Windows x64, Node/Tailscale/WebView2 önceden yokken kurulum; çalışma
  zamanı ve SDK sürüm/bütünlük doğrulaması. Kurulu vendor/runtime kopyalama yok.
- Gerçek iPhone iki yönlü metin/fotoğraf/PDF/video, ayrı yerel/Tailscale yolları;
  boyut sınırı, kesilen aktarım, disk dolması, çökme ve tüm yaşam döngüsü testleri.
- Lisans seçimini kullanıcı kararlaştırır; görsel hakları doğrulanır. MIT,
  Apache-2.0, Windows sharp/libvips LGPL kapsamı, Node ve WebView2 bildirimleri
  dağıtım şekline göre gözden geçirilir. Metadata tek başına lisans kanıtı değil.
- THIRD-PARTY-NOTICES, dağıtıma özgü SBOM, güvenlik taraması ve sabit bağımlılık
  doğrulaması hazırlanır. Bugünkü test başarısı bu kontrollerin yerine geçmez.
- Tam TR/EN kurulum/mimari/güvenlik/kestirme/sorun giderme/güncelleme/kaldırma
  rehberleri. Mevcut kısa rehberler tamamlanmış ilk kurulum kılavuzu sayılmaz.
- İzin listeli kaynak/paket üretimi; kaynak, bütün Git geçmişi, arşiv, QR ve
  görsellerin ayrıca incelenmesi. Gizli değer tespitinde geçmiş ve anahtar
  yenileme değerlendirilir; yalnız son dosyayı silmek yeterli değildir.
- GitHub sohbeti güncel commit, test kayıtları ve çalışma ağacını yeniden
  inceler. Bu sohbet uzak depo oluşturmaz, push/release yapmaz.

## 2026-10-06 uygulama karşılığı ve kalan işler

Bu bölüm yukarıdaki gereksinimlerin yerini almaz; neyin gerçekten yapıldığını
ayırır. Tüm B–E aşamaları tamamlandı olarak işaretlenmemelidir.

| Alan | Kaynaktaki karşılığı | Kalan kapı |
| --- | --- | --- |
| Veri/kimlik | runtime-context Node/C#/PS, schema 1, açık portlar; ilk kurucunun ready kaydı, hash doğrulayan native açılış ve onaylı ölü-PID kilit kurtarma | Gerçek native/crash/kurulum kabulü, yönlendirilmiş profil desteği |
| Geçiş | data-migration copy-only motoru ve sentetik yedek/göç testleri | Üretim ACL adaptörü, gerçek CA/DPAPI/WebView teması, özel doğrulanmış yedek |
| İlk kurulum | onboarding + public certificate bootstrap + desktop API/UI + local pairing; önkontrol; bağımsız C# ilk kurucu, private staging/receipt ve kısayol/başlangıç adaptörü | Korumalı kurucunun gerçek Windows ACL/COM/IPv4/kesinti kabulü ve çalışabilir test paketi onayı; gerçek iPhone/UAC |
| İzinler | Eski/yeni kuralların sahiplikli temizliği; iptalde kapalı kalma | Gerçek firewall, iki arayüz ve aktarım sırasında ağ değişimi |
| Depolama | Kullanım ekranı, onaylı gelen dosya temizliği, geçici upload ve outbox sahiplikli temizlik | Gerçek disk dolması ve zorla kapanma kabulü |
| Hatalar | Hassas alanları dışlayan tanılama; API/desktop güvenli kod+mesaj; pano, UAC iptal/süre/başarısızlık, ağ değişimi, TLS/disk/bağlantı ayrımı; sınırlı pano yardımcısı | Gerçek Windows/iPhone hata kabulü; genel doğrulama alt durumlarının ayrıntılandırılması |
| Güncelleme | Yalıtılmış release-store ve veri koruyan rollback; launcher/Node sahiplikli stdin durdurma | İmzalı paket/launcher sürüm yönlendirmesi, native durdurma kabulü/recovery, yeni kaldırıcı |
| Dağıtım | Kilitli Node/SDK, yayıncı doğrulaması, tam native derleme ve allowlist korumalı aday; launcher ve ilk kurucuda Runtime yokluğunda onaylı resmi sayfa yönlendirmesi; bileşen/lisans envanteri | Gerçek Runtime edinim kabulü, kurulabilir paket entegrasyonu, nihai SBOM/lisans uygunluğu |
| Belgeler | TR/EN README/kestirmeler, mimari, yaşam döngüsü, sorun giderme ve kabul matrisi | Çalışan installer üzerinde eksiksiz son kullanıcı rehberi |
| Lisans | Kullanıcı GPL-3.0-or-later seçti; LICENSE ve metadata eklendi | Paketlenmiş bileşenlerle dağıtım uygunluğu; logo/ad politikası |

Sonraki mühendislik sırası: native paket/launcher ve güvenli üretim yaşam döngüsü
adaptörleri → yalıtılmış temiz Windows kabulü → gerçek iPhone ilk kurulum → ayrı
onaylı kişisel veri geçişi/dağıtım. GitHub yayını bu geliştirme sohbetinin işi değildir.
