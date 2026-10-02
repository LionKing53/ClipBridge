# PanoKopru — proje durumu

Güncelleme: 2026-10-03. **Geliştirme sürümü; genel yayına hazır değil.**
A tamamlandı. B–D çekirdekleri ilerledi; üretim entegrasyonu ve kabul kapıları açık.

## Sürüm ve sahiplik

- Tek kaynak: `%USERPROFILE%/source/PanoKopru`.
- Bu test kaydının kaynak commit'i: `222c14d`. Ardından yalnız bu durum kaydı
  güncellendi. Teslim commit'i için `git log -1`, değişiklikler için
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

## Gerçek test kaydı

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

1. Gerçek kurulum/başlatıcı/paket adaptörü: temiz Node/WebView2 edinimi ve
   bütünlük doğrulaması, runtime/prerequisite kontrolü, başlangıç tercihi,
   native uygulama build ve versioned release pointer entegrasyonu.
2. Üretim updater/recovery ve veri koruyan kaldırıcı. İmzalı/pinlenmiş yayın
   metadata'sı, gerçek süreç sahipliği/durdurma, kesintili ilk kurulum ve stale
   instance kilidi kurtarma. Eski tehlikeli kaldırıcı alınmadı; yenisi henüz yok.
3. Gerçek veri göçü için üretim ACL adaptörü, doğrulanmış özel yedek; CA/DPAPI,
   ağlar, geçmiş/favoriler/gelen dosyalar ve WebView temasının kabulü.
4. Standart/farklı yönetici UAC; iptal/zaman aşımı/kısmi başarısızlık; gerçek
   firewall; iki ağ/Public ağ/aktarım sırasında ağdan çıkarma.
5. Tailscale'siz gerçek iPhone sertifika indirme/ayrıntı/parmak izi/güven adımları
   ve iki yönlü metin/fotoğraf/PDF/video. Güncel Apple/iOS ekranları kabul kaydıyla
   doğrulanmalı; eski kişisel testler yeni kaynak kanıtı değildir.
6. Çökmeden kalan outbox arşivleri için sahiplikli temizlik; gerçek disk dolması
   testleri; tüm eski API/PowerShell yollarında ayrıntılı hata sınıflandırması.
7. Son Windows paketinin allowlist üretimi, bağımlılık/native runtime lisans
   uygunluğu (özellikle LGPL/WebView2), nihai SBOM/bildirimler ve tam Git geçmişi,
   arşiv/QR/görsel gizlilik denetimi. Yayın paketi veya dağıtılabilir exe üretilmedi.

Ayrıntı: docs/ROADMAP.md, docs/LIFECYCLE.md, docs/ACCEPTANCE.md.
Sonraki mühendislik işi üretim paket/launcher/yaşam döngüsü adaptörleri; ardından
ayrı düzenlenmiş temiz Windows ve gerçek iPhone kabulü. Kişisel kuruluma dağıtım
ayrı açık onay ve doğrulanmış özel yedek gerektirir. İnceleme sohbeti kaynakları
şimdi denetleyebilir, fakat **yayına hazır onayı verilmemiştir**.
