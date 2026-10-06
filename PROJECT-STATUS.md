# PanoKopru — proje durumu

Güncelleme: 2026-10-06. **Geliştirme sürümü; genel yayına hazır değil.**
A tamamlandı. B–D çekirdekleri ilerledi; üretim entegrasyonu ve kabul kapıları açık.

## Sürüm ve sahiplik

- Tek kaynak: `%USERPROFILE%/source/PanoKopru`.
- Son adımlar: `97dfd17` doğrulanmış native derleme; `0124d43` korumalı aday paket;
  `0003fc6` sahiplikli ZIP temizliği; `0c884b3` kontrollü durdurma;
  `b440145` kurulu açılış, kilit kurtarma ve güvenli hata sözleşmesi.
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
- Bağımsız kurucunun tam derlemesi sonraki temiz commit/paket kontrolünde
  doğrulanacak. Şu aşamada kullanıcıya verilecek çalışabilir test paketi yok.
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
7. Koruma içeren aday Windows paketinin allowlist üretimi test edildi; son kullanıcı
   kurulabilir paket entegrasyonu, bağımlılık/native runtime lisans
   uygunluğu (özellikle LGPL/WebView2), nihai SBOM/bildirimler ve arşiv/QR/görsel
   gizlilik denetimi. Git geçmişi otomatik taraması var, kapsamlı sır/insan incelemesi
   yerine geçmez. Yayına uygun paket veya kullanıcı kurucusu yok.

Ayrıntı: docs/ROADMAP.md, docs/LIFECYCLE.md, docs/ACCEPTANCE.md.
Sonraki mühendislik işi üretim paket/launcher/yaşam döngüsü adaptörleri; ardından
ayrı düzenlenmiş temiz Windows ve gerçek iPhone kabulü. Kişisel kuruluma dağıtım
ayrı açık onay ve doğrulanmış özel yedek gerektirir. İnceleme sohbeti kaynakları
şimdi denetleyebilir, fakat **yayına hazır onayı verilmemiştir**.
