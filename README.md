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
npm ci --ignore-scripts --no-audit --no-fund
npm test
npm run test:ui
npm run check:source
```

Arayüz testi için Microsoft Edge gerekir. Testler geçici veri ve sahte pano/ağ
işlemleri kullanır. Gerçek kurulumu başlatma, eşleştirme ve derleme komutları bu
aşamada kasıtlı olarak kapalıdır; veri kökü/port/süreç yalıtımı tamamlanmadan
yeniden açılmayacaktır. Node/WebView2 temiz edinimi ve paketleme henüz eksiktir.

## Belgeler

- [English overview](README.en.md)
- [Plan ve yayın engelleri](docs/ROADMAP.md)
- [Test kapsamı ve yan etkiler](docs/TESTING.md)
- [Yerel ağ ve güvenlik sınırları](LOCAL-NETWORK.md)
- [Aktarım ve depolama sınırları](TRANSFER-LIMITS.md)
- [Değişiklik kaydı](CHANGELOG.md)

Proje lisansı ve görsellerin yayın hakları henüz kararlaştırılmadı. Bağımlılık
lisansları, bildirimler, SBOM ve güvenlik taraması yayın öncesi tamamlanacak.
Bu belge bir güvenlik sertifikası veya kurulabilir sürüm duyurusu değildir.
