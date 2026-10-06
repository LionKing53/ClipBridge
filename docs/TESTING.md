# Test kapsamı ve yan etkiler

## Bu kaynakta çalıştırılabilir

`npm test`: seçilmiş `test/*.test.js`; geçici mkdtemp kökleri ve 127.0.0.1 üzerinde
port 0 kullanan test sunucuları. Windows panosu yerine sahte okuyucu/yazıcı;
ağ izinlerinde sahte permissionRunner. RTF/RTFD testleri Windows'ta gizli
PowerShell ve RichTextBox ile sentetik belgeyi ayrıştırır; panoyu kullanmaz.
65 MiB yükleme testi geçici dosya ve HTTP akışını doğrular; küçük limit testleri
sınır/sınır+1 kontrolü yapar. Bu, gerçek iPhone ile 512 MiB kabul testi değildir.

`npm run test:ui`: Edge headless, geçici geçmiş ve tarayıcı profili, sentetik
cihaz/ağ/aktarım verileri, sahte Tailscale, clipboard ve izin işlemleri. Arayüz
ekran görüntüleri yalnız yok sayılan `build/` altında üretilir; paylaşım öncesi
yine de görsel kontrol gerekir. PNG örneği programatik üretilir, kişisel resim yok.

`npm run check:source`: izin listesinin varlığı, izlenebilir dosya sınırı,
şüpheli yollar/kimlik bilgileri ve kilit dosyası URL/bütünlük kontrolü. Bu statik
kontrol bir güvenlik denetimi, antivirüs veya tam sır tarayıcısı değildir.

`npm run check:history`: bütün mevcut Git referanslarından erişilen commit/tag
metadata'sını ve geçmiş dosya içeriklerini salt okunur tarar. Güncel izin listesi
dışındaki geçmiş yolları, bağlantılı/binary dosyaları, özel anahtar/uzun Bearer,
kişisel yol/Tailscale URL kalıplarını ve varsa Git dışındaki özel terimleri kontrol
eder. Yalnız nesne kimliği ve bulgu kodunu raporlar, özel içeriği yazdırmaz.
Son dosya temiz olsa bile eski commit'teki bulguyu yakalayan sentetik test vardır.
Bu sezgisel kontrol görsel/QR, nihai arşiv veya kapsamlı sır denetiminin yerine
geçmez; unreachable/reflog nesnelerini taramaz. Çalışma ağacı ayrıca source
kapısından geçmelidir; Git geçmişi denetimi commit edilmemiş değişiklikleri kapsamaz.

## Çalıştırılmayan / içe alınmayan eski araçlar

| Araç | Yan etki / karar |
| --- | --- |
| verify-windows-clipboard.js, verify-media-api.js, verify-large-upload.js | Gerçek Windows panosuna/kuruluma erişebilir; içe alınmadı |
| verify-local-network.js | Gerçek ağ/sertifika Ensure işlemi; içe alınmadı |
| capture-desktop-window.ps1 | Gerçek ekran/kişisel bilgiler; içe alınmadı |
| Cleanup-OldWorkspace.ps1 | Kişisel yol ve silme; içe alınmadı |
| Uninstall-PanoKopru.ps1 | Veri silme ve paylaşılan Serve riski; içe alınmadı |
| build-app.js | Vendor SDK ve üretim varsayımları; kaynak koruması ile kapalı |
| prepare-local-network.js, pair.js, info.js, server.js | loadConfig üzerinden kaynak koruması ile kapalı |
| grant/request/enable/protect/local-certificates PowerShell | UAC/firewall/CA/ACL yan etkileri; kaynak koruması ile kapalı |

Eski yardımcıları çalıştırmak yerine veri kökü sözleşmesine göre yeniden tasarla.
Salt okunur local-network-info.ps1 mevcut olsa da testler gerçek ağ okumaz.
Kurulu uygulamanın hiçbir dosyası veya çalışan süreci bu testlerin hedefi değildir.

## Henüz doğrulanmayanlar

Gerçek UAC/firewall, başka yönetici hesabı, temiz Windows kurulumu, launcher'ın
gerçek çalışması, Tailscale'siz iPhone ilk kurulum, yeni veri köküne geçiş, gerçek iPhone
uçtan uca aktarımı, güncelleme/rollback/kaldırma. Bu oturumda kişisel telefondaki
eski başarılı testler yeniden yapılmış gibi raporlanmamalı.

Tam C#/WebView2 native derleme ve korumalı mühendislik adayı paketlemesi
doğrulandı; bunlar uygulamanın çalıştırılması veya kurulabilir paket kabulü değildir.

`installed-launch.test.js` yalnız saf InstalledLaunch sınıfını sentetik console
harness'iyle derler. Sahte geçici Windows profilindeki metin dosyalarını kontrol
eder; gerçek exe/pano/WebView/kurucu çalıştırmaz. `instance-recovery.test.js`
yalnız geçici veri ve sentetik çocuk PID'si kullanır. `errors.test.js` pano
işlemlerini sahte süreç nesneleriyle sınar; gerçek PowerShell panosu kullanılmaz.

## Windows kurulum gözlemleri — yalıtılmış kapsam

`windows-install-probes.test.js`: yeni salt okunur yardımcı Windows mimarisini ve
iki WebView2 registry konumunu sorgular; ham sürüm/cihaz değerleri kayda yazılmaz.
Geçici hedeflerin üst klasöründe oluşturma hakkı, disk boşluğu ve volume kimliği
okunur; hedef klasör oluşturulmaz, ACL değiştirilmez. Sentetik Node adlı küçük
PE dosyası derlenip metadata'sı okunur; dosya çalıştırılmaz. Powershell Add-Type
kendi geçici derleme dosyalarını oluşturabilir; kurulu uygulama hedef değildir.

Portlar yalnız 127.0.0.1 ve testin seçtiği geçici portlardır. Dolu port, iptal,
yeniden bağlanabilme ve işlem kapsamı test edilir. Gerçek LAN/IPv6/firewall
uygunluğu sonucu değildir. Üretim context'i ve kapsam dışı yollar reddedilir.
Yönetici oturumunda helper veri gözlemlerini reddeder; test yalnız bu reddi
doğrular ve bunu diagnostic satırında belirtir. Normal kullanıcı oturumunda
gerçek salt okunur gözlemlerin tamamlandığı diagnostic satırları ayrı gösterilir.

Bu dar istisna eski etkili yardımcıların veya production launcher'ın testlerde
serbest bırakıldığı anlamına gelmez. Ayrıntılar: [INSTALL-PREFLIGHT.md](INSTALL-PREFLIGHT.md).

## 2026-10-03 eklenen kapsam

- Node/C#/PowerShell ortak runtime kimliği ve port sözleşmesi. C# yalnız geçici
  RuntimeProbe.exe olarak derlenir; WebView uygulaması çalıştırılmaz.
- PowerShell firewall sahiplik yüklemi yalnız sahte nesnelerle çalışır; gerçek
  NetFirewall cmdlet'leri çağrılmaz.
- Çevrimdışı göç/yedek bütünlüğü, eşzamanlı eski veri değişimi, şema reddi.
- Bütün Node sunucusunun açık test adaptörleriyle başlatılması; port çakışması,
  instance kilidi ve kısmi başlangıç temizliği.
- Süreli halka açık CA sunucusu yalnız 127.0.0.1'de ve sentetik CA ile. Test CA
  özel anahtarı veya güven deposu değişikliği test kaynağına dahil değildir.
- Kurulum parmak izi/onay akışı, masaüstü API yetkisi/Origin, yerel eşleştirme.
- Saklama politikası, favoriler/yönetilmeyen dosyalar, sahiplikli geçici dosyalar,
  tanılama alan izin listesi, hata kodları.
- Yalıtılmış sürüm deposu doğrulama, hatalı güncelleme recovery, veri koruyan
  rollback ve uyumsuz şema engeli. Gerçek updater değildir.
- Edge UI'da sentetik kurulum ekranı, parmak izi formu, depolama eşiği ve iptal.

`npm.cmd run report:dependencies` 121 kilit girdisinin envanterini, mevcut
kurulumdaki lisans/bildirim kanıtlarını ve kaynak-kilidi SBOM'unu üretir. Bu
dosyalar build/ altında kalır; runtime/SDK içeren nihai paket için yeniden üretim
ve insan kontrolü gerekir. `npm.cmd audit` zaman bağımlı bilinen açık taramasıdır;
sıfır sonuç tüm yazılımın güvenli olduğunu kanıtlamaz.

Etkili üretim PowerShell betikleri ayrıca AST ayrıştırmasına tabi tutulur;
UAC/firewall/CA yan etkileri çalıştırılmaz. Yukarıdaki salt okunur Windows gözlem
yardımcısı ile saf runtime/ownership sözleşmeleri belirtilen test kapsamında
çalıştırılır. Ayrıntılı manuel matris: [ACCEPTANCE.md](ACCEPTANCE.md).
