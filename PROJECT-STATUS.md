# PanoKopru — proje durumu

Güncelleme: 2026-10-02. Aşama: A tamamlandı — temiz kaynak ve yalıtılmış test tabanı.

## Sürüm ve sahiplik

- Tek ana kaynak: `%USERPROFILE%/source/PanoKopru`.
- Kaynak sürümü: ilk yerel geliştirme tabanı; `git log -1` ve
  `git status --short` güncel commit ve tamamlanmamış değişiklikleri belirler.
- Paket sürümü miras alınan `1.0.0`; launcher bildirimi `1.0.0.0`.
  Bu numaralar yeni bir genel sürüm yayımlandığı anlamına gelmez.
- Kişisel kurulum: `%LOCALAPPDATA%/Programs/PanoKopru`, mevcut 1.0.0; kaynak
  commit'i geçmiş kurulumda kayıtlı değil. Bu değişiklikler kurulu sürüme uygulanmadı.
- Kesin yerel yollar/içe alınan dosya SHA-256'ları yalnız `.local/` kaydındadır.
- Veri geçişi yapılmadı. Kurulu veri hâlâ `app/.clipboard-bridge` altındadır.
- Geliştirme ana sohbette; yayın incelemesi ayrı sohbette. Uzak depo yok.

## Bu aşamada yapılanlar

- Kaynak/test/launcher/arayüz, seçilmiş yardımcılar, paket kilidi ve SVG kaynak
  izin listesiyle alındı. Kişisel durum/bağımlılıklar/vendor/runtime/build alınmadı.
- Özel belgeler yeniden yazıldı; kişisel ağ/cihaz örnekleri ve RTF konuşması
  sentetik verilerle değiştirildi. Eski kaldırma ve klasör silme araçları alınmadı.
- Desktop sistem işlemleri enjekte edilebilir; UI testi gerçek hostname/Tailscale
  okumaz, gerçek panoya veya Explorer'a başvurmaz. Eksik adaptör reddedilir.
- Üretim başlatma/derleme ve etkili PowerShell işlemleri SOURCE-CHECKOUT ile
  geçici kapatıldı. Bu, tamamlanmış veri/port/süreç yalıtımı değildir.
- AGENTS, yol haritası, değişiklik ve test kayıtları, yerel çalışma kilidi eklendi.

## Test kaydı

2026-10-02, Windows x64, Node v24.15.0, npm 11.12.1:

- `npm ci --ignore-scripts --no-audit --no-fund`: başarılı, 97 paket yeniden
  kuruldu. Kurulu uygulamadan node_modules alınmadı; kilitte 121 bağımlılık kaydı.
- `npm test`: 45/45 geçti, 0 atlanan. 41 miras test + 4 kaynak yalıtımı testi.
- `npm run test:ui`: Edge headless başarılı. Unicode/XSS, geçmiş/favoriler,
  tema, ağ yönetimi, onay/iptal ve responsive arayüz. Gerçek pano/Tailscale yok.
- `npm run check:source`: 63 izinli metin kaynak dosyası ve kilit bütünlük/URL
  kayıtları geçti; yerel özel terim taraması temiz. Tam yayın denetimi değildir.
- PowerShell yardımcıları AST ile ayrıştırıldı; sözdizimi hatası yok, çalıştırılmadı.
- Örnek bağlantı ekran görüntüsü incelendi: sentetik ağlar ve örnek uzak adres.

Çalıştırılmayanlar: üretim sunucusu/launcher, derleme, kurulum/kaldırma, gerçek
UAC/firewall/sertifika işlemleri, canlı telefon veya kişisel panoya aktarım.
Yeni kaynakta kişisel `.clipboard-bridge` verisi oluşturulmadı. Bağımlılık
güvenlik açığı taraması ve tam lisans incelemesi yapılmadı; yayın engeli sürüyor.

## Sıradaki adım ve yayın engelleri

Önce docs/ROADMAP.md B: Node/launcher/PowerShell ortak veri kökü, ayrı port ve
süreç kimliği, şema/migrasyon testleri. Çalışan kuruluma dağıtım ayrı onay gerektirir.
Tailscale'siz ilk kurulum, izin temizliği, veri koruyan yaşam döngüsü, depolama,
tam kabul testleri ve lisans/paket/yayın denetimleri tamamlanmadan yayın yok.
