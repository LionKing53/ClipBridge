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
geri almaz; Tailscale yolunu kapatmaz. Kaynakta ayrı Windows izinlerini temizle
işlemi eklendi: önce uygulama izinlerini kapatır, sonra yönetici onayıyla yalnız
adı/grubu/yürütülebilir hedefi eşleşen eski ve yeni kuralları temizler. İptalde
yerel erişim kapalı kalır; İzni onar gerekir. Windows profilini geri çevirmez.
Gerçek UAC/firewall kabul testi henüz yapılmadı.

## Sertifika ve ilk kurulum sınırı

Mevcut kişisel sürümün eski ilk sertifika rehberi Tailscale'e dayanır. Yeni kaynakta
Tailscale'siz ilk kurulum eklendi, kişisel kuruluma uygulanmadı. Kullanıcı canlı
ağı seçip Özel profil etkisini onaylar. Geçici HTTP uç noktası yalnız herkese açık
CA sertifikasını sunar: en çok iki dakika, 16 indirme, seçilen IPv4/alt ağ,
tam Host ve Origin denetimleri. Pano API'si/anahtar/özel anahtar sunulmaz.
Telefon parmak izi doğrulaması ve elle güven onayından sonra HTTP kapanır, HTTPS
açılır; eşleştirme sırrı yalnız HTTPS üzerinden kullanılır. Bu TLS atlatma değildir.
Gerçek iPhone'da ilk indirme/profil/sertifika ayrıntıları ve güven adımları henüz
doğrulanmadı. Deneme başarısı olmadan bu akış yayınlanmamalıdır.
iPhone'a elle yüklenen kök CA için tam güven verilmesi sadece bu ağa/adrese
özgü bir izin değildir. Parmak izi bağımsız olarak karşılaştırılmalıdır. TLS
doğrulamasını kapatmak veya sertifika uyarılarını atlatmak çözüm değildir.

CA özel anahtarı Windows CurrentUser sertifika deposunda dışa aktarılamaz;
PFX parolası DPAPI/CurrentUser ile korunur. Bir klasör yedeği başka bilgisayarda
kimliği geri yüklemek için yeterli değildir. Hesap/bilgisayar değişimi ve yeniden
eşleştirme ayrı tasarlanmalıdır. iPhone'daki profil kaldırma elle yapılır.

Bu kaynak kopyasından eski PowerShell yardımcılarını çalıştırmayın. Veri kökü,
farklı yönetici hesabıyla UAC ve sahiplik denetimleri tamamlanmadan dağıtım yoktur.

Apple'ın elle yüklenen sertifikalar için tam güven açıklaması:
[Manually installed certificate profiles](https://support.apple.com/en-ca/102390).
Kök parmak izini bilgisayar ile telefondaki sertifika ayrıntıları arasında,
güven vermeden önce karşılaştırın. Kestirmede/Safari'de TLS doğrulamasını kapatmayın.
