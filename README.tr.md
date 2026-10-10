# ClipBridge

Türkçe ve İngilizcede aynı ad kullanılır. Eski kurulumun sertifikası, adresi
ve verileri yalnız isim değişikliği için sıfırlanmaz veya taşınmaz.
[Adlandırma ve uyumluluk ayrıntıları](docs/BRANDING.md)

[English README](README.md) | [Kurulum](docs/QUICKSTART.tr.md)

**Kaynak kod yayını — 1.2.1 geliştirme sürümü.** Bu depoda kaynaklar ve belgeler
yayımlanır; indirilebilir EXE/kurulum paketi henüz yayımlanmamıştır.
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

## Geliştirme

Önce [AGENTS.md](AGENTS.md) ve [güncel durumu](PROJECT-STATUS.md) okuyun.
Windows ve Node.js 24.15.0 ile mevcut test tabanı doğrulanmaktadır.

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd test
npm.cmd run test:ui
npm.cmd run check:source
npm.cmd run check:history
npm.cmd run report:dependencies
npm.cmd audit
```

Arayüz testi için Microsoft Edge gerekir. Testler geçici veri ve sahte pano/ağ
işlemleri kullanır. Üretim başlatma, eşleştirme ve eski `build` komutu bu
aşamada kasıtlı olarak kapalıdır. `build:native` yalnız derler, `build:candidate`
korumalı mühendislik adayı üretir; ikisi de uygulamayı kurmaz veya çalıştırmaz.
Ortak veri kökü/port/süreç kimliği, çevrimdışı
göç motoru, Tailscale’siz kurulum ekranı, izin temizliği ve depolama yönetimi kaynakta
eklendi; gerçek Windows/iPhone kabulü tamamlanmadan kurulu sürüme uygulanmayacaktır.
Güncelleme/geri alma çekirdeği yalnız yalıtılmış testlerde çalışır; üretim updater'ı
değildir. Sabit hash'li Node/WebView2 **SDK** edinimi, native derleme ve izin
listeli aday paketleme doğrulandı. **Runtime**, SDK'dan farklıdır: başlatıcıda
eksik Runtime için resmi indirme sayfasına onaylı yönlendirme var; otomatik
Runtime kurulumu yok. Kurulum kaydı doğrulayan açılış ve onaylı kilit kurtarma
kodu eklendi. Bağımsız ilk kurucu ve veri koruyan kaldırma kaynakta var;
`build:test-package` açık seçimiyle özel kabul paketi üretilebilir. Kurucu ve
uygulama derlenmiş, gerçek kurulumda çalıştırılmamıştır. Temiz Windows/iPhone
kabulü ve binary yayın onayı bekliyor; native kaynak/DLL incelemesi geçti.
Bkz. [başlatıcı sözleşmesi](docs/INSTALLED-LAUNCH.md).
İlk kurucunun kapsamı ve sınırları: [FIRST-INSTALL.md](docs/FIRST-INSTALL.md).

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
