using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Web.Script.Serialization;

[assembly: AssemblyVersion("1.2.0.0")]
[assembly: AssemblyFileVersion("1.2.0.0")]
[assembly: AssemblyInformationalVersion("1.2.0")]

// Standalone first-install UI, built beside a pinned payload. Never executes a
// downloaded Node or modifies a current installation. Source/candidate guards
// remain binding; generating this executable is not an approval to distribute.
internal static class SetupProgram
{
    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        Language.Initialize(Path.Combine(local, "PanoKopru"), Directory.Exists(Path.Combine(local,"PanoKopru")) || Directory.Exists(Path.Combine(local,"Programs","PanoKopru")));
        Application.Run(new SetupWindow());
    }
}
internal sealed class SetupWindow : Form
{
    readonly Label status = new Label { AutoSize = false, Height = 110, Dock = DockStyle.Top };
    readonly CheckBox desktop = new CheckBox { Text = Language.Text("m_3f448c896b0a"), Checked = true, AutoSize = true };
    readonly CheckBox startup = new CheckBox { Text = Language.Text("m_ac8c01b5417a"), Checked = false, AutoSize = true };
    readonly CheckBox consent = new CheckBox { Text = Language.Text("m_02d39a7ab3c0"), Checked = false, AutoSize = true };
    readonly Button install = new Button { Text = Language.Text("m_3f60a68a1b39"), AutoSize = true };
    readonly Button cancel = new Button { Text = Language.Text("m_ea40e51cdfe7"), AutoSize = true, Enabled = false };
    CancellationTokenSource cancellation;
    bool busy, completed;
    readonly ComboBox language = new ComboBox { DropDownStyle = ComboBoxStyle.DropDownList, Width = 180, AccessibleName = "Türkçe / English" };
    internal SetupWindow()
    {
        Text = Language.Text("m_1c84efd831cc"); Width = 760; Height = 620;
        MinimumSize = new Size(600, 460); StartPosition = FormStartPosition.CenterScreen;
        Font = new Font("Segoe UI", 10); BackColor = Color.FromArgb(244, 246, 243);
        var layout = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, Padding = new Padding(24), AutoScroll = true };
        language.Items.AddRange(new object[] { "Türkçe", "English" });
        language.SelectedIndex = Language.Current == "tr" ? 0 : 1;
        language.SelectedIndexChanged += (s,e) => { if (busy) return; Language.Current = language.SelectedIndex == 0 ? "tr" : "en"; Language.Refresh(this); };
        layout.Controls.Add(language);
        layout.Controls.Add(new Label { Text = "PanoKopru", Font = new Font("Segoe UI", 21, FontStyle.Bold), AutoSize = true });
        layout.Controls.Add(new Label { Text = Language.Text("m_64576cfe72e2"), AutoSize = true });
        layout.Controls.Add(desktop); layout.Controls.Add(startup); layout.Controls.Add(consent);
        var buttons = new FlowLayoutPanel { AutoSize = true };
        var license = new Button { Text = Language.Text("m_1e2298cfc22b"), AutoSize = true };
        license.Click += (s,e) => MessageBox.Show(Language.Text("m_ec20bf3aff0c"), "PanoKopru");
        var runtime = new Button { Text = Language.Text("m_6a1aa69d5ce9"), AutoSize = true };
        var remove = new Button { Text = Language.Text("m_3aaf7b407904"), AutoSize = true };
        remove.Click += async (s,e) => {
            if (busy || MessageBox.Show(Language.Text("m_149a5aa87558"), "PanoKopru", MessageBoxButtons.YesNo, MessageBoxIcon.Warning) != DialogResult.Yes) return;
            busy = true; install.Enabled = remove.Enabled = false;
            status.Text = Language.Text("m_005741d319f6");
            try {
                Dictionary<string, string> policy;
                using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("SetupPolicy"))
                using (var reader = new StreamReader(stream)) policy = new JavaScriptSerializer().Deserialize<Dictionary<string, string>>(reader.ReadToEnd());
                await Task.Run(() => RemoveInstall.Run(new WindowsFreshInstall(policy["nodeVersion"], policy["minimumWebView2Version"]), policy["manifestHash"]));
                completed = true; status.Text = Language.Text("m_c52405595f21");
            } catch { status.Text = Language.Text("m_6edaf65bbefd"); }
            finally { busy = false; remove.Enabled = true; install.Enabled = !completed; }
        };
        runtime.Click += (s,e) => {
            if (MessageBox.Show(Language.Text("m_15f4aa4f0e59"), "WebView2", MessageBoxButtons.YesNo) != DialogResult.Yes) return;
            try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = "https://developer.microsoft.com/microsoft-edge/webview2/", UseShellExecute = true }); }
            catch { status.Text = Language.Text("m_c67f4c0af20b"); }
        };
        cancel.Click += (s,e) => { if (busy && cancellation != null) { cancellation.Cancel(); cancel.Enabled = false; status.Text = Language.Text("m_7d14510100cb"); } };
        buttons.Controls.Add(install); buttons.Controls.Add(cancel); buttons.Controls.Add(license); buttons.Controls.Add(runtime); buttons.Controls.Add(remove); layout.Controls.Add(buttons);
        status.Width = 560; status.Text = Language.Text("m_7f2c56078f71"); layout.Controls.Add(status); Controls.Add(layout);
        layout.SizeChanged += (s,e) => {
            int width = Math.Max(280, layout.ClientSize.Width - 64);
            foreach (Control child in layout.Controls) {
                child.MaximumSize = new Size(width, 0);
                if (child == status) child.Width = width;
            }
            buttons.MaximumSize = new Size(width, 0); buttons.WrapContents = true;
        };
        install.Click += async (s,e) => await Install();
        FormClosing += (s,e) => { if (busy) { e.Cancel = true; status.Text = Language.Text("m_8009179566e2"); } };
    }
    void Progress(string step)
    {
        string text = new Dictionary<string, string> { { "verify", Language.Text("m_b70647f03481") }, { "prerequisites", Language.Text("m_0c7bdf369713") },
            { "copy", Language.Text("m_1738f7e414a4") }, { "activate", Language.Text("m_181cdfc55d31") }, { "shortcuts", Language.Text("m_cf6af91e8578") } }[step];
        BeginInvoke(new Action(() => status.Text = text));
    }
    async Task Install()
    {
        if (busy || completed) return;
        if (!consent.Checked) { status.Text = Language.Text("m_f0837538fbdf"); return; }
        busy = true; language.Enabled = false; install.Enabled = desktop.Enabled = startup.Enabled = consent.Enabled = false;
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
            Language.SavePreference(Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PanoKopru"));
            status.Text = result.Warnings.Length == 0 ? Language.Text("m_891f8765553d") :
                Language.Text("m_d97e1a594e7d") + String.Join(", ", result.Warnings);
        }
        catch (Exception error)
        {
            // Show only reviewed codes, never native messages or private paths.
            var messages = new Dictionary<string, string> {
                { "ERR_INSTALL_EXISTING_TARGET", Language.Text("m_baa4c9cf5bc6") },
                { "ERR_INSTALL_RUN_AS_NORMAL_USER", Language.Text("m_a3ecc4863158") },
                { "ERR_INSTALL_PLATFORM", Language.Text("m_3798f765b24b") },
                { "ERR_INSTALL_PROFILE_REDIRECTED", Language.Text("m_446adc268fad") },
                { "ERR_INSTALL_WEBVIEW_REQUIRED", Language.Text("m_b898af087f23") },
                { "ERR_INSTALL_WEBVIEW_UNKNOWN", Language.Text("m_c244f5a3f564") },
                { "ERR_INSTALL_DISK_SPACE", Language.Text("m_668048cab6b6") },
                { "ERR_INSTALL_WRITE_ACCESS", Language.Text("m_fa15863e3386") },
                { "ERR_INSTALL_PORT_IN_USE", Language.Text("m_fac0edcb4eb4") },
                { "ERR_INSTALL_EXCLUSIVE_DIRECTORY", Language.Text("m_4d74cec2df54") } };
            string message;
            status.Text = error is OperationCanceledException ? Language.Text("m_f42037ea4e6e") :
                messages.TryGetValue(error.Message, out message) ? message : Language.Text("m_a279e812ae0a");
        }
        finally { busy = false; language.Enabled = true; cancel.Enabled = false; cancellation.Dispose(); cancellation = null; if (!completed) install.Enabled = desktop.Enabled = startup.Enabled = consent.Enabled = true; }
    }
}
