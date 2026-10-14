# ClipBridge

Türkçe ve İngilizcede aynı ad kullanılır. Eski kurulumun sertifikası, adresi
ve verileri yalnız isim değişikliği için sıfırlanmaz veya taşınmaz.
[Adlandırma ve uyumluluk ayrıntıları](docs/BRANDING.md)

[English README](README.md) | [Kurulum](docs/QUICKSTART.tr.md)

**Güncel kaynak 1.2.2 tek dosyalı deneysel kurucu adayıdır; henüz yayımlanmadı.**
[İndirmeler](https://github.com/LionKing53/ClipBridge/releases/tag/v1.2.1-experimental.1):
`ClipBridge-1.2.1-win-x64-experimental.zip`, eşleşen kaynak ZIP'i ve
`SHA256SUMS.txt` aynı sayfadadır. Bu önceki 1.2.1 pakette EXE tek başına kullanılmaz.
Yeni 1.2.2 EXE payload'ı içerir; kendi kaynak ZIP'i ve checksum'u ile ayrı inceleme
ve yayın gerektirir. Kurucu imzasızdır; kararlı sürüm değildir.
Yeni kurucunun **temiz Windows kurulumu ve gerçek iPhone ile aktarımı henüz
test edilmemiştir**. libvips kaynak derlemesi ve Windows DLL uyumluluk doğrulaması
geçti. Otomatik/kütüphane testleri gerçek cihaz kabulünün yerine geçmez.
[Native derleme](https://github.com/LionKing53/ClipBridge/actions/runs/38056080637/job/114224790630)
ve [Windows DLL kanıtı](https://github.com/LionKing53/ClipBridge/actions/runs/38058678968).
İlk kurucu yalnız temiz Windows x64 kurulumu hedefler; otomatik güncelleme,
üretim rollback'i ve eski verilerin göçü sonraki sürüme ertelendi.
Bkz. [Türkçe/İngilizce kurulum ve test rehberi](docs/QUICKSTART.md).

iPhone ve Windows arasında Apple Kestirmeler ile tetiklenen iki yönlü metin,
görsel ve dosya aktarımı. Windows arayüzünde geçmiş, favoriler, arama, açık/koyu
tema ve güvenilen ağ yönetimi bulunur.

Kaynaklar geliştirme ve inceleme için paylaşılır. Mevcut kişisel kurulumdan
yalnızca seçilmiş kaynaklar alınmıştır.
Kişisel veriler ve bağımlılık/çalışma zamanı kopyaları alınmamıştır.

## Gerçekte nasıl çalışır?

- iPhone'da kestirmeyi kullanıcı çalıştırır. Arkaya çift dokunma isteğe bağlıdır.
- Otomatik iPhone pano eşitlemesi veya otomatik yerel ağ–Tailscale geçişi yoktur.
- Yerel HTTPS ve Tailscale için ayrı gönderme/alma kestirmeleri kullanılır.
- Windows'tan alınan metin iPhone panosuna konur; kullanıcı istediği yere
  yapıştırır. Görseller Fotoğraflar'a, belgeler kullanıcının seçtiği yere kaydedilir.
- Arayüzde “hazır” yazması iPhone'dan uçtan uca erişimin doğrulandığı anlamına gelmez.
- Arama dosya adı ve metin önizlemesindedir; tam içerik araması değildir.

## Kurulum

Yeni 1.2.2 adayı tek dosyalı `ClipBridgeSetup.exe` kurucusudur; ZIP çıkarmak veya
yanında payload klasörü tutmak gerekmez. Yayımlanmış eski 1.2.1 ZIP'i hâlâ özgün
payload'ını gerektirir; eski paket bu kaynak değişikliğiyle değiştirilmez.
Kurucu mevcut program/verinin
üzerine yazmaz. Kestirmeleri kendi adresiniz ve anahtarınızla oluşturun;
sertifika parmak izini doğrulayın. [Kısa rehber](docs/INSTALL.tr.md) ve
[ayrıntılı rehber](docs/QUICKSTART.tr.md) kurulum/kaldırma akışını açıklar.

## Geliştiriciler ve dağıtıcılar

Kod, testler ve geliştirme kuralları kaynak depoda korunur:
[AGENTS](AGENTS.md), [durum](PROJECT-STATUS.md), [testler](docs/TESTING.md),
[Cloud düzeni](docs/CLOUD-WORKFLOW.md) ve [yol haritası](docs/ROADMAP.md).
Kaynak guard'ını kaldırmayın. Yeni kurucu payload ve lisansları içine gömer;
isteğe bağlı kullanıcı ZIP'i yalnız EXE ve kısa EN/TR rehberleri içerir.
İnceleme raporları ayrıdır.
Uygulama/native kaynakları eşleşen commit/hash ile ayrı ZIP'te korunur;
binary ile aynı indirme yerinde eşit erişimle sunulmalıdır.
[Kaynak sağlama](docs/DISTRIBUTION-SOURCES.md),
[native yeniden derleme](docs/NATIVE-REBUILD.md).

## Belgeler

- [English overview](README.md)
- [Plan ve yayın engelleri](docs/ROADMAP.md)
- [Test kapsamı ve yan etkiler](docs/TESTING.md)
- [Yerel ağ ve güvenlik sınırları](LOCAL-NETWORK.md)
- [Aktarım ve depolama sınırları](TRANSFER-LIMITS.md)
- [Değişiklik kaydı](CHANGELOG.md)
- [Mimari ve veri sınırları](docs/ARCHITECTURE.md)
- [Kestirme rehberi · TR/EN](docs/SHORTCUTS.md)
- [Geçiş/güncelleme sınırları](docs/LIFECYCLE.md)
- [Kabul matrisi](docs/ACCEPTANCE.md)
- [Bağımlılık bildirim durumu](THIRD-PARTY-NOTICES.md)
- [Logo kaynak kaydı](docs/ASSET-PROVENANCE.md)
- [Sorun giderme](docs/TROUBLESHOOTING.md)

Proje, GNU Genel Kamu Lisansı sürüm 3 veya (tercihinize göre) daha sonraki bir
sürümü altında sunulur: **GPL-3.0-or-later**. Bkz. [LICENSE](LICENSE).
Yazılım, uygulanabilir hukukun izin verdiği ölçüde garantisiz sağlanır.
Logo için kullanıcı beyanı kaydedildi. Bağımlılık envanteri, lisans metni toplama ve kaynak
kilidi SBOM raporu üretilebilir; nihai Windows paketinin lisans denetimi ayrıdır.
Bu belge bir güvenlik sertifikası veya kurulabilir sürüm duyurusu değildir.

Dil: **Ayarlar → Dil → Türkçe / English**. Tercih yeniden açılışta korunur.
