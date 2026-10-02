# PanoKöprü

iPhone ve Windows arasında Apple Kestirmeler ile tetiklenen iki yönlü metin,
görsel ve dosya aktarımı. Windows arayüzünde geçmiş, favoriler, arama, açık/koyu
tema ve güvenilen ağ yönetimi bulunur.

**Bu depo geliştirme hazırlığıdır; henüz genel kullanıma hazır bir kurulum paketi
değildir.** Mevcut kişisel kurulumdan yalnızca seçilmiş kaynaklar alınmıştır.
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
npm.cmd run report:dependencies
npm.cmd audit
```

Arayüz testi için Microsoft Edge gerekir. Testler geçici veri ve sahte pano/ağ
işlemleri kullanır. Gerçek kurulumu başlatma, eşleştirme ve derleme komutları bu
aşamada kasıtlı olarak kapalıdır. Ortak veri kökü/port/süreç kimliği, çevrimdışı
göç motoru, Tailscale’siz kurulum ekranı, izin temizliği ve depolama yönetimi kaynakta
eklendi; gerçek Windows/iPhone kabulü tamamlanmadan kurulu sürüme uygulanmayacaktır.
Güncelleme/geri alma çekirdeği yalnız yalıtılmış testlerde çalışır; üretim updater'ı
değildir. Node/WebView2 temiz edinimi, native paketleme ve kaldırıcı hâlâ eksiktir.

## Belgeler

- [English overview](README.en.md)
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
