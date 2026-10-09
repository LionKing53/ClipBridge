# ClipBridge — proje durumu

## 1.2.1 kişisel ad güncellemesi teslimi — 2026-10-09

- Kaynak/kişisel yama commit'i `e10c40d` (ana ad değişikliği `fff9c41`). Bu
  teslim kaydı programı değiştirmez. Kurulu sürüm **ClipBridge 1.2.1 ad/dil
  yaması**, eski transfer/ağ/veri çekirdeği korunur; genel yeni kurucu değildir.
- 2.229 dosyalı yeni özel yedek SHA-256 ile doğrulandı; erişim kullanıcı,
  SYSTEM ve yöneticilerle sınırlı. 65 korunan veri dosyasının özeti dağıtım ve
  UI kontrolü sonrasında aynı; geçmiş/favori sayıları korunur. CA/hostname,
  erişim anahtarı, ağ/izinler, gelen dosyalar, WebView/tema yerinde kaldı.
- Mevcut hash-pinned WebView2 DLL'leriyle uyumlu 1.2.1.0 launcher derlendi;
  native metadata ve gerçek ClipBridge penceresi doğrulandı. İki sahiplikli
  masaüstü/Başlat menüsü kısayolu ClipBridge adına çevrildi; link dosyalarının
  hash/target/arguments/icon içerikleri aynı. Özel geri alma envanteri var.
- Kurulu tarayıcı kaynaklarında gerçek ClipBridge başlığı ve TR→EN→yeniden
  açılış→TR kontrolü geçti; kişisel içerik maskelendi, pano/izin işlemi yok.
  İlk test monogramın `c/b` harflerini de başlık sanan yanlış selector nedeniyle
  başarısız oldu; selector daraltıldı, tekrar geçti. Uygulama hatası değildi.
- Yeni yama sekiz özgün program girdisini hash-pinned doğrular; otomatik
  üretilen yeni dosya adları da ClipBridge olur. Mevcut dosya/ağ adları veya
  kişisel içerik yeniden yazılmaz. Legacy sentetik HTTP kontrolü geçti.
- Önceki 1.2.0 programına yalnız kod geri alma ve ayrı kısayol-etiketi geri alma
  hazır; özel betiklerin syntax kontrolü geçti, gerçek geri alma çalıştırılmadı.
  Veri yedeği geri yüklenmez, sonraki aktarımlar kaybolmaz. Eski teknik exe/
  görev/mutex/adres/sertifika adları yalnız uyumluluk için kalır (BRANDING.md).
- `e10c40d` sonrası son tam takım **156/156**, atlanan yok; TR/EN Edge UI,
  native derleme/form render ve legacy sentetik HTTP kontrolü geçti. Kaynak
  kapısı 172 metin + 4 PNG / 121 kilit girdisi; son kaynak geçmişi 31 commit /
  531 blob / 31 metadata, özel terimler uygulanmış ve bulgu yok. Sezgisel
  kontrol, tam güvenlik/lisans denetimi değildir; teslim commit'i de taranacak.
  Yeni genel EXE/ZIP paketi üretilmedi; eski 1.1.0 çıktı değişmez.
  Temiz cihaz ve libvips derleme/kabul kapıları açık. GitHub işlemi yapılmadı.

## 1.2.1 ClipBridge adı — 2026-10-09

- Kullanıcı iki dilde tek ad olarak ClipBridge'i seçti. UI/çeviri katalogları,
  native ürün metadata'sı, launcher/kurucu/paket/asset/kısayol adları ve yeni
  kurulumun veri/program kökleri, CLIPBRIDGE ortam değişkenleri, yeni hostname/
  CA/firewall adları güncellendi. Tek ana kaynak yerinde; GitHub URL'si değişmez.
- Eski kişisel adres/sertifika/anahtar/veri/başlangıç ve süreç kimlikleri korunur.
  Uyumluluk istisnaları docs/BRANDING.md'de. Yeni ilk kurucu eski program/veri/
  bakım kilidi varsa durur; yalıtılmış geliştirme eski kişisel kökleri de reddeder.
  Eski protokol başlıkları, tema ve public-CA dosya adı için dar uyumluluk var.
- Dört İngilizce sentetik belge görseli ClipBridge ile yeniden üretildi ve
  incelendi; eski görüntü/hash ve kaynak dosya adları geçmiş denetimine eklendi.
- Son tam koşu **156/156**, atlanan yok. Ek tema/alias ve native eski-kök
  sınırı kontrolleri geçti; kişisel yedek/dağıtım sonucu teslim kaydına eklenecek.
  Edge TR/EN UI, native derleme ve kurucu TR/EN renderleri geçti. Kaynak kapısı
  172 metin + 4 onaylı PNG / 121 kilit girdisi geçti. Bağımlılıklar değişmedi.
- Kişisel ad yaması test/yedek sonrasında uygulanacak; yeni genel kurucu paketi
  henüz üretilmedi. GitHub işlemi yok. Temiz Windows/iPhone ve libvips gerçek
  yeniden derleme kapıları değişmedi; tamamlandı veya yeni yayın yapılmış sayılmaz.

## 1.2.0 kaynak yayını ve gerçek İngilizce görseller — 2026-10-09

- Yayın girdisi: ana kaynak `53d865a`; uygulama/dil teslim kodu `9aae4d2`.
  Kişisel kurulum önceki sohbetin uyguladığı 1.2.0 dil yaması olarak kalır;
  bu yayın çalışması kişisel kurulumu veya verileri değiştirmez.
- README/kurulum belgelerindeki yalnız Türkçe arayüz açıklaması kaldırıldı;
  kalıcı Türkçe/English seçimi ve kaynak sürümü 1.2.0 açıkça belirtilir.
- Dört görsel gerçek Settings → Language → English seçimiyle, yalıtılmış
  sentetik Edge ortamında yenilendi; yeniden açılışta tercih doğrulandı.
  Enjekte edilen çeviri etiketleri kaldırıldı. Her PNG görsel/gizlilik açısından
  incelendi; güncel ve geçmişteki onaylı sürümler ayrı hash'lerle sabitlendi.
- Bu çalışmada 9/9 hedefli dil/geçmiş denetimi testi ve Edge UI kontrolü geçti.
  Önceki tam test sonucu 151/151; bu yayında tam koşu tekrarlanmadı.
- EXE/ZIP yayını veya paket yeniden üretimi yok. Eski genel test paketi 1.1.0;
  temiz Windows/iPhone kabulü ve libvips yeniden derleme doğrulaması bekliyor.
- Yayın hedefi: https://github.com/LionKing53/PanoKopru, `main`.
  Bu belge/görsel commit'i aynı kaynak dalına eklenir; tam kimliği Git kaydından
  izlenir. Kaynak kapısı 170 metin + 4 PNG / 121 kilit girdisi geçti.
  Girdi geçmişi `53d865a`: 28 commit / 411 blob / 28 metadata, bulgu yok;
  özel terimler uygulanmıştır. Son belge/görsel commit'i de push öncesinde
  aynı denetimden geçirilir. Çalışma sonunda kilit bırakılır.

## Dil güncellemesi teslimi — 2026-10-09

- Dil uygulama kaynak commit'i: `9aae4d2c225665477150eea76f113151ebfb080e`.
  Ana uygulama değişikliği `2848361`; USB etiket düzeltmesi `bf04871`; son
  commit mevcut SDK'ya bağlanan kişisel uyumlu launcher üretimini tamamlar.
  Bu teslim kaydının sonraki commit'i program kodunu değiştirmez.
- Kişisel kurulum **1.2.0 dil yaması** olarak uygulandı; eski transfer/ağ/veri
  çekirdeği korunur. Yeni genel kurucuyla yeniden kurulum veya veri göçü yok.
  İlk özel yedek 2.214, ek son durum yedeği 2.223 dosya: SHA-256 doğrulandı;
  erişim yalnız kullanıcı/SYSTEM/yöneticilerle sınırlandı. Özel yollar/manifestler
  Git dışındadır. 65 korunan veri dosyasının özetleri değişmedi; geçmiş/favori
  sayıları aynı. Tema/WebView profili yedeklendi, yerinde tutuldu.
- Kurulu SDK (1.0.4191.47) ve runtime değiştirilmedi. Native launcher'ın assembly
  referansları bu SDK ile doğrulandı; gerçek masaüstü penceresi açıldı. Kurulu web
  kaynaklarında TR→EN→yeniden açılış→TR kontrolü geçti; özel içerik maskelendi,
  gerçek pano/izin/sertifika işlemi çalıştırılmadı. Uygulama Türkçe bırakıldı.
- İlk yeniden açılış doğrulamasında testin kendi HTTP keep-alive bağlantısı
  aktif aktarım korumasına takıldı; test bağlantıları kapatıldı, koruma korundu.
  Daha yeni derleme SDK'sı yerine mevcut hash-pinned SDK'ya bağlanıldı. Bu
  kontroller düzeltilip tekrar geçti; veri sıfırlama/geri yükleme yapılmadı.
- Manuel kod geri alma yolu ve doğrulanmış özgün program dosyaları özel alanda
  hazır. Yalnız programı geri alır; yeni aktarımları/kişisel verileri eski yedekle
  değiştirmez. Gerçek geri alma çalıştırılmadı; üretim otomatik updater açılmadı.
- Tam test koşusu 151/151; hedefli dil/native/uyum testleri 6/6; TR/EN Edge UI,
  native form renderleri, SDK uyumlu derleme ve legacy sentetik HTTP testi geçti.
  Kaynak kapısı 170 metin + 4 onaylı PNG / 121 kilit girdisi; diff temiz.
- GitHub'a push/yayın yok. Önceki 1.1.0 dağıtım paketi güncellenmedi; legacy özel
  yama genel kurulum paketi değildir. Temiz Windows/gerçek iPhone ve libvips
  yeniden derleme kabulü hâlâ açık. Yayın sohbeti README/görselleri gerçek
  İngilizce arayüze göre yenilemeli; yeni 1.2.0 genel paket ayrıca üretilmeli.

## Gerçek TR/EN yerelleştirme 1.2.0 — 2026-10-09

- Merkezi `locales` katalogları; masaüstü, ilk kurulum, sertifika/eşleştirme ve
  telefon rehberleri, native kurulum/kaldırma/launcher/tepsi metinleri çevrildi.
  Ayarlarda kalıcı dil seçimi; eski kullanıcı Türkçe, yeni kurulum sistem dili.
  Tarih/sayı, arama ve ad sıralama seçilen dile uyar. Protokol/kod/içerik sabit.
- Edge TR/EN UI ve 880 px taşma testleri geçti; İngilizce kurulum/ayar görselleri
  yalnız sentetik ve ignored build altında incelendi. Native TR/EN form renderi
  ve kalıcı ayar probe'u geçti; hiçbir kurulum/OS adaptörü çalıştırılmadı.
- Tam test koşusu 151/151 geçti; kaynak kapısı 170 metin + 4 onaylı belge PNG'si /
  121 kilit girdisi geçti. Dil/ad sıralama ve Türkçe büyük harf araması Edge'de
  doğrulandı. Native launcher derlemesi ve legacy yamanın sentetik HTTP
  dil/içerik/yetkilendirme/yerel rehber testi geçti. `git diff --check` temiz.
- Kişisel eski kurulum için hash-pinned dil uyumluluk adaptörü derlendi. Eski
  veri düzeni/aktarım/ağ çekirdeği korunur; yeni sürümün yeniden kurulum/göçü yok.
  Kullanıcı bu dil güncellemesinin yedek sonrası uygulanmasına açıkça izin verdi.
  Özel yedek/doğrulama/dağıtım sonucu ayrıca teslim kaydında belirtilecek.
- Önceki 1.1.0 EXE paketi güncellenmedi. Temiz Windows/iPhone kabulü ve libvips
  gerçek yeniden derleme doğrulaması hâlâ açık. GitHub işlemi yapılmaz.
  Belge görselleri/README yayın sohbetinde yenilenecek. Kaynak commit'i bu
  uygulama değişikliklerinin yerel commit'inden sonra teslim kaydına yazılır.

## README sadeleştirme — 2026-10-09

- Kullanıcı isteğiyle README.en.md kaldırıldı; İngilizce ana belge README.md,
  Türkçe kopya README.tr.md. Türkçe belgedeki İngilizce bağlantısı düzeltildi.
- Aktif kaynak/paket izin listesinden kaldırılan dosya, geçmiş denetiminde
  historicalFiles üzerinden içerik taramasına tabi kalır; Git geçmişi yeniden yazılmaz.
- History-audit hedefli testleri 4/4 geçti. Kaynak/diff kontrolleri ve commit
  sonrası geçmiş kapısı push öncesi çalıştırılır. Uygulama testleri yeniden
  çalıştırılmadı. Paket kaynağı
  a8ea3dc ve kişisel kurulum 1.0.0 değişmedi; güncel kaynak git log -1/origin/main.

## English-first GitHub belgeleri — 2026-10-09

- README.md İngilizce ana giriş; README.tr.md Türkçe kopya. QUICKSTART.md ayrıntılı İngilizce kurulum/kaldırma
  rehberi; QUICKSTART.tr.md Türkçe kopya. Kestirme rehberinde İngilizce önde.
- README ve kurulum rehberinde Mermaid bağlantı/kurulum/aktarım şemaları ve
  dört sentetik İngilizce ekran görüntüsü var. Gerçek HTML/CSS test arayüzü
  kullanıldı; İngilizce etiketler yalnız belge önizlemesine uygulanır. Uygulama
  yerelleştirmesi yapılmadı; kurulu UI Türkçe, kişisel kurulum değişmedi.
- Görseller tek tek incelendi: yalnız DEMO-PC/Demo Home, örnek metin/görsel/PDF;
  kişisel yol, anahtar, sertifika/QR veya gerçek kullanıcı verisi yok. PNG metadata
  engeli ve dosya bazında SHA-256/boyut/ölçü pinleri kaynak/geçmiş denetimine eklendi.
- Bu çalışmada capture-docs.js geçti; history-audit.test.js 4/4 ve Edge UI testi
  geçti. Kaynak kapısı 157 metin + 4 onaylı belge PNG'si / 121 kilit girdisi geçti.
  Belge bağlantı/kod bloğu/UTF-8 kontrolleri ve git diff --check geçti.
  Tam 143 testlik önceki koşu yeniden çalıştırılmadı. Belge commit'i 23fff48
  üzerindeki geçmiş taraması geçti: 22 commit / 357 blob / 22 metadata,
  4 hash-pinned görsel; özel terimler dahil bulgu yok. GitHub Markdown API'si
  README ve rehberi oluşturdu; bir bağlantı ve iki kurulum/aktarım Mermaid bloğu
  korundu. Teslim kaydı sonrasında geçmiş kapısı push öncesi tekrar çalıştırılır.
- Yayımlanan kaynak kimliği için git log -1 ve origin/main esas. Önceki EXE
  paket kaynağı a8ea3dc, kişisel kurulum 1.0.0 (kaynak commit'i bilinmiyor).
  EXE dağıtımı yok; temiz Windows/iPhone ve gerçek native yeniden derleme açık.

## Kaynak GitHub yayını — 2026-10-09

- Kullanıcı yayın sohbetine kaynak deposunu herkese açık GitHub'a yayımlama
  yetkisi verdi. Depo: https://github.com/LionKing53/PanoKopru (public).
  İlk kaynak yayını `b0c3305`; EXE/ZIP release eki yok.
- İnceleme başlangıcı `bfe6a2d`, çalışma ağacı temiz. Kaynak kontrolü bu
  çalışmada yeniden geçti: 152 izinli metin dosyası / 121 kilit girdisi.
- TR/EN README temiz Windows/iPhone kabulünün ve libvips yeniden derleme/
  uyumluluk kontrolünün henüz yapılmadığını açıkça belirtir.
- 143/143 test ve Edge UI önceki geliştirme kanıtıdır; bu belge değişikliğinde
  yeniden çalıştırılmadı. Paket kaynağı `a8ea3dc`, kişisel kurulum mevcut 1.0.0;
  kurulu kaynak commit'i bilinmiyor. Kurulum/veri değişikliği yok.
- İlk push öncesi `b0c3305` üzerinde kaynak kontrolü ve erişilebilir geçmiş
  taraması geçti: 20 commit / 334 blob / 20 metadata, bulgu yok; yerel özel
  terimler uygulandı. Ek token/URL/tailnet örüntü kontrolündeki 5 blob eşleşmesi
  incelendi: yalnız sentetik test verileri. İzin listesi 152 Git dosyasıyla birebir
  aynı; Git yazar/committer metadata'sı kişisel e-posta içermez.
- Public depo oluşturuldu ve `main` Git geçmişi `origin` üzerine gönderildi.
  Bu teslim kaydı ayrıca commit edilecek; kesin güncel kaynak kimliği `git log -1`
  ve uzak `main` ile doğrulanır. Paket kaynağı hâlâ `a8ea3dc`.
- Denetim sezgiseldir; binary dağıtım/lisans, libvips gerçek yeniden derleme ve
  temiz Windows/iPhone kabulü tamamlanmış sayılmaz. Testler yeniden çalıştırılmadı.
- Aşağıdaki "yayın yapılmadı/onay yok" ifadeleri önceki paket teslimlerinin
  tarihsel kaydıdır. Kaynak yayını izni, binary dağıtım onayı değildir.

## Güncel paket teslimi — 2026-10-09

- Paket kaynak commit'i: `a8ea3dc9b43064217aea1ccfc888bb7e3294dcdf`.
  Sonraki teslim kaydı değişiklikleri bu paketin kaynak kimliğini değiştirmez.
- Güncel çıktı: `build/candidate-57c8acb7-9b7c-4e73-9f38-7d95b81fcb12/`.
  `PanoKopru-1.1.0-win-x64-test.zip`: **280.046.326 bayt**, 1.407 girdi.
  SHA-256: `eabd9b845cba815a135a0223968a9d8e851a58dbca8ad2007701376ad9a2e2b9`.
- Setup SHA-256: `4d9dc4f5447e098b027cfffd61ea154ed50a5aa75658fc6aa05b36d68dc2b1a1`.
  Manifest SHA-256: `caead6a36f7bc101526dc6fb034bc4d62e0dda8617a6ca07ec5b2137da5d8db3`.
  1.402 payload dosyası ve 89 üretim bağımlılığı. Setup ve uygulama derlendi;
  imzalama, çalıştırma veya kurulum yapılmadı. EXE yanında payload gerekir.
- Kaynak companion: `build/native-sources-10daa8f6-7f0a-483f-8dee-02b7c5d5ad92/`
  içindeki `PanoKopru-sharp-0.35.5-sources.zip`, **227.427.285 bayt**.
  SHA-256: `fb12ba7b210e5e048a2b2a57200fb40c156c06059207286c15f83bc89ac300ab`.
  Aynı ZIP kurulum payload'ının `sources/` bölümünde de bulunur; 742 özgün
  lisans/telif/yazar metni `review/NATIVE-NOTICES.txt` içinde teslim edilir.
- Companion içindeki 389 kaynak/tarif arşivi checksum ile yeniden doğrulandı.
  Kurulum ZIP'inin 1.407 girdisinin tamamı yeniden okunup dosya hash'leriyle
  karşılaştırıldı; tekrar/yabancı yol ve kaynak/runtime koruma ayrımı geçti.
  Özel terim taraması geçti. Kaynak geçmişi 18 commit / 326 blob / 18 metadata
  taramasında bulgu yok; üretim npm audit 0 bilinen açık. Tam test 143/143 ve
  Edge UI geçti. Bunlar gerçek cihaz veya gerçek native yeniden derleme değildir.
- Önceki 52 MB paket tarihsel çıktıdır; yeni kaynak teslimini içermez.
  Yayın sohbeti güncel 280 MB paketi ve companion'ı birlikte incelemelidir.

### Ayrı ortam için kalan doğrulama

Kullanıcının kararıyla gerçek libvips derlemesi ayrı ortamda yapılacak. Pinli
tariflerdeki bütün bağlı bileşen kaynak/lisans kapsamı, derleme çıktısı ve sharp
ABI/image-decoding testi gözlenmeden dağıtım incelemesi kapatılmaz. Upstream
`build.sh`, SOURCE_DATE_EPOCH için Git metadata kullanır; snapshot arşivleri
`.git` içermez. Ayrı ortamda rehberdeki pinli commit checkout'larını kullanın
veya metadata gereksinimini açıkça sağlayıp kaydedin. Baz imaj/toolchain
sürümlerini ve tarif uyarlamalarını kaydedin; byte-identical derleme iddiası yok.
Yeniden derlenen DLL/addon ile yeni paket üretip hash doğrulaması ve gerçek
görsel işleme çalışmasını ayrıca test edin. Temiz Windows/iPhone kabulü de
kullanıcının önceki kararıyla ertelendi. GitHub yayını yapılmadı; genel yayın
onayı henüz verilmedi. Kişisel çalışan kurulum değiştirilmedi.

## Native kaynak ve yeniden paketleme — 2026-10-08

- 28 native kaynak arşivi upstream MXE/libvips SHA-256 değerleriyle; librsvg'nin
  orijinal Cargo.lock dosyasındaki 357 crate checksum'larıyla indirildi/doğrulandı.
  Fontconfig için aynı hash'li MXE aynası; mozjpeg için doğru commit tarball'ı
  kullanıldı. İlk yanlış arşiv hash'i ve HTTP 406 başarısızlıkları atlatılmadı.
- libvips-Windows, MXE, sharp ve sharp-libvips'in dört tam/pinli kaynak-tarif
  snapshot'ı ve upstream patch'leri kaynak paketinde tutuluyor. 742 özgün lisans/
  telif/yazar metni toplandı; test/opsiyonel kaynakları da içeren üst kümedir.
- `--native-source-directory` kaynak ZIP'ini ve lisans bildirimlerini mühürlü
  payload'a ekler. `--native-library-directory` yalnız yeni adayın üç izinli x64
  DLL/addon dosyasını değiştirip yeni hash'lerle kurucu üretir. Kurulu dosya
  doğrulaması kapanmaz; yayıncı anahtarı gerekmez; kişisel kurulum değişmez.
- Hedefli üç test geçti: checksum/cache/yönlendirme; yeni paket hash doğrulaması;
  yanlış mimari/EXE/link/yabancı yol reddi. Gerçek DLL çalıştırma testi değildir.
- Son tam koşu: **143/143 test**, Edge UI ve **152 kaynak / 121 kilit girdisi**
  kapısı geçti. Kaynak teslimi güncel paket üretiminde ve ZIP okumada doğrulandı.
- Kullanıcı **gerçek native yeniden derlemeyi ayrı ortamda doğrulamayı seçti**.
  Bu bilgisayara Docker/WSL kurulmadı. Kaynak toplama tamamlandı; gerçek derleme,
  ABI ve tüm bağlı bileşen kaynak kapsamı ayrı incelemede doğrulanmalı.
- Rehber: `docs/NATIVE-REBUILD.md`. Önceki eksik kaynak/değiştirme yolu kaydı
  tarihsel kaldı; bunların uygulaması artık var. Genel yayın onayı verilmedi.

## Önceki paket kaydı — 2026-10-08 (tarihsel)

### Üretilen dosyalar ve kontrol kanıtı

- Paket kaynağı: `32558660ed4c63e1d634bd868f27d200ad5f64a8` (temiz commit).
  Sonraki değişiklikler kabul erteleme/teslim/lisans inceleme kayıtlarıdır;
  paketin kaynak kimliğini değiştirmez. Nihai HEAD için `git log -1` kullanın.
- Çıktı: `build/candidate-970263a0-b4f2-4577-b8f3-ba7bd8a1af64/`.
  `PanoKopruSetup.exe` tek başına taşınmaz; yanındaki `payload` gerekir.
- ZIP: `PanoKopru-1.1.0-win-x64-test.zip`, **52.444.014 bayt**, 1.398 girdi.
  SHA-256: `3f726e18bbf99c6515243ca6567b5c4ed4274ca2b9685ea1bd9313d22f7c31b3`.
- Setup SHA-256: `8953ebdb657b2996c406627d500094d7c5c446815cab239fd1cac040482a5f95`.
- Payload manifest SHA-256:
  `7f44c9f73671cb1d43b8bacd2923d73a9cac6428515ffe64ad491ef2d74b5346`.
  1.393 dosya, 89 üretim bağımlılığı. Kaynak snapshot koruması var; runtime
  koruması yalnız açık test-build politikasıyla dışarıda bırakılmıştır.
- Tam native ve Setup derlendi. ZIP yeniden açılıp bütün girdiler kaynak dosyayla
  SHA-256 karşılaştırıldı; tekrar ad/yol kontrolü ve koruma ayrımı geçti.
  Özel terim taraması ikili/metin paket girdilerinde bulgu vermedi.
- 2026-10-08 üretim npm audit: **0 bilinen açık**. Kaynak kapısı 146/121 geçti.
  Paket kaynak geçmişi: 16 commit, 309 blob, 16 metadata; sezgisel gizlilik taraması
  özel terimler dahil geçti. Bu kapsamlı güvenlik/hukuki onay değildir.
- Kurucu **imzasızdır**, çalıştırılmadı/kurulmadı. Cihaz kabulü ertelendi.
  Paket hâlâ özel inceleme/test çıktısıdır; genel yayın onayı yoktur.

Kalan somut yayın engeli: `THIRD-PARTY-NOTICES.md` içindeki native karşılık
kaynakları/eksiksiz lisans metinleri ve doğrulanmış yeniden derleme/değiştirme
yolu. Mevcut hash doğrulama değiştirilmiş DLL'yi reddettiği için basit DLL
değiştirmenin desteklendiği söylenemez. İlgili kaynak sağlama incelemesi
tamamlanmadan bu ZIP halka açık yayın adayı olarak onaylanmamalıdır.

Kullanıcı ayrı Windows/iPhone kabul testini erteledi ve EXE/paketin tamamlanmasını
istedi. Gerçek temiz kurulum testi **ertelendi; geçmedi**. Kendi çalışan kişisel
kurulumunda yeni ev ağını arayüzden eklediğini ve aktarımın çalıştığını bildirdi;
bu 1.1.0 kurucusunun kabul kanıtı değildir. Kişisel kurulum yine değiştirilmedi.
Sürümün kararlı/genel yayın onayı hâlâ verilmedi. Aşağıdaki ayrı cihaz hazırlama
planı bu kararla ertelenmiştir; yeni cihaz beklemek paket derlemesini engellemez.

## Güncel kapsam — 2026-10-07 — 1.1.0 özel kabul adayı

Bu bölüm aşağıdaki tarihsel kayıtların önündedir. Kullanıcı ilk kullanılabilir
sürümü **yalnız temiz kurulum** olarak daralttı. Güncelleme, üretim rollback'i ve
legacy veri göçü sonraki sürüme ertelendi; deneysel motorlar kullanıcı akışına
bağlanmadı. Kişisel 1.0.0 kurulumuna dokunulmadı. GitHub işlemi yapılmadı.

- Dört bulgu düzeltildi: kapanışta HTTP/asenkron kurulum işlerini bekleme ve
  geç listener açılmasını önleme; yarım kurulumda izin temizliği; favori/temizlik
  sıralaması; birden çok ağda gerçekten Windows izni olan ağı seçme.
- Eski local-setup sayfasında Tailscale gerekliliği ve otomatik yol seçimi
  beklentisi kaldırıldı. Yol seçimi hâlâ manuel.
- Explicit `build:test-package` yalnız runtime payload'ında checkout korumasını
  dışarıda bırakır; kaynak ve kaynak snapshot'ı korumalı kalır. `build:setup`
  manifest hash'ine bağlı kurucuyu derler; `package:test` özel kabul ZIP/SHA üretir.
- Aynı dış kurucuda güvenli kaldırma: tam durdurma, native süreç kilitlerini tutma,
  sahiplikli firewall/kısayol/program temizliği. Veri ve CA korunur. UAC iptalinde
  program kalır; ağ profili/Tailscale değişmez. Kısmi dosya silinmesinde bakım
  kilidi kalır. Windows Ayarlar kaldırma kaydı yok; aynı Setup saklanmalı.
- Paket/uygulama/kurucu sürümü 1.1.0 (Windows dört parçalı metadata 1.1.0.0),
  veri şeması 1. API/kestirme yolları değişmedi. Mevcut program veya veri varsa
  ilk kurucu durur. Kaldırma sonrası korunan veriyle yeniden kurulum desteklenmez.
- TR/EN adım adım rehber ve gerçek cihaz kabul listesi: docs/QUICKSTART.md.
- Otomatik doğrulama: **140/140 test**, Edge UI ve **146 kaynak / 121 kilit girdisi**
  kapısı geçti. Son üretim npm audit: **0 bilinen açık**. Tarama sharp 0.35.4 için
  yeni GHSA-wq5f-xc86-pv6w uyarısı buldu; sharp **0.35.5** olarak sabitlendi ve
  temiz npm ci sonrası bütün testler tekrar geçti. Gerçek native/UAC/firewall/iPhone
  kabulü **yapılmadı**. Kullanıcı ayrı bilgisayar/telefonu paket sonrası hazırlayacak.

Yayın engelleri: gerçek temiz Windows + iPhone temel kabulü; sharp/libvips'in
tam karşılık kaynak/build/yeniden bağlama yükümlülüklerinin dağıtıma göre kapanması;
nihai paket ve görsel gizlilik incelemesi. Toplanan bildirimler/SBOM lisans onayı
değildir. Sadece bu özel test paketi için derleme yapılıyor; genel yayın onayı yok.

Paket kaynak commit'i ve SHA-256, derleme tamamlanınca ayrı teslim kaydıyla
eklenecek. Aşağıdaki 1.0.0/korumalı aday kayıtları tarihsel kanıtlardır.

Güncelleme: 2026-10-06. **Geliştirme sürümü; genel yayına hazır değil.**
A tamamlandı. B–D çekirdekleri ilerledi; üretim entegrasyonu ve kabul kapıları açık.

## Sürüm ve sahiplik

- Tek kaynak: `%USERPROFILE%/source/PanoKopru`.
- Son adımlar: `97dfd17` doğrulanmış native derleme; `0124d43` korumalı aday paket;
  `0003fc6` sahiplikli ZIP temizliği; `0c884b3` kontrollü durdurma;
  `b440145` kurulu açılış, kilit kurtarma ve güvenli hata sözleşmesi;
  `fd00755` korumalı bağımsız ilk kurucu.
  Teslim commit'i için `git log -1`, değişiklikler için
  `git status --short` esas alınır.
- Paket `1.0.0`, launcher `1.0.0.0` miras numaralardır; yeni genel yayın yok.
- Kullanıcı proje lisansını **GPL-3.0-or-later** seçti. LICENSE, paket metadata
  ve README lisans bildirimleri eklendi. Nihai Windows paketindeki üçüncü taraf
  bileşenler için lisans uyumluluğu ayrıca kontrol edilecek.
- Logo bu proje için asistan tarafından üretildiğine ve dışarıdan alınmadığına
  ilişkin kullanıcı beyanı ASSET-PROVENANCE.md'de; bağımsız hak garantisi değil.
- Kişisel kurulum `%LOCALAPPDATA%/Programs/PanoKopru`, mevcut 1.0.0. Kurulu
  kaynak commit'i bilinmiyor. Yeni kaynak kurulu programa uygulanmadı.
- Veri göçü yok; kurulu veri hâlâ `app/.clipboard-bridge` altında. Yeni tasarımın
  hedefi `%LOCALAPPDATA%/PanoKopru`.
- Yerel kesin yollar, özel terimler ve başlangıç SHA-256'ları yalnız `.local/`.
- Geliştirme ana sohbette, yayın incelemesi ayrı sohbette. Uzak depo yok; push,
  yayın, kurulum/kaldırma, kişisel süreç yeniden başlatma yapılmadı.

## Tamamlanan kaynak işleri

- Kurulum kaydı ve paket hash/env sınırlarını doğrulayan native açılış; eksik
  WebView2 Runtime için onaylı resmi sayfa yönlendirmesi; backend başlamazsa boş
  pencere açmama. Kaynak/aday koruması korunur.
- Bağımsız ilk kurucu: pinli payload doğrulama, mevcut program/veriyi reddetme,
  özel staging/ready kurulum kaydı, atomik etkinleştirme ve isteğe bağlı kullanıcı
  kısayolları. Windows adaptörü ve iptal destekli Forms penceresi kaynakta var;
  gerçek kurulum çalıştırılmadı. Korumalı adaylar bilerek kurulamaz. Ayrıntı:
  docs/FIRST-INSTALL.md. Güncelleme veya veri geçiş aracı değildir.
- Onaylı `--recover-lock`: mevcut veri kimliği ve dosya sahiplik kaydı, ölü PID
  kontrolü ve acquire/release/recovery kilitlemesi. Canlı/yeniden kullanılmış PID,
  bozuk/yabancı kayıt veya kritik-bölüm kalıntısı otomatik silinmez. Veri restore yok.
- API/desktop yakalayıcılarında ham hata metni sızıntısı kaldırıldı; güvenli kod ve
  Türkçe mesaj. Pano okuma/yazma/süre, UAC iptal/süre/başarısızlık, ağ değişimi,
  sertifika/disk/bağlantı ayrımı. Pano PowerShell yardımcısı 30 saniye ve 128 MiB
  kodlanmış çıktı ile sınırlandı; stderr alınmaz. Tanılamaya yalnız izinli kod yazılır.
- Bütün erişilebilir Git geçmişi için salt okunur `check:history` kapısı; geçmişte
  kalıp son dosyadan silinmiş sırları da yakalayan sentetik test. Bu sezgisel araç
  nihai arşiv/QR/görsel ve kapsamlı gizlilik incelemesinin yerine geçmez.
- Launcher/Node kontrollü durdurma bağlandı: ebeveynin sahip olduğu stdin pipe,
  ebeveyn kapanınca temiz çıkış, aynı cleanup promise'i, kullanıcıya özel durdurma
  olayları, tray tam durdur ve `--stop`. PID/isimle kill yok; takılan çocuk varken
  sahiplik bırakılmaz. Altı sentetik kontrol testi ve tam native derleme geçti.
  Gerçek native start/stop/ACL/zaman aşımı kabulü yapılmadı; kurucu entegrasyonu değil.
- İzin listeli mühendislik adayı üreticisi eklendi: temiz commit zorunluluğu,
  yeni üretim bağımlılık kurulumu, tüm izinli kaynakların snapshot'ı, bileşen/lisans
  envanteri, manifest hash'i ve SOURCE-CHECKOUT koruması. Dört dosya-politikası
  testi geçti. `0124d43` kaynak commit'inden ilk gerçek aday üretimi geçti:
  1.358 dosya, 89 üretim bağımlılığı; tam manifest/hash doğrulandı. Bu aday sonraki
  kaynak değişikliklerini içermez ve kurucu değildir.
- Çoklu dosya ZIP'leri benzersiz, instance sahiplikli outbox klasörlerine alınır.
  Normal bitiş, tür sorgusu, history hatası ve stat hatasında temizlenir; başlangıçta
  yalnız 24 saatten eski kendi kalıntıları silinir. Asıl dosya/eski sahipsiz ZIP,
  başka instance ve bağlantılı klasörler korunur. Yedi yeni test geçti.
- Sabit hash'li resmi Node/SDK indirme, sınırlı ve sahiplikli cache, seçilmiş
  arşiv girdilerini doğrulayarak çıkarma ve Node yayıncı imzası kontrolü eklendi.
  Tam C#/WebView2 uygulaması temiz girdilerle derlendi. Çıktı yalnız derleme
  kanıtıdır: imzasız, SOURCE-CHECKOUT korumalı; çalıştırılmadı veya kurulmadı.
  İlk doğrulama 94/94 test, Edge UI ve native derleme geçti.
- İlk kurulum önkontrol karar motoru: doğrulanmış paket, Node/WebView2/platform,
  ayrı ve var olmayan hedefler, aynı diskte toplanan alan ihtiyacı, portlar,
  varsayılan kapalı başlangıç tercihi, süre sınırlı ve hassas bilgi sızdırmayan
  sonuçlar. On bir motor testi. Kurucu/üretim entegrasyonu yok;
  `productionReady: false` değişmez. Ayrıntı: docs/INSTALL-PREFLIGHT.md.
- Gerçek Windows gözlem adaptörü, yalnız doğrulanmış development/test context'i:
  WebView2 registry, OS mimarisi, geçici hedeflerde dosya oluşturmadan erişim/disk
  bilgisi ve hash'i doğrulanmış adayın PE sürüm bilgisi. Aday çalıştırılmaz.
  Kapsam dışı yollar/portlar, junction ve production context reddedilir. Yönetici
  gözlemi normal kullanıcı yerine kabul edilmez. Yalnız IPv4 loopback port testi;
  gerçek LAN/IPv6/kurucu kabulü değildir.
- Node/C#/PowerShell ortak runtime sözleşmesi; açık mod/veri kökü/portlar, korunan
  kişisel kök reddi, instance kimliği ve kilidi. Eksik test adaptörü gerçek sisteme
  düşmez. Şema 1, unversioned migration gereği ve yeni şema reddi.
- Bütün Node başlatma/kapatma ve kısmi port çakışması temizliği yalıtılmış testte.
  Kaynak üretim koruması hâlâ etkin; native test startup da kapalı.
- Copy-only offline göç motoru: açık durdurulmuş/aynı hesap onayı, özel ACL
  adaptörü zorunluluğu, hash doğrulanmış yedek ve staging, iç geçmiş yol düzeltme,
  eşzamanlı eski veri değişimini reddetme. Orijinali silmez.
- İlk kurulum denetleyicisi ve desktop sihirbazı: canlı ağ seçimi, süreli yalnız
  public CA HTTP indirme, parmak izi + elle güven onayı, ardından HTTPS ve yerel
  pairing QR. Üretim composition kodu var; gerçek Windows/iPhone'da çalıştırılmadı.
- Windows izin temizliği: önce uygulama izni kapalı, sonra UAC ile yalnız
  adı/grubu/runtime hedefi eşleşen eski/yeni kurallar. İptalde kapalı kalır;
  profil ve Tailscale değişmez. Sahte işlemler/yüklem testleri; gerçek firewall yok.
- Depolama ekranı, varsayılan süresiz saklama, onaylı yeni yönetilen inbox
  temizliği, favori/harici dosya koruma, aynı instance'ın eski upload temizliği.
- Tanılama alan izin listesi, yerel aktarım etiketi, hassas native exception
  metinlerini loglamama, temel kararlı hata kodları.
- **Yalnız yalıtılmış** release-store çekirdeği: manifest sürüm/commit/schema ve
  dosya hashleri, izin listesi, staging/journal/active pointer, açık recovery ve
  veriyi geri yüklemeyen rollback. Üretim bağlamını reddeder; gerçek updater değil.
- brace-expansion 5.0.9 → 5.0.12. Temiz bağımlılık kurulumu, kaynak-kilidi SBOM,
  envanter ve lisans/bildirim metni toplayıcı.
- AGENTS/README/CHANGELOG ve mimari, yaşam döngüsü, TR/EN kestirmeler, sorun
  giderme, lisans kanıtı ve kabul matrisi güncellendi.

## Son geliştirme doğrulaması — 2026-10-06 — ilk kurucu

- `npm.cmd test`: **132/132 geçti, 0 atlanan**; Edge headless UI geçti.
- Kaynak kapısı **140 izinli dosya / 121 kilit girdisi**. Yeni bağımlılık yok.
- Dokuz testlik derlenmiş kurucu harness'i yalnız geçici sentetik dosyalarda
  çalıştı: ilk kurulum, mevcut hedef/veri, bozuk kaynak, aktivasyon yarışı,
  iptal, kısmi kısayol hatası, junction ve yabancı kilit. Gerçek Windows adaptörü,
  ACL/COM/başlangıç, üretim portları ve uygulama çalıştırılmadı.
- Temiz `fd00755076c7cdf659534d71082c7cc42ef76f95` commit'inden tam native uygulama,
  yeni korumalı aday ve bağımsız `PanoKopruSetup.exe` **başarıyla derlendi**.
  Aday: **1.386 dosya, 135.959.405 payload baytı, 89 üretim bağımlılığı**.
  Manifest SHA-256: `f5c05399e16df77b8f65d6e4f19c87bf3724c056fcdf437e01bdf7d84d0c896a`.
  Kurucu SHA-256: `5353e7c534b988c50c4b7962f858b8b731d8d766bd0ed877ba7e170bafe6dc9e`.
  Yerel kanıtlar: `build/candidate-6868216a-c53e-4b36-9ccf-56e2de81214a/`
  altındaki `candidate-evidence.json` ve `setup-build-evidence.json`.
  Kurucu imzasızdır, **çalıştırılmadı** ve korumalı payload'ı kuramaz. Kullanıcıya
  verilecek çalışabilir kabul paketi yok. Bu sonraki belge kaydı adayın kaynak
  commit'ini değiştirmez; derleme başarıları gerçek kurulum kabulü değildir.
- `fd00755` üzerindeki `check:history`: **13 commit, 272 blob, 13 metadata**,
  özel yerel terimler dahil bulgu yok. Yalnız o andaki referansların kanıtıdır;
  sonraki commit'ler yayın öncesinde yeniden taranmalı. Kapsamlı gizlilik incelemesi
  yerine geçmez. Çalışma ağacı/whitespace kapısı geçti.
- Önceki temiz `b440145f303ef897a7632e1596e60baf98a48971` aday üretimi geçti:
  **1.379 dosya, 135.910.893 payload baytı, 89 üretim bağımlılığı**.
  Manifest SHA-256: `4821ace4db838690fe11151ab3842e93ca7c2b9d017b93016fae9352b441c2d5`.
  Yerel kanıt: `build/candidate-6aba98a7-2d02-4759-99f8-79d66f8e06ea/candidate-evidence.json`.
  Bu aday ilk kurucu değişikliklerini içermez; kurucu/uygulama çalıştırılmadı.

## Önceki geliştirme doğrulaması — 2026-10-06 — açılış/kurtarma

- `npm.cmd test`: **123/123 geçti, 0 atlanan** (önceki 111'e 12 yeni test).
- Edge headless UI geçti; tam C#/WebView2 native derleme geçti. Native uygulama
  veya kurucu çalıştırılmadı. Son derleme çalışma ağacı hash'leriyle kaydedildi;
  temiz commit'ten dağıtım paketi kabulü değildir.
- Kaynak kapısı **133 izinli dosya / 121 kilit girdisi**, PowerShell AST ve
  `git diff --check` geçti. Yeni bağımlılık eklenmedi.
- `npm.cmd audit --omit=dev --json`: **0 bilinen npm üretim açığı**. Node/SDK/native
  bileşenlerin bütünü veya gelecekteki açıklar hakkında güvenlik garantisi değildir.
- İlk geçmiş taraması değişiklik öncesi 11 commit, 212 blob ve 11 metadata
  nesnesinde bulgu üretmedi; Git dışı özel terimler uygulandı. Bu sayı yeni
  değişikliklerin commit edilmeden tarandığı anlamına gelmez; her yayın öncesi
  güncel commit üzerinde tekrar çalıştırılmalıdır.
- İlk dar test koşusunda eski 500 beklentisi yeni `tailscale_unavailable`/503 ile
  uyuşmadı; beklenti güvenli kodu da denetleyecek şekilde güncellendi. İlk UI
  koşusundaki eski generic iptal fixture'ı yeni typed hata sözleşmesine geçirildi.
  Son dar/tam/UI koşuları geçti; gerçek Windows hatası düzeltilmiş gibi sunulmaz.
- README/TR-EN, aktarım/depolama sınırları, test/kabul ve yaşam döngüsü belgelerinin
  eski “native derleme yok / saklama ve geçici temizlik yok / lisans seçilmedi”
  ifadeleri düzeltildi. Başlatıcı sözleşmesi docs/INSTALLED-LAUNCH.md'de.
- Kurulu kişisel uygulama/veri, ağ izinleri/CA, kestirmeler ve GitHub değişmedi.
  **İlk kurucu, üretim updater/rollback/kaldırıcı ve gerçek cihaz kabulü bitmedi.**

## Önceki geliştirme doğrulaması — 2026-10-03

- `npm.cmd test`: **111/111 geçti, 0 atlanan**. Son eklenen kapsam: 7 indirme,
  4 paket dosyası politikası, 7 outbox temizliği, 6 sahiplikli durdurma testi.
- Edge headless UI, tam C#/WebView2 native derleme, **123 izinli kaynak / 121 kilit
  girdisi** statik kapısı ve whitespace kontrolü geçti. Native uygulama açılmadı.
- Derlenmiş kontrol harness'i yalnız sentetik Node çocuğunu başlatıp stdin ile
  durdurdu; gerçek clipboard/network/CA adaptörü veya kişisel süreç kullanılmadı.
- Güncel mühendislik adayı `0c884b3e7f18922af24b96752fdbd68bf2369c54` commit'inden
  temiz çalışma ağacıyla yeniden üretildi: **1.367 dosya, 135.829.847 payload baytı,
  89 üretim bağımlılığı**. Bütün dosyalar manifest/hash kontrolünden geçti.
  Manifest SHA-256: `8034f3e88408a04e2f189ee4997d63e2090cca595923808fb4b080ddb5e5507a`.
  Yerel kanıt: `build/candidate-057fc241-d79f-443a-b15d-ad36af6887d6/candidate-evidence.json`.
  Bu kaydın eklendiği sonraki belge commit'i paketin kaynak commit'i değildir.
- Son tam takım tekrarında da **111/111** geçti. `npm.cmd audit --omit=dev --json`
  üretim npm bağımlılıklarında **0 bilinen açık** bildirdi; Node/SDK/native bileşenlerin
  bütün güvenlik denetimi değildir ve sonuç zaman bağımlıdır.
- Nihai son kullanıcı kurucusu veya genel yayın hazır değil. Adaydaki kaynak
  koruması kaldırılmadı, exe çalıştırılmadı; kişisel kurulum/veri ve GitHub değişmedi.

## Önceki Windows gözlem adaptörü sonucu — 2026-10-03

- İlgili testler **19/19** geçti (11 karar motoru + 8 Windows/port adaptörü).
- `npm.cmd test`: **87/87 geçti, 0 atlanan**; tam takım bir kez daha tekrarlandı
  ve geçti. Önceki tabana 9 test eklendi.
- Edge headless UI testi, **105 izinli kaynak / 121 kilit girdisi** kaynak kapısı
  ve `git diff --check` geçti. Bu adımda bağımlılık kurulumu/audit tekrarlanmadı;
  bağımlılıklar, paket sürümü ve lisans seçimi değişmedi.
- Normal kullanıcı oturumunda gerçek salt okunur registry/disk/erişim gözlemi
  doğrulandı. PE/önkontrol birleşimi sentetik derlenmiş aday ve sentetik WebView
  sürümü kullandı; aday çalıştırılmadı. Kurulu uygulamanın dosyaları okunmadı.
- İlk yeni test koşusunda 6 fixture oluşturma hatası oluştu: sahte profil test
  veri kökünün içine konulmuştu; ortak runtime koruması doğru biçimde reddetti.
  Fixture kardeş profil/çalışma kökü kullanacak şekilde düzeltildi; koruma
  gevşetilmedi. Son ilgili ve tam koşular geçti.
- Önceki 853 saniyelik koşudaki RTF/yükleme hataları bu adımın iki tam koşusunda
  tekrarlanmadı; kök nedenlerinin çözüldüğü iddia edilmiyor, takip notu korunuyor.
- Yeni yardımcı dışında UAC/firewall/ACL/CA/kurucu işlemi çalıştırılmadı; kişisel
  kurulum, veriler ve kestirmeler değişmedi. GitHub işlemi yok.

## Önceki önkontrol adımı doğrulaması (`0df0571`)

- Önkontrolün 10/10 testi geçti; geçici paketler ve sahte OS gözlemleri kullanıldı.
- `npm.cmd test`: son koşuda **78/78 geçti, 0 atlanan**. Ardından tam takım iki
  kez daha çalıştırıldı ve ikisi de geçti (bu adımda 10 yeni test).
- Bir ara koşu yaklaşık 853 saniye sürdü ve mevcut RTF/RTFD ile büyük yükleme
  testlerinden dördü başarısız oldu (422 ve ECONNRESET). Nedeni doğrulanmadı;
  son üç tam koşunun geçmesi bu önceki hataları açıklamış veya gidermiş sayılmaz.
  Kabul öncesi test güvenilirliği takibinde tutulmalı; ilgili üretim kodu bu
  adımda değiştirilmedi.
- `npm.cmd run check:source`: **100 izinli kaynak**, 121 kilit girdisi; geçti.
- `git diff --check`: geçti. Bağımlılıklar/sürüm numarası değiştirilmedi;
  bu adımda yeniden npm ci, audit veya bağımlılık raporu çalıştırılmadı.
- Edge headless UI testi yeniden geçti; arayüzde değişiklik yapılmadı.
- Gerçek registry, UAC/firewall, port uygunluk adaptörü veya kurucu çalıştırılmadı.
  Kişisel kurulum/veri okunmadı veya değiştirilmedi; GitHub işlemi yapılmadı.

## Önceki tabanın gerçek test kaydı (`222c14d`)

2026-10-03, Windows x64, Node 24.15.0, npm 11.12.1:

- `npm.cmd ci --ignore-scripts --no-audit --no-fund`: 97 paket temiz kuruldu.
- `npm.cmd test`: **68/68 geçti, 0 atlanan** (45 başlangıç + 23 yeni).
- `npm.cmd run test:ui`: Edge headless başarılı; gerçek clipboard/network/CA
  yok. Kurulum/parmak izi formu ve depolama dahil sentetik arayüz testleri.
- `npm.cmd run check:source`: **97 izinli kaynak**, 121 kilit girdisi; özel
  yerel terim taraması temiz. Tüm Git geçmişi/arşiv/görsel denetimi yerine geçmez.
- `npm.cmd audit --json`: **0 bilinen açık**. Zaman bağımlı; tam güvenlik kanıtı değil.
- `npm.cmd run report:dependencies`: 121 kilit girdisi, 97 kurulu paket,
  100 LICENSE/NOTICE vb. metni. Raporlar ignored build/dependency-review altında.
  Node/WebView2 dahil nihai dağıtım SBOM'u veya hukuki onay değildir.
- PowerShell AST: sözdizimi geçti. Yalnız saf context/ownership yüklemleri test
  nesneleriyle yürütüldü; canlı UAC/ACL/firewall/CA işlemleri yürütülmedi.
- C# yalnız geçici RuntimeProbe.exe olarak derlendi; tam WebView uygulaması değil.
- Onboarding tekil testinin ilk çağrısı ayrıntısız süreç hatası döndürdü; sonraki
  tekil koşu, 5 ardışık tekrar ve tam takımlar geçti. Manuel cihaz kanıtı sayılmaz.
- Kurulu kaynak başlangıç envanteri: **48/48 hash aynı**, eksik/değişen yok.
  Bu yalnız kayıtlı kaynak dosyalarını doğrular; çalışan kişisel veriyi okumadık
  ve özel bir yedekleme/göç yapmış sayılmayız.
- `git diff --check` geçti. Üretim SOURCE-CHECKOUT koruması kaldırılmadı.

## Bitmeyen işler — diğer sohbet bunları tamamlandı saymamalı

1. İlk kurucunun kaynak entegrasyonu var: Node PE/WebView2, normal kullanıcı,
   disk/yazma hakkı ve IPv4 port kontrolü; açık onaylı Runtime indirme sayfası,
   özel staging/receipt ve başlangıç kısayolu. Gerçek ACL/COM/port/Runtime yokluğu,
   kesinti ve native açılış kabulü bekliyor. IPv6/yönlendirilmiş profil/ARM64
   desteklenmiş sayılmaz. Versioned release pointer entegrasyonu da bekliyor.
2. Üretim updater/recovery ve veri koruyan kaldırıcı. İmzalı/pinlenmiş yayın
   metadata'sı, kaynakta bağlanan sahiplikli durdurmanın gerçek kabulü, kesintili ilk kurulum ve stale
   instance kilidi kurtarmanın gerçek native kabulü (onaylı kaynak akışı ve
   sentetik test artık var). Eski tehlikeli kaldırıcı alınmadı; yenisi henüz yok.
3. Gerçek veri göçü için üretim ACL adaptörü, doğrulanmış özel yedek; CA/DPAPI,
   ağlar, geçmiş/favoriler/gelen dosyalar ve WebView temasının kabulü.
4. Standart/farklı yönetici UAC; iptal/zaman aşımı/kısmi başarısızlık; gerçek
   firewall; iki ağ/Public ağ/aktarım sırasında ağdan çıkarma.
5. Tailscale'siz gerçek iPhone sertifika indirme/ayrıntı/parmak izi/güven adımları
   ve iki yönlü metin/fotoğraf/PDF/video. Güncel Apple/iOS ekranları kabul kaydıyla
   doğrulanmalı; eski kişisel testler yeni kaynak kanıtı değildir.
6. Sahiplikli outbox temizliği ve temel API/PowerShell hata ayrımları kaynakta
   tamamlandı. Gerçek disk dolması, pano/izin/süre hata kabulü ve genel doğrulama
   alt durumlarının ayrıntılandırılması bekliyor.
7. Koruma içeren aday Windows paketinin allowlist üretimi ve bağımsız kurucu
   derlemesi test edildi; son kullanıcı
   kurulabilir paket entegrasyonu, bağımlılık/native runtime lisans
   uygunluğu (özellikle LGPL/WebView2), nihai SBOM/bildirimler ve arşiv/QR/görsel
   gizlilik denetimi. Git geçmişi otomatik taraması var, kapsamlı sır/insan incelemesi
   yerine geçmez. Yayına uygun paket veya çalışabilir kullanıcı kurucusu yok.

Ayrıntı: docs/ROADMAP.md, docs/LIFECYCLE.md, docs/ACCEPTANCE.md.
Sonraki mühendislik işi üretim paket/launcher/yaşam döngüsü adaptörleri; ardından
ayrı düzenlenmiş temiz Windows ve gerçek iPhone kabulü. Kişisel kuruluma dağıtım
ayrı açık onay ve doğrulanmış özel yedek gerektirir. İnceleme sohbeti kaynakları
şimdi denetleyebilir, fakat **yayına hazır onayı verilmemiştir**.
