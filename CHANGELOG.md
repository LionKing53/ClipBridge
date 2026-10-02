# Değişiklik kaydı

## Unreleased — 2026-10-02 — geliştirme tabanı

- Tek ana kaynak ayrıldı; kurulu kişisel uygulama ve verileri değiştirilmedi.
- Yalnız izin verilen kaynaklar alındı; özel test/belge örnekleri temizlendi.
- Masaüstü sistem sınırı enjekte edilebilir hale getirildi; arayüz testi örnek
  hostname/Tailscale ve işletim sistemi işlemleriyle çalışacak şekilde değişti.
- Eksik test adaptörü reddedilir. Gerçek çalışma başlatma ve etkili yardımcılar
  veri kökü/port/süreç yalıtımı tamamlanana kadar kaynak kopyasında engellenir.
- Çalışma kuralları, durum, plan, test kapsamı ve tek-yazarlı kilit eklendi.
- Temiz bağımlılık kurulumu, 45/45 test, sentetik UI testi ve 63 dosyalık kaynak
  izin-listesi kontrolü geçti; PowerShell yalnız sözdizimi bakımından incelendi.

Uyumluluk: kişisel kurulum, API/kestirme sözleşmesi ve aktarım limitleri değişmedi.
Yeni bir veri şeması veya geçiş çalıştırılmadı. Bu kaynak henüz dağıtılamaz;
kurulu programın üzerine kopyalanmamalıdır. Üretim geri alma işlemi gerekmedi.
Paket/launcher sürüm numaraları geçmişten korunmuştur; yayın etiketi değildir.
