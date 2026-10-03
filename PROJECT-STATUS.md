# PanoKopru — proje durumu

Güncelleme: 2026-10-03. **Geliştirme sürümü; genel yayına hazır değil.**
A tamamlandı. B–D çekirdekleri ilerledi; üretim entegrasyonu ve kabul kapıları açık.

## Sürüm ve sahiplik

- Tek kaynak: `%USERPROFILE%/source/PanoKopru`.
- Son adımlar: `97dfd17` doğrulanmış native derleme; `0124d43` korumalı aday paket;
  `0003fc6` sahiplikli ZIP temizliği; `0c884b3` kontrollü durdurma.
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

## Son geliştirme doğrulaması — 2026-10-03

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

1. Gerçek kurulum/başlatıcı/paket adaptörü: Node/SDK edinimi ve tam native derleme
   tamamlandı; WebView2 Runtime edinimi, önkontrolün üretim kullanıcı/süreç kapsamı ve LAN/IPv6
   adaptörleriyle kurucuya bağlanması, başlangıç tercihinin güvenli uygulanması,
   versioned release pointer entegrasyonu bekliyor.
2. Üretim updater/recovery ve veri koruyan kaldırıcı. İmzalı/pinlenmiş yayın
   metadata'sı, kaynakta bağlanan sahiplikli durdurmanın gerçek kabulü, kesintili ilk kurulum ve stale
   instance kilidi kurtarma. Eski tehlikeli kaldırıcı alınmadı; yenisi henüz yok.
3. Gerçek veri göçü için üretim ACL adaptörü, doğrulanmış özel yedek; CA/DPAPI,
   ağlar, geçmiş/favoriler/gelen dosyalar ve WebView temasının kabulü.
4. Standart/farklı yönetici UAC; iptal/zaman aşımı/kısmi başarısızlık; gerçek
   firewall; iki ağ/Public ağ/aktarım sırasında ağdan çıkarma.
5. Tailscale'siz gerçek iPhone sertifika indirme/ayrıntı/parmak izi/güven adımları
   ve iki yönlü metin/fotoğraf/PDF/video. Güncel Apple/iOS ekranları kabul kaydıyla
   doğrulanmalı; eski kişisel testler yeni kaynak kanıtı değildir.
6. Sahiplikli outbox temizliği kaynakta tamamlandı. Gerçek disk dolması testleri
   ve tüm eski API/PowerShell yollarında ayrıntılı hata sınıflandırması bekliyor.
7. Koruma içeren aday Windows paketinin allowlist üretimi test edildi; son kullanıcı
   kurulabilir paket entegrasyonu, bağımlılık/native runtime lisans
   uygunluğu (özellikle LGPL/WebView2), nihai SBOM/bildirimler ve tam Git geçmişi,
   arşiv/QR/görsel gizlilik denetimi. Yayına uygun paket veya kullanıcı kurucusu yok.

Ayrıntı: docs/ROADMAP.md, docs/LIFECYCLE.md, docs/ACCEPTANCE.md.
Sonraki mühendislik işi üretim paket/launcher/yaşam döngüsü adaptörleri; ardından
ayrı düzenlenmiş temiz Windows ve gerçek iPhone kabulü. Kişisel kuruluma dağıtım
ayrı açık onay ve doğrulanmış özel yedek gerektirir. İnceleme sohbeti kaynakları
şimdi denetleyebilir, fakat **yayına hazır onayı verilmemiştir**.
