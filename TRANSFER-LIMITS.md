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
Saklama politikası, disk dolması ve çökme sonrası geçici dosya temizliği bekliyor.
Dosya türüne göre hedef uygulama yapıştırmayı desteklemeyebilir; bir metin giriş
alanına PDF yapıştırılamaması tek başına aktarımın başarısız olduğu anlamına gelmez.
