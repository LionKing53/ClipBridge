# Aktarım ve depolama sınırları

| Yön / veri | Mevcut sınır |
| --- | --- |
| iPhone → Windows dosya/video yükleme | 512 MiB |
| iPhone → Windows metin/görsel işleme | 64 MiB |
| Windows → iPhone | Aynı genel üst sınır uygulanmıyor |

MiB = 1.048.576 bayt. İki yöne ortak sınır eklenmesi ayrıca tasarlanması gereken
bir davranış değişikliğidir; bu kaynak hazırlığında sınırlar değiştirilmedi.

Geçmiş önbelleğinin 256 MiB sınırı toplam uygulama disk kotası değildir. Gelen
orijinal dosyalar bu sınırın dışındadır; geçmişi temizlemek bu dosyaları silmez.
Saklama politikası varsayılan süresizdir; 7/30/90 gün seçilebilir. Onaylı temizlik
yalnız yeni uygulamanın sahiplik kaydındaki gelen dosyalara uygulanır; favorileri
ve yönetilmeyen orijinalleri korur. 24 saatten eski, aynı instance'a ait geçici
upload/outbox dosyalarının açılış temizliği vardır. Gerçek disk dolması ve zorla
kapatma kabulü hâlâ bekliyor; otomatik test başarısı bunların yerine geçmez.

Windows pano yardımcısında ayrıca 30 saniye süre ve 128 MiB **kodlanmış işlem
çıktısı** sınırı bulunur. Bu, dosya aktarımına eklenen genel bir üst sınır değildir;
PowerShell'den metin/görsel/dosya listesi alınırken aşırı bellek veya takılmayı
sınırlar. Görsel/veri Base64 ve JSON ile kodlandığından ham dosya boyutuyla aynı
değildir. Aşım 413, süre aşımı `clipboard_timeout` olarak bildirilir.
Dosya türüne göre hedef uygulama yapıştırmayı desteklemeyebilir; bir metin giriş
alanına PDF yapıştırılamaması tek başına aktarımın başarısız olduğu anlamına gelmez.
