# Değişiklik kaydı

## Unreleased — 2026-10-03 — sahiplikli geçici ZIP temizliği

- Çoklu dosyaların ZIP çıktıları çakışmayan, instance/id kayıtlı klasörlere alınır.
  Arşiv oluşturma hatası, gönderme, tür sorgusu ve masaüstü yakalama sonrasında
  yalnız kendi geçici dosyaları temizlenir; asıl dosyalara dokunulmaz.
- Açılışta 24 saatten eski sahiplikli kalıntılar temizlenir. Eski sahipsiz ZIP'ler,
  yabancı dosyalar/instance'lar, değiştirilmiş sahiplik ve junction'lar korunur.
- Yedi yeni test; tam takım 105/105 ve Edge UI geçti. Şema/API/kestirme değişmedi.
- Önceki `0124d43` commit'inden ilk korumalı aday paket üretimi: 1.358 dosya ve
  89 üretim bağımlılığı bütünlük kontrolünden geçti. Kurulum/kabul/yayın değildir.

## Unreleased — 2026-10-03 — izin listeli aday paket üretimi

- Açık uygulama/native dosya listesi, tam izinli kaynak snapshot'ı ve boş
  klasöre scriptsiz üretim bağımlılık kurulumu kullanan aday üreticisi.
- Temiz commit ve değişmeyen kaynak hash'leri zorunluluğu; paket içindeki tüm
  dosyaları doğrulayan manifest, bileşen ve lisans metni envanteri.
- Kaynak koruması ve kurulamaz işareti korunur; installer/updater değildir.
- Dört yeni sentetik dosya politikası testi geçti. Gerçek aday üretimi sıradaki
  doğrulamadır; başarılı kabul testi olarak gösterilmez.

Kişisel kurulum/veri/kestirme/şema değişmedi. Üretim yaşam döngüsü ve son kullanıcı
test paketi hâlâ tamamlanmadı. GitHub işlemi yapılmadı.

## Unreleased — 2026-10-03 — doğrulanmış native derleme

- Resmi Node 24.15.0 x64 / WebView2 SDK 1.0.4258.31 için sürüm, kaynak ve
  SHA-256/SHA-512 kilidi; sınırlı, no-clobber, kesinti temizliği yapan indirme.
- Arşiv bütünlüğü, seçilmiş girdiler, bağlantılı yol reddi ve Node Authenticode
  yayıncı kontrolü; runtime ve SDK lisans/bildirimlerini koruma.
- Tam C#/WebView2 derlemesi; kaynak commit/dirty durumu ve hash kanıtları.
  Launcher lisans metadata'sı kullanıcı seçimiyle uyumlu hale getirildi.
- Yedi yeni test; 94/94 tam test, Edge UI ve gerçek native derleme geçti.

Bu bir kurucu değildir. Üretilen exe imzasız ve kaynak korumalıdır; çalıştırılmadı.
Kişisel kurulum, API, kestirme ve veri şeması değişmedi. WebView2 Runtime,
üretim yaşam döngüsü, nihai paket/SBOM ve gerçek cihaz kabulü bekliyor.

## Unreleased — 2026-10-03 — yalıtılmış Windows kurulum gözlemleri

- Önkontrol motoruna bağlanabilen gerçek Windows gözlem adaptörü: WebView2'nin
  iki registry konumu, OS mimarisi, hedef üst klasörünün erişim/disk bilgisi ve
  hash'i doğrulanmış aday Node dosyasının PE sürüm bilgisi. Dosya çalıştırılmaz.
- Sabit gizli PowerShell yardımcısı süre/çıktı sınırı ve iptal desteği kullanır.
  Hata metinleri kişisel yol/registry değeri sızdırmaz. Yönetici bağlamı normal
  kullanıcı yerine kabul edilmez; production context hâlâ engellidir.
- Yalnız yalıtılmış IPv4 loopback portları; iptal ve dolu port sonrası soket
  kapanması test edildi. Gerçek LAN/firewall/IPv6 kabulü olarak gösterilmez.
- Dokuz yeni test; toplam 87 testlik takım iki kez, Edge UI ve 105 kaynaklık
  statik kontrol geçti. İlk fixture kapsam hatası
  ortak korumayı değiştirmeden düzeltildi; ayrıntı PROJECT-STATUS.md'de.

Uyumluluk: kurulu uygulama/API/kestirme/veri şeması değişmedi. Üretim Windows
adaptörü, temiz paket/native uygulama derlemesi ve kurucu entegrasyonu bekliyor.
Gerçek kurulum dosyası veya yayın üretilmedi; Windows ayarları değiştirilmedi.

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
