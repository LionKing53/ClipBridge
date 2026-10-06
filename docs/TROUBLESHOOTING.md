# Sorun giderme / Troubleshooting

Önce yönü, kullanılan kestirmeyi (yerel/Tailscale), aşamayı ve güvenli hata kodunu
kaydedin. Pano içeriği, Bearer anahtarı, QR görüntüsü, kişisel yol veya tüm sistem
logunu kamuya göndermeyin. Tanılama kaydı yalnız izin verilen metadata tutar.

| Belirti / code | Kontrol / action |
| --- | --- |
| `unauthorized`, HTTP 401 | Her GET/POST için kişisel Authorization başlığını kontrol edin. Anahtarı paylaşmayın. /health başarısı yetkilendirme testi değildir. |
| Sertifika/hostname hatası | Aynı kurulumun CA'sı, doğru hostname, telefon saati ve elle kök güvenini kontrol edin. Uyarıyı atlamayın, doğrulamayı kapatmayın. |
| Bağlantı yok / `connection_unavailable` | Seçilen yol, bağlı ağ, uygulama durumu ve portu kontrol edin. Tailscale yedek yolunu manuel seçin. |
| `port_in_use` | Başka dinleyiciyi körlemesine sonlandırmayın. Test ortamının üç ayrı üretim dışı port kullandığını doğrulayın. |
| `instance_locked` | Kilidi elle silmeyin. Yeni başlatıcının `--recover-lock` onay akışı yalnız sahibi artık bulunmayan, kimliği eşleşen kilidi kaldırır. Canlı/yeniden kullanılmış PID, belirsiz durum veya `instance.guard` kalıntısı inceleme gerektirir. Bu komut mevcut kişisel sürüme henüz dağıtılmadı. |
| `clipboard_read_failed`, `clipboard_write_failed`, `clipboard_timeout` | Pano kullanan diğer uygulama/oturum durumunu kontrol edip yeniden deneyin. Uygulama etkileşimli kullanıcı oturumunda olmalıdır. Süre aşımı 30 saniyedir. |
| HTTP 413 / `size_limit_exceeded` | Yön/tür limitlerini TRANSFER-LIMITS.md ile karşılaştırın. Dosya ve görsel işleme limiti aynı değildir. |
| `disk_full` / HTTP 507 | Disk alanı açın. Geçmiş bütçesi toplam kota değildir. Depolama temizliği kullanıcı onayı ister; favori/harici dosyaları silmez. |
| `permission_cancelled`, `permission_timeout`, `permission_failed` | Güven kaydedilmez. Windows'ta kısmi profil/kural değişikliği kalabilir; zaman aşımı UAC yardımcısının hiç çalışmadığını kanıtlamaz. İzin temizliği iptal edildiyse yerel erişim kapalı kalır; uygun ağda İzni onar kullanın. |
| `network_changed` | Yeniden tarayın, yalnız kendi ağınızı seçin. İzinli liste adları kriptografik ağ kimliği değildir. |
| `data_schema_incompatible`, `migration_required` | Veriyi eski programla açmaya zorlamayın. Kontrollü çevrimdışı geçiş ve uyumlu sürüm gerekir. |
| Fotoğraf yerine `Clipboard <tarih>` | Kestirmede Form content alanı Dosya türünde mi, gerçek Pano çıktısına bağlı mı kontrol edin. |
| Hata JSON'u dosya gibi geliyor | Başarısız HTTP yanıtını içerik olarak kaydetmeyin. GET/POST, başlık ve doğru URL'yi kontrol edin. |

API yakalayıcıları ham Windows/hata metinlerini döndürmez. Kararlı `error` koduna
ek olarak güvenli Türkçe `message` bulunur; bazı doğrulama hataları hâlâ genel
`invalid_request`/`conflict` sınıfındadır. Yeni izin/pano/ağ değişimi hataları ayrıdır.
Windows'a ait yerelleştirilmiş stderr metni ayrıştırılmaz veya kayda alınmaz. Güncel kaynak
üretim kurulumu değildir; bu tablodaki yeni ekranlar kişisel sürüme uygulanmadı.

English: diagnose the selected direction/transport first. Never publish clipboard
data, credentials, QR images or raw personal logs. A successful /health response
does not test Bearer authorization or iPhone end-to-end transfer. Keep TLS
verification enabled. Retry only after resolving network trust, certificate,
permissions, clipboard contention, capacity or version incompatibility. Never
kill an unknown port owner, delete a lock blindly, or restore old data merely to
roll back program files. See SHORTCUTS.md and LIFECYCLE.md for the detailed flow.
