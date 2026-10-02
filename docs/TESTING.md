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

Gerçek UAC/firewall, başka yönetici hesabı, temiz Windows kurulumu, paket/launcher
derlemesi, Tailscale'siz iPhone ilk kurulum, yeni veri köküne geçiş, gerçek iPhone
uçtan uca aktarımı, güncelleme/rollback/kaldırma. Bu oturumda kişisel telefondaki
eski başarılı testler yeniden yapılmış gibi raporlanmamalı.
