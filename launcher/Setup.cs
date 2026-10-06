using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Standalone first-install UI, built beside a pinned payload. Never executes a
// downloaded Node or modifies a current installation. Source/candidate guards
// remain binding; generating this executable is not an approval to distribute.
internal static class SetupProgram
{
    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new SetupWindow());
    }
}
internal sealed class SetupWindow : Form
{
    readonly Label status = new Label { AutoSize = false, Height = 110, Dock = DockStyle.Top };
    readonly CheckBox desktop = new CheckBox { Text = "Masaustune kisayol ekle", Checked = true, AutoSize = true };
    readonly CheckBox startup = new CheckBox { Text = "Windows oturumu acilinca arka planda baslat", Checked = false, AutoSize = true };
    readonly CheckBox consent = new CheckBox { Text = "Onizleme sinirlarini ve GPL-3.0-or-later lisansini okudum", Checked = false, AutoSize = true };
    readonly Button install = new Button { Text = "Ilk kurulumu yap", AutoSize = true };
    readonly Button cancel = new Button { Text = "Iptal iste", AutoSize = true, Enabled = false };
    CancellationTokenSource cancellation;
    bool busy, completed;
    internal SetupWindow()
    {
        Text = "PanoKopru - Ilk Kurulum"; Width = 660; Height = 500;
        MinimumSize = new Size(600, 460); StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10); BackColor = Color.FromArgb(244, 246, 243);
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, Padding = new Padding(24), AutoScroll = true };
        layout.Controls.Add(new Label { Text = "PanoKopru", Font = new Font("Segoe UI", 21, FontStyle.Bold), AutoSize = true });
        layout.Controls.Add(new Label { Text = "Yalniz temiz Windows x64 kullanici kurulumu.\nVar olan uygulama veya veri klasorunun uzerine yazilmaz.\nProgram: %LOCALAPPDATA%\\Programs\\PanoKopru\nVeri: %LOCALAPPDATA%\\PanoKopru (ilk acilista olusturulur).\nBu adim iPhone sertifikasi veya ag izni eklemez.", AutoSize = true });
        layout.Controls.Add(desktop); layout.Controls.Add(startup); layout.Controls.Add(consent);
        var buttons = new FlowLayoutPanel { AutoSize = true };
        var license = new Button { Text = "Lisans ve sinirlar", AutoSize = true };
        license.Click += (s,e) => MessageBox.Show("Proje lisansi GPL-3.0-or-later; tam metin payload\\app\\LICENSE altindadir.\n\nBu kurucu yalniz ilk kurulum icindir. Guncelleme, kaldirma ve gercek cihaz kabul kapilari tamamlanmadi. Koruma iceren muhendislik adayi kurulamaz. Yayinci imzasi ve dagitim onayi bu pencereyle verilmis olmaz.", "PanoKopru");
        var runtime = new Button { Text = "WebView2 indir (Microsoft)", AutoSize = true };
        runtime.Click += (s,e) => {
            if (MessageBox.Show("Microsoft'un resmi WebView2 indirme sayfasi acilsin mi? Kurucu otomatik indirilmez veya calistirilmaz.", "WebView2", MessageBoxButtons.YesNo) != DialogResult.Yes) return;
            try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = "https://developer.microsoft.com/microsoft-edge/webview2/", UseShellExecute = true }); }
            catch { status.Text = "Indirme sayfasi acilamadi."; }
        };
        cancel.Click += (s,e) => { if (busy && cancellation != null) { cancellation.Cancel(); cancel.Enabled = false; status.Text = "Iptal istendi. Devam eden dosya islemi bitince, etkinlestirmeden once durulacak. Etkinlesmis kurulum silinmez."; } };
        buttons.Controls.Add(install); buttons.Controls.Add(cancel); buttons.Controls.Add(license); buttons.Controls.Add(runtime); layout.Controls.Add(buttons);
        status.Width = 560; status.Text = "Normal kullanici olarak ac. Yonetici olarak calistirma.\nKurulum uygulamayi otomatik baslatmaz."; layout.Controls.Add(status); Controls.Add(layout);
        install.Click += async (s,e) => await Install();
        FormClosing += (s,e) => { if (busy) { e.Cancel = true; status.Text = "Kurulum suruyor. Dosya islemleri tamamlanana kadar bekle."; } };
    }
    void Progress(string step)
    {
        string text = new Dictionary<string, string> { { "verify", "Paket butunlugu dogrulaniyor..." }, { "prerequisites", "Windows, Node, WebView2, disk ve portlar kontrol ediliyor..." },
            { "copy", "Program dosyalari ayri hazirlama klasorune kopyalaniyor..." }, { "activate", "Dogrulanmis program etkinlestiriliyor..." }, { "shortcuts", "Secilen kullanici kisayollari ekleniyor..." } }[step];
        BeginInvoke(new Action(() => status.Text = text));
    }
    async Task Install()
    {
        if (busy || completed) return;
        if (!consent.Checked) { status.Text = "Once lisans ve onizleme sinirlarini okuyup onayla."; return; }
        busy = true; install.Enabled = desktop.Enabled = startup.Enabled = consent.Enabled = false;
        cancellation = new CancellationTokenSource(); cancel.Enabled = true;
        try
        {
            Dictionary<string, string> policy;
            using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("SetupPolicy"))
            using (var reader = new StreamReader(stream)) policy = new JavaScriptSerializer().Deserialize<Dictionary<string, string>>(reader.ReadToEnd());
            string payload = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "payload");
            bool wantDesktop = desktop.Checked, wantStartup = startup.Checked;
            var result = await Task.Run(() => FreshInstall.Run(new WindowsFreshInstall(policy["nodeVersion"], policy["minimumWebView2Version"]),
                payload, policy["manifestHash"], wantDesktop, wantStartup, Progress, cancellation.Token));
            completed = true;
            status.Text = result.Warnings.Length == 0 ? "Kurulum tamamlandi. PanoKopru'yu Baslat menusunden acabilirsin. Ilk acilista ag ve iPhone eslestirmesi ayarlanir." :
                "Program kuruldu; bazi kisayollar eklenemedi veya zaten vardi. Program klasorundeki PanoKopru.exe'yi acabilirsin. Kod: " + String.Join(", ", result.Warnings);
        }
        catch (Exception error)
        {
            // Show only reviewed codes, never native messages or private paths.
            var messages = new Dictionary<string, string> {
                { "ERR_INSTALL_EXISTING_TARGET", "Mevcut kurulum veya veri bulundu. Uzerine yazilmadi. Guncelleme/gecis araci gerekiyor." },
                { "ERR_INSTALL_RUN_AS_NORMAL_USER", "Kurucuyu kapatip yonetici secenegi olmadan, normal kullanici olarak ac." },
                { "ERR_INSTALL_PLATFORM", "Bu test hedefi Windows 10 22H2 / Windows 11 x64 icindir. ARM64 ve eski sistem kabul edilmedi." },
                { "ERR_INSTALL_PROFILE_REDIRECTED", "Yonlendirilmis kullanici profili henuz desteklenmiyor. Kurulum degisiklik yapmadan durduruldu." },
                { "ERR_INSTALL_WEBVIEW_REQUIRED", "WebView2 Runtime eksik veya eski. Resmi Microsoft sayfasindan guncelleyip yeniden dene." },
                { "ERR_INSTALL_WEBVIEW_UNKNOWN", "WebView2 kurulumu guvenle okunamadi. Kurulum durduruldu." },
                { "ERR_INSTALL_DISK_SPACE", "Diskte kurulum ve ilk veriler icin yeterli bos alan yok." },
                { "ERR_INSTALL_WRITE_ACCESS", "Hedef klasore yazma izni yok. Yonetici olarak zorlamak yerine kullanici profilini kontrol et." },
                { "ERR_INSTALL_PORT_IN_USE", "Gerekli port baska bir uygulama tarafindan kullaniliyor. Hicbir surec sonlandirilmadi." },
                { "ERR_INSTALL_EXCLUSIVE_DIRECTORY", "Baska bir kurulum veya yarim kalmis kurulum kilidi var. Klasorleri elle silmeden once inceleme gerekiyor." } };
            string message;
            status.Text = error is OperationCanceledException ? "Kurulum etkinlestirilmeden iptal edildi. Varsa hazirlama klasoru inceleme icin korundu; kisisel veri silinmedi." :
                messages.TryGetValue(error.Message, out message) ? message : "Kurulum guvenle tamamlanamadi. Paket bozuk, muhendislik korumali veya dosya islemi basarisiz olabilir. Varsa hazirlama klasoru inceleme icin korundu; kisisel veri silinmedi.";
        }
        finally { busy = false; cancel.Enabled = false; cancellation.Dispose(); cancellation = null; if (!completed) install.Enabled = desktop.Enabled = startup.Enabled = consent.Enabled = true; }
    }
}
