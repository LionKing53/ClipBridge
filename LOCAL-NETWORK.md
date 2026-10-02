# Yerel ağ güvenlik modeli

Mevcut uygulama izin verilen bağlı ağ üzerinde HTTPS kullanır. Yerel adres
kurulumda üretilen `panokopru-<rastgele-kimlik>.local` adıdır; bu bir kullanıcının
gerçek adresi değildir. Yerel API yolu `/api/v1/clipboard`, tür yolu
`/api/v1/clipboard/kind`; iki yön de erişim anahtarı gerektirir.

Ağ ekleme bağlı ağı sunucuda yeniden doğrular. Kullanıcı onayından sonra sabit
yardımcı UAC ile çalışır. Başarılı izin ve yeniden doğrulama olmadan uygulama
güveni kaydedilmez. Windows ağı Özel profile alınır; uygulamanın firewall izinleri
Node yürütülebiliri, Private profil, ilgili arayüz ve LocalSubnet ile sınırlıdır.

Özel profile geçiş diğer uygulamaların mevcut Private kurallarını da etkileyebilir.
Ağ adı/profil eşleştirmesi kriptografik kimlik doğrulaması değildir; esas koruma
TLS ve erişim anahtarıdır. Ağ başına kural adı SSID'ye kilitlenme anlamına gelmez.
Uygulamanın ağ kontrolü bu nedenle korunmalıdır.

Listeden çıkarma uygulama güvenini kaldırır, yerel bağlantıları kapatır ve kalan
izinli ağları yeniden değerlendirir. Windows profilini veya firewall kurallarını
geri almaz; Tailscale yolunu kapatmaz. Eski kaldırma yardımcısı yeni ağ başına
kuralları kapsamıyor. Ayrı, sahipliği doğrulanan izin temizliği henüz geliştirilmedi.

## Sertifika ve ilk kurulum sınırı

Mevcut yerel aktarım kurulduktan sonra Tailscale'siz çalışır; ilk sertifika/QR
akışı ise hâlâ Tailscale'e dayanır. Tailscale'siz ilk kurulum henüz hazır değildir.
iPhone'a elle yüklenen kök CA için tam güven verilmesi sadece bu ağa/adrese
özgü bir izin değildir. Parmak izi bağımsız olarak karşılaştırılmalıdır. TLS
doğrulamasını kapatmak veya sertifika uyarılarını atlatmak çözüm değildir.

CA özel anahtarı Windows CurrentUser sertifika deposunda dışa aktarılamaz;
PFX parolası DPAPI/CurrentUser ile korunur. Bir klasör yedeği başka bilgisayarda
kimliği geri yüklemek için yeterli değildir. Hesap/bilgisayar değişimi ve yeniden
eşleştirme ayrı tasarlanmalıdır. iPhone'daki profil kaldırma elle yapılır.

Bu kaynak kopyasından eski PowerShell yardımcılarını çalıştırmayın. Veri kökü,
farklı yönetici hesabıyla UAC ve sahiplik denetimleri tamamlanmadan dağıtım yoktur.
