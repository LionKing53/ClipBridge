# Değişiklik kaydı

## 1.2.1 paket incelemesi — 2026-10-10

- Yeni ürün özelliği yok. 28 native bileşenin tam sürüm/kaynak ve özgün notice
  karşılığı kontrol edildi; sabit kaynak/recipe/Cargo eşlikçisi ClipBridge adıyla
  üretilir. Native derleme rehberi prebuilt indirme, Git metadata ve değiştirilmiş
  kütüphaneyle yeniden paketleme sınırlarını açıklar.
- 156/156 tam test, Edge UI ve kaynak kapısı geçti; production npm audit sıfır
  bilinen açık bildirdi. Kişisel kurulum/veriler değişmedi, GitHub işlemi yok.
- Gerçek temiz Windows/iPhone ve ayrı ortamda libvips derleme/uyumluluk kabulü
  yapılmadı. EXE/ZIP teslimi, lisans/dağıtım onayının tamamlandığı anlamına gelmez.

## 1.2.1 — ClipBridge — 2026-10-09

- GitHub deposu kullanıcı isteğiyle `LionKing53/ClipBridge` olarak yeniden
  adlandırıldı; mevcut depo/geçmiş korunur. Yerel origin ve güncel bağlantılar
  yenilendi, Git erişimi doğrulandı. Uygulama kodu/kişisel kurulum değişmez.

- GitHub kaynak yayını ClipBridge 1.2.1 adı, güncel README/kurulum belgeleri
  ve İngilizce görselleri içerir; mevcut depo adresi korunur. Yayın kontrolünde
  13/13 hedefli test ve Edge UI geçti; kaynak/görsel gizlilik kapısı geçti.
  Kişisel kuruluma bu çalışmada dokunulmaz; yeni genel EXE/ZIP yayımlanmaz.

- Teslim kodu `e10c40d` (`fff9c41` ana ad değişikliği). Mevcut kişisel uygulamaya
  1.2.1 ad/dil yaması ve iki ClipBridge kısayolu uygulandı. 2.229 dosyalı özel
  doğrulanmış yedek/kod geri alma; 65 korunan veri özeti, kimlik ve geçmiş/favori
  korunumu doğrulandı. Native pencere ve kurulu TR/EN yeniden açılış geçti.
  İlk testin monogramı da okuyan selector'u düzeltildi. Yeni genel paket/yayın yok.

- Türkçe/English için aynı ClipBridge adı; cb UI monogramı, native ürün bilgisi,
  yeniden adlandırılmış launcher/SVG, yeni kurulum/program/veri/paket/kısayol ve
  çalışma ortamı adları. Yeni hostname/CA/firewall ClipBridge kullanır.
- Çalışan eski iPhone kimliği/veri dizini/launcher hedefleri otomatik taşınmaz.
  Eski header/tema/public-CA uyumluluğu; iki marka için dar firewall sahipliği.
  Eski kişisel kökler geliştirmeden korunur, eski kurulum yeni kurucuyu engeller.
- Hedefli marka/veri sınırı/sertifika/tema testleri ve sentetik ClipBridge ekran
  görüntüleri. Son tam takım 156/156, TR/EN UI/native derleme/form kontrolleri geçti;
  son test/kişisel yama kanıtı ayrı teslim kaydında tamamlanacak.
- API yolları/portlar, veri şeması, kullanıcı içerikleri ve kimlikler değişmez.
  Genel kurulum paketi veya GitHub yayını yok; önceki 1.1.0 paket tarihsel kalır.

## 1.2.0 — Türkçe / English — 2026-10-09

- GitHub belgeleri gerçek kalıcı English seçimine uyarlandı; yalnız Türkçe
  arayüz açıklaması kaldırıldı. Dört ekran görüntüsü gerçek İngilizce UI ve
  sentetik verilerle yenilendi; görsellerde belgeye özel çeviri uygulanmaz.
- Geçmişteki onaylı görsel sürümleri ayrı hash listesiyle korunur; onaysız
  görseller/metaveri hâlâ reddedilir. 9/9 hedefli test ve Edge UI kontrolü geçti.
  Genel kurucu paketi yenilenmedi; temiz Windows/iPhone kabulü hâlâ bekliyor.

- Teslim kodu `9aae4d2c225665477150eea76f113151ebfb080e`. Mevcut kişisel kurulumda
  1.2.0 dil yaması uygulandı; 1.2.0.0 launcher mevcut WebView2 SDK ile derlendi.
  Doğrulanmış özel yedek/kod geri alma yolu var; 65 korunan veri özeti, geçmiş ve
  favoriler değişmedi. EN tercihi yeniden açılışta korundu; Türkçe bırakıldı.
- 151/151 tam test, 6/6 hedefli dil/native/uyum testi, TR/EN Edge/native render,
  SDK assembly kontrolü ve gerçek kurulu masaüstü açılışı geçti. İlk testin kendi
  keep-alive bağlantısı ve SDK referans uyumsuzluğu teslim öncesi düzeltildi.
  Temiz Windows/iPhone kabulü değildir; eski genel paket yeniden üretilmedi.

- Gerçek kalıcı dil seçimi; merkezi TR/EN UI/hata/native katalogları. Masaüstü,
  kurulum/kaldırma/tepsi/launcher, sertifika/eşleştirme ve telefon rehberleri.
- Dile uygun tarih/sayı, arama ve ad sıralama; erişilebilirlik/tooltip/alt metinleri.
  İngilizce uzun metinler için responsive/native satır kaydırma.
- Ayrı `ui-settings.json`; mevcut kullanıcıda Türkçe, yeni kurulumda sistem dili.
  Dil kaydı geçmişi budamaz; veri şeması, anahtar/sertifika/ağ/içerik değişmez.
- Eski kişisel düzene hash-pinned dil yaması; otomatik güncelleme/veri göçü değildir.
  Kontrollü dağıtım/geri alma sonucu ve kaynak commit'i teslim kaydında tutulur.
- TR/EN tarayıcı ve native sentetik kontroller; gerçek cihaz kabulü sayılmaz.

## Tek İngilizce README — 2026-10-09

- Gereksiz README.en.md yönlendirme dosyası kaldırıldı; İngilizce belge README.md.
  Türkçe bağlantı düzeltildi. Kaldırılan kaynak geçmişte taranmaya devam eder;
  aktif kaynak/paket girdisi değildir. Uygulama/API/veri şeması değişmedi.

## English-first README ve görseller — 2026-10-09

- İngilizce ana README ve ayrıntılı kurulum/kaldırma rehberi; Türkçe kopyalar
  korundu. Manuel bağlantı ve aktarım akışları Mermaid ile açıklandı.
- Açık/koyu geçmiş, güvenilen ağlar ve ilk kurulum için dört İngilizce sentetik
  belge ekran görüntüsü. UI'nin Türkçe olduğu ve görsellerin gerçek cihaz kabulü
  olmadığı açıkça belirtildi; kurulu uygulama dili/değişiklikleri yok.
- Yeniden üretilebilir yalıtılmış capture-docs.js; onaylı PNG'ler için hash/boyut/
  ölçü ve metadata kontrolü. Denetim testleri 4/4, Edge UI ve kaynak kapısı geçti.
  Sürüm/API/veri şeması ve mevcut EXE paketi değişmedi.
- Belge commit'i 23fff48 geçmiş incelemesi geçti: 22 commit / 357 blob, 4
  incelenmiş PNG; GitHub Markdown oluşturma ve belge bağlantı kontrolleri geçti.

## Kaynak GitHub yayını — 2026-10-09

- TR/EN README kaynak yayını kapsamını ve yapılmamış temiz Windows/iPhone ile
  libvips yeniden derleme/uyumluluk kontrollerini açıklar.
- Yayın sohbetinin kullanıcı onaylı kaynak yayını yetkisi AGENTS.md'ye kaydedildi.
  Uygulama sürümü/API/veri şeması değişmedi; EXE dağıtımı ve kişisel kurulum yok.
- `b0c3305` kaynak/geçmiş incelemesi geçti (152 kaynak, 20 commit, 334 blob).
  https://github.com/LionKing53/PanoKopru public deposu oluşturuldu; kaynak
  geçmişi main dalına gönderildi. Kurucu/ZIP yayımlanmadı; cihaz/native kabulü açık.

## 1.1.0 kaynak dahil paket teslimi — 2026-10-09

- `a8ea3dc` kaynağından 280.046.326 baytlık kurulum ZIP'i üretildi; native
  kaynak companion ve özgün lisans metinleri payload'a eklendi. Paket ve kaynak
  ZIP hash'leri PROJECT-STATUS.md'de. 1.407 kurulum ZIP girdisi ve 389 kaynak
  arşivi yeniden okunup hash doğrulaması geçti. Önceki paket tarihsel kaldı.
- Kaynak/değiştirme paketleme uygulaması ve 143 test tamamlandı. Gerçek native
  derleme/ABI/kaynak kapsamı incelemesi kullanıcı kararıyla ayrı ortamda;
  temiz cihaz kabulü ertelendi. Kurucu imzasız ve çalıştırılmadı. Yayın yapılmadı.

## 1.1.0 native kaynak teslimi — 2026-10-08

- Pinli native kaynaklar + Cargo kaynağı indirme, checksum reddi, upstream
  kaynak/tarif/patch snapshot'ları ve toplu lisans metinli kaynak ZIP üretimi.
- Açık seçenekli kaynak paketi ekleme ve değiştirilmiş x64 sharp/libvips
  dosyalarıyla yeni kurucu üretme. Yalnız yeni build staging değişir; kurulu
  dosya doğrulaması, kullanıcı verisi ve kişisel kurulum korunur.
- Üç hedefli dağıtım testi; yeniden derleme rehberi. Gerçek Linux/OCI native
  derleme doğrulaması kullanıcı kararıyla ayrı ortama bırakıldı, geçmiş sayılmadı.
- Tam test koşusu 143/143, Edge UI ve 152 kaynak/121 kilit girdisi kontrolü geçti.

## Paketleme kararı — 2026-10-08

- `3255866` kaynağından 1.1.0 Setup EXE ve 52.444.014 baytlık ZIP üretildi.
  1.398 arşiv girdisi yeniden okunarak hash karşılaştırması geçti; SHA-256 ve
  paket/kurucu kimlikleri PROJECT-STATUS.md'ye kaydedildi. İmzalama/çalıştırma yok.
- Kaynak/geçmiş/özel paket terim kontrolleri geçti; güncel üretim npm audit 0
  bilinen açık. Native bileşenler için kaynak sağlama ve kütüphane değiştirme
  yolu açık kaldı; yalnız lisans tablosu toplanmasıyla uygunluk onayı verilmedi.

- Kullanıcı ayrı Windows/iPhone temiz kurulum kabulünü erteledi. Test geçmiş
  sayılmadı; mevcut kişisel kurulumda yeni ağın çalışması ayrı kullanıcı beyanıdır.
- 1.1.0 EXE/ZIP üretimi devam eder. Genel yayın ve native bileşen dağıtım
  yükümlülükleri onaylanmış sayılmaz; kişisel kurulumda işlem/GitHub yayını yok.

## 1.1.0 özel kabul adayı — 2026-10-07

- Güncel npm audit'te bulunan GHSA-wq5f-xc86-pv6w nedeniyle sharp 0.35.5'e
  sabitlendi (native libvips 8.18.7, librsvg 2.63.2). Kilit dosyası yenilendi;
  temiz kurulum sonrası 140/140 test, Edge UI, kaynak kapısı ve üretim audit
  (0 bilinen açık) geçti. Kaynak: https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w

- Asenkron HTTP/pano/kurulum işleri kapanışta izlenir; devam eden izin/aktivasyon
  sonradan bootstrap veya yerel hizmeti yeniden açamaz. Kapanış tekrarları aynı işi bekler.
- Yarım ilk kurulumdan Windows izinleri temizlenebilir. Favori/temizlik aynı
  koruma kuyruğundadır; zaten silinmiş dosyaya favori isteği 409 döner.
- Çoklu ağda izinsiz ilk eşleşme atlanır; gerçekten izinli bağlı ağ seçilir.
- local-setup metni Tailscale'siz ilk sihirbazı ve manuel yol seçimini açıklar.
- Açık seçenekli temiz-kurulum test paketi, sürüm 1.1.0, SHA-256 arşivi ve TR/EN
  kısa rehber. Kaynak koruması kaynakta kalır; yalnız runtime paketleme politikası
  özel kabul için değişir. Kişisel kurulum ve GitHub değiştirilmedi.
- Dış Setup'ta veri koruyan kaldırma; yalnız sahip olunan dosya/kısayol/firewall.
  UAC iptali veya aktif süreçte silme yok. Windows profil/Tailscale değişmez;
  iPhone sertifika profili elle kaldırılır. Otomatik güncelleme/rollback/göç ertelendi.

Uyumluluk: veri şeması 1, API/port/kestirmeler aynı. Mevcut program/veri üstüne
kurulum yok. Veri koruyan kaldırmadan sonra aynı kullanıcıda yeniden kurulum yok.
Gerçek cihaz kabulü ve sharp/libvips dağıtım incelemesi bekliyor; genel yayın değil.

## Doğrulama kaydı — 2026-10-06 — `fd00755` kurucu derlemesi

- Temiz commit'ten tam native uygulama, 1.386 dosyalı / 89 üretim bağımlılıklı
  mühendislik adayı ve bağımsız kurucu derlendi. Manifest ve kurucu SHA-256 kanıtları
  PROJECT-STATUS.md'de. Bütün payload dosyalarının hash'leri doğrulandı.
- Erişilebilir Git geçmişi taraması: 13 commit, 272 blob, 13 metadata; özel yerel
  terimler dahil bulgu yok. Sezgisel tarama, kapsamlı yayın denetimi değil.
- Kurucu ve uygulama çalıştırılmadı; imzasız mühendislik çıktısı ve kaynak koruması
  korundu. Kişisel kurulum/Windows ayarları/GitHub değiştirilmedi.
- Bu belge commit'i derlenen adayın kaynak commit'ini değiştirmez. Başka bilgisayar
  kabulü için çalışabilir paket henüz verilmemeli; kalan kapılar durum belgesinde.

## Unreleased — 2026-10-06 — bağımsız ilk kurucu

- Paket hash'ine bağlı bağımsız Windows Forms kurucu ve compile-only üretici.
  Normal kullanıcı, x64/Windows sürümü, Node PE, WebView2, disk, yazma hakkı ve
  IPv4 port denetimi. Eksik Runtime için kullanıcı onaylı resmi sayfa düğmesi.
- İlk kurulum motoru mevcut programı veya veriyi benimsemez/üzerine yazmaz;
  özel staging, tekrar hash kontrolü, ready receipt ve atomik hedef taşıma.
  Kopyalama/aktivasyon öncesinde iptal; başarısız staging inceleme için korunur.
- Başlat menüsü, isteğe bağlı masaüstü ve varsayılan kapalı başlangıç kısayolu;
  mevcut kısayol korunur, kısmi başarı bildirilir. Uygulama otomatik başlatılmaz.
- Dokuz sentetik kurucu testi, toplam **132/132 test**, Edge UI ve **140 kaynak /
  121 kilit girdisi** kapısı geçti. Tam kurucu derlemesi temiz adaydan sonra
  ayrıca kaydedilecek. Gerçek Windows ACL/COM/kurulum/native kabulü yapılmadı.
- Önceki `b440145` temiz mühendislik adayı üretildi ve doğrulandı: 1.379 dosya,
  89 üretim bağımlılığı. Paket kanıtı PROJECT-STATUS.md'de; ilk kurucuyu içermez.

Uyumluluk: yeni ilk kurucu yalnız boş kullanıcı hedefi içindir; güncelleme, göç
veya kaldırıcı değildir. Kaynak/aday koruması kaldırılmadı; kurucu bu adayları
reddeder. API/veri şeması/kestirmeler ve kişisel kurulum değişmedi. Kullanıcıya
verilecek çalışabilir paket, üretim yaşam döngüsü ve gerçek cihaz kabulü bekliyor.

## Unreleased — 2026-10-06 — açılış, kurtarma ve yayın denetimi

- Native açılışta kurulum yeri/kullanıcı/ready kaydı, manifest ve dosya hash'leri
  doğrulanır; kaynak kopyası çalışmaz. Doğrulamadan sonra süreç runtime ayarlarını
  yükler. Eksik WebView2 Runtime için kullanıcı onaylı resmi indirme sayfası;
  backend başlamazsa boş WebView yerine hata. Kurucu hâlâ kayıt yazmıyor.
- Açık onaylı `--recover-lock` ve sabit Node giriş noktası: yalnız mevcut instance
  kimliğiyle eşleşen, artık yaşamayan PID'nin kilidi kaldırılır. Canlı/yeniden
  kullanılmış/belirsiz PID, bozuk/yabancı kayıt ve `instance.guard` kalıntısı korunur.
  Normal başlatma hâlâ kilidi çalmaz; kurtarma veriyi geri yüklemez veya uygulamayı açmaz.
- API/desktop ham native hata metnini döndürmez. `error` kararlı kod, `message`
  güvenli Türkçe açıklamadır. Pano/UAC/ağ/TLS/disk ayrımları ve tanılama kodu eklendi.
  Yetkisiz/validasyon doğrudan yanıtlarının mevcut biçimi korunur; catch edilen 4xx
  artık ham mesaj taşımaz. Tailscale yokluğu 500 yerine 503 olur.
- Windows pano yardımcısına 30 saniye/128 MiB kodlanmış çıktı sınırı ve sahip olunan
  çocuk işlemde hata temizliği eklendi. Bu dosya aktarımlarına genel boyut limiti
  koymaz; aşırı kodlanmış pano çıktısı artık 413, süre aşımı 504 döndürür.
- `check:history` tüm erişilebilir referansların eski içerik ve metadata'sını
  salt okunur tarar; yalnız nesne kimliği/bulgu sınıfı gösterir. Kapsamlı sır/görsel
  denetimi değil. Son dosyadan kaldırılan eski bir sentetik sırrı yakalama testi var.
- Güncelliğini yitirmiş README, saklama/temizlik, native derleme ve lisans durumu
  ifadeleri düzeltildi; kurulu açılış/kurtarma sözleşmesi belgelendi.

Doğrulama: **123/123 test**, Edge UI, tam native derleme, **133 kaynak / 121 kilit
girdisi**, PowerShell AST ve whitespace kontrolü geçti. Npm üretim audit sonucu
0 bilinen açık. İlk eski HTTP/UI beklentileri yeni typed sözleşmeye güncellendi;
son koşular geçti. Gerçek UAC/CA/firewall/pano/kurucu/native kabulü yapılmadı.

Uyumluluk: schema 1, kimlik/portlar, başarılı API yanıtları ve kestirme yolları
değişmedi. Receipt olmayan legacy kurulumun üstüne kopyalanamaz; kontrollü kurucu
ve veri geçişi gerekir. Kişisel kurulum değiştirilmedi. Kurucu, updater/rollback,
kaldırıcı, imzalı yayın, nihai lisans ve gerçek cihaz kabulü hâlâ yayın engelidir.

## Doğrulama kaydı — 2026-10-03 — `0c884b3` mühendislik adayı

- Temiz commit'ten ikinci aday paket: 1.367 dosya, 89 üretim bağımlılığı;
  dosya manifesti ve hash'ler doğrulandı. Native derleme, UI ve kaynak kapısı geçti.
- Tam test takımı son tekrarında da 111/111; üretim npm audit sonucu 0 bilinen açık.
- Paket SOURCE-CHECKOUT korumalıdır; kullanıcı kurucusu/yayın paketi değildir.
  Kurulum, güncelleme/geri alma, kaldırma entegrasyonu ve gerçek kabul bekliyor.
- Bu kayıt yalnız belgelendirmedir; adayın kaynak commit'ini değiştirmez.

## Unreleased — 2026-10-03 — sahiplikli kontrollü durdurma

- Launcher kendi başlattığı Node sürecini kalıtılan stdin pipe üzerinden durdurur.
  Ebeveyn kapanması da temiz çıkışı tetikler; ağdan açık kapatma endpoint'i yok.
- Tray tam durdur ve `--stop` eklendi; kullanıcı/instance kapsamlı olaylar,
  yaklaşık 30 saniyelik bekleme ve hata çıkış kodu. Takılan süreç zorla öldürülmez
  ve sahiplik mutex'i erken bırakılmaz. Üç denemeden sonra otomatik yeniden
  başlatma durur; stale lock körlemesine silinmez.
- Eşzamanlı Node kapanışları aynı tamamlanma promise'ini bekler. Node child
  ortamından kod enjekte edebilen NODE_OPTIONS/NODE_PATH kaldırılır.
- Sentetik C# çocuk süreç testi dahil altı kontrol testi geçti;
  tam uygulama derlendi ama çalıştırılmadı. Native kabul ve kurucu hâlâ bekliyor.

Kişisel kurulum, Windows ayarları, veri şeması ve kestirmeler değiştirilmedi.
Kaynak/aday üretim korumaları korunuyor; yayımlanabilir paket onayı değildir.

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
