# Değişiklik kaydı

## Unreleased — 2026-10-03 — ilk kurulum önkontrol adımı

- Paket bütünlüğü, Node/WebView2 sürümü, platform, yazma erişimi, disk alanı ve
  port durumunu ayrı sonuçlarla değerlendiren önkontrol motoru eklendi.
- Var olan hedefler ve bağlantılı klasör ataları reddedilir. Aynı diskte program
  ve veri alanı ihtiyacı birlikte hesaplanır. Eksik bilgi ve zaman aşımı engeldir.
- Başlangıç tercihi varsayılan kapalı; kontrol sonucu ayarı uygulamaz. Hata
  raporlarına kişisel yollar veya ham sistem hataları konulmaz.
- On yeni sentetik test ve önkontrol/adaptör sözleşmesi belgesi eklendi.

Sınır: gerçek Windows adaptörleri ve kurucu bağlantısı henüz yok. Sonuç daima
`productionReady: false` içerir. Kurulu uygulama, veri şeması, API ve kestirmeler
değişmedi; kaynak/üretim korumaları kaldırılmadı. Bu adım dağıtılabilir exe değildir.

Doğrulama: son üç tam koşu 78/78, Edge UI ve 100 kaynaklık kontrol geçti. Bir ara
koşuda yaklaşık 853 saniyelik uzama ve dört mevcut aktarım testi hatası görüldü;
neden doğrulanmadı ve durum kaydına eklendi. Yeni önkontrol testleri o koşuda da
geçti. Gerçek Windows kurucu/kullanıcı cihazı kabulü yapılmadı.

## Unreleased — 2026-10-03 — yalıtılmış çalışma ve yayın altyapısı

- Ortak Node/C#/PowerShell veri kökü, açık runtime modu, ayrı test portları,
  instance kimliği/kilidi, schema 1 ve uyumsuz veri reddi eklendi. CWD verisi ve
  eksik test ayarında kişisel kurulum geri dönüşü kaldırıldı.
- Offline copy-only veri göçü: doğrulanmış özel yedek, staging, iç geçmiş yol
  düzeltmesi ve kaynak değişikliği kontrolü. Üretim göçü çalıştırılmadı.
- Tailscale'siz ilk kurulum denetleyicisi, süreli yalnız-public-CA HTTP sunucusu,
  parmak izi/elle güven onayı, masaüstü sihirbazı ve yerel HTTPS eşleştirme eklendi.
  Gerçek iPhone/Windows izin kabulü henüz yok; üretim açılışı kapalı tutuldu.
- Ayrı Windows izin temizliği yalnız uygulamaya ait eski/yeni kuralları hedefler.
  Önce uygulama güveni kapanır; UAC iptalinde kapalı kalır. Ağ profili/Serve değişmez.
- Depolama bilgisi, varsayılan süresiz saklama, onaylı/favori korumalı gelen dosya
  temizliği, sahiplikli eski upload temizliği ve tanılama alan izin listesi eklendi.
- Program manifesti/hash/schema doğrulayan, veri geri yüklemeyen güncelleme/geri
  alma çekirdeği yalnız yalıtılmış ortam için eklendi. Üretim updater/kaldırıcı yok.
- brace-expansion 5.0.9 → 5.0.12; temiz kilit kurulumu ve güncel audit sonucu
  sıfır bilinen açık. Bu sonuç tam güvenlik denetimi anlamına gelmez.
- Kullanıcı seçimi GPL-3.0-or-later; LICENSE ve paket/README bildirimleri eklendi.
  Logo kaynak beyanı, lisans kanıtı toplayıcı, envanter ve kaynak-kilidi SBOM raporu.
- Mimari, yaşam döngüsü, TR/EN kestirmeler, sorun giderme ve gerçek kabul matrisi.

Uyumluluk: API yöntemleri/yolları, kestirme türleri ve yönlü boyut sınırları
korundu. Yeni kaynak explicit runtime context/schema 1 bekler; eski veriye doğrudan
işaret ettirilmemeli. Üretim kurulumuna uygulanmadı. Kod rollback'i veri restore'u
değildir; daha yeni şema eski programı engeller. Sertifika/hostname/anahtar gerçek
kurulumda değiştirilmedi. Kestirmeleri bu kaynak geliştirmesi için değiştirmeyin.

Doğrulama: 68/68 test, Edge UI, 97 dosyalık kaynak kapısı, PowerShell AST, temiz npm
kurulumu, 121 bağımlılık envanteri/100 lisans-bildirim metni. Native uygulama build'i,
production updater/uninstaller ve gerçek iPhone kabulü yapılmış sayılmaz.

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
