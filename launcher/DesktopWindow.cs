using System;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;

internal sealed class DesktopWindow : Form
{
    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr handle, int attribute, ref int value, int size);
    private readonly WebView2 browser = new WebView2();
    private readonly NotifyIcon tray = new NotifyIcon();
    private readonly string appRoot;
    private bool exiting;
    private string activeToken;
    internal DesktopWindow(string root)
    {
        appRoot = root;
        Text = "PanoK\u00f6pr\u00fc";
        float scale;
        using (var graphics = Graphics.FromHwnd(IntPtr.Zero)) scale = graphics.DpiX / 96f;
        var area = Screen.PrimaryScreen.WorkingArea;
        Size = new Size(Math.Min((int)(1280 * scale), area.Width - (int)(48 * scale)), Math.Min((int)(840 * scale), area.Height - (int)(48 * scale)));
        MinimumSize = new Size((int)(860 * scale), (int)(620 * scale));
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(16, 19, 23);
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        browser.Dock = DockStyle.Fill;
        browser.DefaultBackgroundColor = BackColor;
        Controls.Add(browser);
        tray.Icon = Icon;
        tray.Text = "PanoK\u00f6pr\u00fc - arka planda haz\u0131r";
        tray.Visible = true;
        var menu = new ContextMenuStrip();
        menu.Items.Add("PanoK\u00f6pr\u00fc'y\u00fc a\u00e7", null, (s,e) => Reveal());
        menu.Items.Add("Pencereyi kapat (k\u00f6pr\u00fc a\u00e7\u0131k kal\u0131r)", null, (s,e) => { exiting = true; Close(); });
        tray.ContextMenuStrip = menu;
        tray.DoubleClick += (s,e) => Reveal();
        FormClosing += (s,e) => { if (!exiting && e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; Hide(); } };
        FormClosed += (s,e) => { tray.Visible = false; tray.Dispose(); };
        Shown += async (s,e) => { try { int dark = 1; DwmSetWindowAttribute(Handle, 20, ref dark, 4); } catch {} await InitializeBrowser(); };
        var reopen = new Timer { Interval = 500 };
        reopen.Tick += (s,e) => { if (Program.OpenWindowEvent.WaitOne(0)) Reveal(); };
        reopen.Start();
        FormClosed += (s,e) => reopen.Dispose();
    }
    private void Reveal()
    {
        Show(); if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal; Activate();
        try { if (browser.CoreWebView2 != null) NavigateWithToken(); } catch {}
    }
    private void NavigateWithToken()
    {
        string token = File.ReadAllText(Path.Combine(appRoot, ".clipboard-bridge", "desktop-token")).Trim();
        if (token == activeToken) return;
        activeToken = token;
        browser.CoreWebView2.Navigate("http://127.0.0.1:32146/#token=" + Uri.EscapeDataString(token));
    }
    private async Task InitializeBrowser()
    {
        try
        {
            string state = Path.Combine(appRoot, ".clipboard-bridge");
            var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(state, "webview"));
            await browser.EnsureCoreWebView2Async(env);
            browser.CoreWebView2.WebMessageReceived += (s,e) => {
                if (e.Source != "http://127.0.0.1:32146/") return;
                try {
                    string message = e.TryGetWebMessageAsString();
                    if (message != "theme:dark" && message != "theme:light") return;
                    int dark = message == "theme:dark" ? 1 : 0;
                    BackColor = dark == 1 ? Color.FromArgb(16, 19, 23) : Color.FromArgb(244, 246, 243);
                    browser.DefaultBackgroundColor = BackColor;
                    DwmSetWindowAttribute(Handle, 20, ref dark, 4);
                } catch {}
            };
            browser.CoreWebView2.Settings.AreDevToolsEnabled = false;
            browser.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
            browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
            browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            browser.CoreWebView2.Settings.IsPasswordAutosaveEnabled = false;
            browser.CoreWebView2.Settings.IsGeneralAutofillEnabled = false;
            browser.CoreWebView2.NavigationStarting += (s,e) => { Uri uri; if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out uri) || uri.Scheme != "http" || uri.Host != "127.0.0.1" || uri.Port != 32146) e.Cancel = true; };
            browser.CoreWebView2.NewWindowRequested += (s,e) => e.Handled = true;
            browser.CoreWebView2.PermissionRequested += (s,e) => e.State = CoreWebView2PermissionState.Deny;
            string tokenPath = Path.Combine(state, "desktop-token");
            for (int i = 0; i < 40 && !File.Exists(tokenPath); i++) await Task.Delay(250);
            NavigateWithToken();
        }
        catch (Exception)
        {
            MessageBox.Show("Aray\u00fcz a\u00e7\u0131lamad\u0131. PanoK\u00f6pr\u00fc'y\u00fc yeniden a\u00e7may\u0131 deneyin. Microsoft Edge WebView2 Runtime kurulu olmal\u0131d\u0131r.\n\nAktar\u0131m servisi ayr\u0131 olarak \u00e7al\u0131\u015fmaya devam eder.", "PanoK\u00f6pr\u00fc", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }
}
