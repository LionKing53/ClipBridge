# Geliştirme ve yayın kapıları

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

## 2026-10-03 uygulama karşılığı ve kalan işler

Bu bölüm yukarıdaki gereksinimlerin yerini almaz; neyin gerçekten yapıldığını
ayırır. Tüm B–E aşamaları tamamlandı olarak işaretlenmemelidir.

| Alan | Kaynaktaki karşılığı | Kalan kapı |
| --- | --- | --- |
| Veri/kimlik | runtime-context Node/C#/PS, schema 1, açık portlar, instance kilidi | Tam native launcher, crash recovery, yönlendirilmiş profil desteği |
| Geçiş | data-migration copy-only motoru ve sentetik yedek/göç testleri | Üretim ACL adaptörü, gerçek CA/DPAPI/WebView teması, özel doğrulanmış yedek |
| İlk kurulum | onboarding + public certificate bootstrap + desktop API/UI + local pairing; önkontrol motoru ve yalıtılmış Windows registry/disk/PE/loopback adaptörü | Üretim kapsamı/LAN/IPv6 ve installer bağlantısı; gerçek iPhone; aynı/farklı yönetici UAC |
| İzinler | Eski/yeni kuralların sahiplikli temizliği; iptalde kapalı kalma | Gerçek firewall, iki arayüz ve aktarım sırasında ağ değişimi |
| Depolama | Kullanım ekranı, onaylı gelen dosya temizliği, geçici upload ve outbox sahiplikli temizlik | Gerçek disk dolması ve zorla kapanma kabulü |
| Hatalar | Hassas alanları dışlayan tanılama, temel kararlı hata kodları | Tüm eski API/PowerShell yollarında ayrıntılı sınıflandırma |
| Güncelleme | Üretimi reddeden yalıtılmış release-store çekirdeği; veri koruyan rollback testleri | İmzalı paket/launcher adaptörü, gerçek durdurma/recovery, yeni kaldırıcı |
| Dağıtım | Kilitli Node/SDK, yayıncı doğrulaması, tam native derleme ve allowlist korumalı aday; bileşen/lisans envanteri | WebView2 Runtime, kurulabilir paket entegrasyonu, nihai SBOM/lisans uygunluğu |
| Belgeler | TR/EN README/kestirmeler, mimari, yaşam döngüsü, sorun giderme ve kabul matrisi | Çalışan installer üzerinde eksiksiz son kullanıcı rehberi |
| Lisans | Kullanıcı GPL-3.0-or-later seçti; LICENSE ve metadata eklendi | Paketlenmiş bileşenlerle dağıtım uygunluğu; logo/ad politikası |

Sonraki mühendislik sırası: native paket/launcher ve güvenli üretim yaşam döngüsü
adaptörleri → yalıtılmış temiz Windows kabulü → gerçek iPhone ilk kurulum → ayrı
onaylı kişisel veri geçişi/dağıtım. GitHub yayını bu geliştirme sohbetinin işi değildir.
