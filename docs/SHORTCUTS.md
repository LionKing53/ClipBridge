# iPhone kestirmeleri / iPhone Shortcuts

## Türkçe

Bu bir kestirme oluşturma rehberidir; imzalı/import edilebilir kestirme paketi
değildir. iOS arayüzündeki eylem adları sürüme/dile göre değişebilir. Her kullanıcı
kendi eşleştirme ekranındaki adresi ve anahtarı kullanır. Örnek veya başka bir
kullanıcının anahtarını kullanmayın; QR ekran görüntülerini paylaşmayın.

İki yerel kestirme ve istenirse iki ayrı Tailscale kopyası oluşturun. Tailscale
kopyalarında uzak HTTPS adresi ve gerekli bağlan/ayrıl adımları bulunur. Yerel
kopyalar Tailscale başlatmaz. Otomatik yol seçimi veya arka plan pano izleme yoktur.

### iPhone → Windows

1. Panoyu Al.
2. Eşleştirme ekranındaki `/api/v1/clipboard` URL'sinin içeriğini al: **POST**.
3. Başlık: `Authorization`; değer: `Bearer ` ve kişisel eşleştirme anahtarı.
4. İstek gövdesi **Form**. `content` alanını **Dosya** türünde ekleyin; değerini
   ilk Panoyu Al eyleminin çıktısına bağlayın. Elle “Pano” metni yazmayın.
5. Windows'ta Ctrl+V. Dosya/fotoğrafı Dosya Gezgini veya masaüstüne yapıştırın.
   Her uygulamanın metin giriş alanı dosya yapıştırmayı desteklemez.

Fotoğraf yerine `Clipboard <tarih>` yazısı gelmesi, içeriğin dosya yerine metne
dönüştürülmüş olabileceğini gösterir. Eylemin Dosya türünü/çıktı bağlantısını
kontrol edin. Boş görünen alanın bağlı olup olmadığını gerçek testle doğrulayın.

### Windows → iPhone

1. Windows'ta metni veya dosyayı Ctrl+C ile kopyalayın.
2. `/api/v1/clipboard`: **GET**, aynı Authorization başlığı. Çıktıyı
   **Pano İçeriği** değişkenine kaydedin.
3. `/api/v1/clipboard/kind`: **GET**, aynı Authorization başlığı. Bu ikinci
   çıktıyı Metin eyleminden geçirip **Pano Türü** değişkenine kaydedin.
4. Eğer Pano Türü `image` ise **Pano İçeriği** → Fotoğraf Albümüne Kaydet.
5. Eğer Pano Türü `file` ise **Pano İçeriği** → Dosyayı Kaydet; nereye
   kaydedileceğini sor açık olsun.
6. Eğer Pano Türü `text` ise **Pano İçeriği** → Panoya Kopyala. Kullanıcı
   istediği uygulamada yapıştırır. `.txt` dosyasını sırf uzantısından metin saymayın.

Türü kaydetmeye çalışmayın: `image`, `file`, `text` etiketleri içerik değildir.
İki GET arasında Windows panosunu değiştirmeyin; bu API çiftinin atomik snapshot
kimliği yoktur. Tanınmayan tür/hata JSON'u gelirse kaydetmeyin; önce bağlantı ve
yetkilendirme hatasını inceleyin. Arkaya çift dokunma isteğe bağlı kullanıcı ayarıdır.

## English

Create separate local and optional Tailscale send/receive shortcuts. Use your
own pairing endpoint and Bearer key. Never publish pairing QR images. This guide
does not provide a signed importable Shortcut and does not imply automatic sync.

Send: Get Clipboard → Get Contents of URL `/api/v1/clipboard`, POST, Authorization
header, Form body with a **File** field named `content` bound to the Clipboard
action output. Then paste on Windows; use Explorer/Desktop for files rather than
an arbitrary text input.

Receive: GET `/api/v1/clipboard` into a named Content variable. GET `/kind` with
the same authorization, convert that second response to text into a Kind variable.
If Kind equals `image`, save **Content** to Photos. If `file`, Save File with Ask
Where to Save enabled. If `text`, copy **Content** to the iPhone clipboard and
paste manually. Do not confuse the two URL outputs or save the kind label itself.
Do not change the Windows clipboard between the two requests: they are not an
atomic snapshot. Treat unknown kinds/error JSON as failures, not incoming files.
