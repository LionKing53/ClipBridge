using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Reflection;
using System.Web.Script.Serialization;
using System.Windows.Forms;

// Shared, embedded catalogs also work before the backend/WebView exists.
internal static class Language
{
    internal static string Current = "tr";
    static readonly Dictionary<string, Dictionary<string,string>> Catalog = Load();
    static Dictionary<string, Dictionary<string,string>> Load()
    {
        var result = new Dictionary<string, Dictionary<string,string>>();
        foreach (string name in new [] { "Messages", "NativeMessages", "ErrorMessages" })
        using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream(name))
        using (var reader = new StreamReader(stream))
            foreach (var pair in new JavaScriptSerializer().Deserialize<Dictionary<string, Dictionary<string,string>>>(reader.ReadToEnd())) result[pair.Key] = pair.Value;
        return result;
    }
    internal static void Initialize(string root, bool existing)
    {
        Current = existing ? "tr" : (CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "tr" ? "tr" : "en");
        try {
            var value = new JavaScriptSerializer().Deserialize<Dictionary<string,object>>(File.ReadAllText(Path.Combine(root,"ui-settings.json")));
            if (value.ContainsKey("language") && (value["language"] as string == "tr" || value["language"] as string == "en")) Current = (string)value["language"];
        } catch { }
    }
    internal static string Text(string key) { return Catalog[key][Current]; }
    internal static void RefreshMenu(ContextMenuStrip menu)
    {
        foreach (ToolStripItem item in menu.Items)
            foreach (var entry in Catalog.Values)
                if (item.Text == entry["tr"] || item.Text == entry["en"]) { item.Text = entry[Current]; break; }
    }
    internal static void Refresh(Control control)
    {
        foreach (var entry in Catalog.Values) if (control.Text == entry["tr"] || control.Text == entry["en"]) { control.Text = entry[Current]; break; }
        foreach (Control child in control.Controls) Refresh(child);
    }
    internal static void SavePreference(string root)
    {
        Directory.CreateDirectory(root);
        string file = Path.Combine(root, "ui-settings.json");
        var serializer = new JavaScriptSerializer();
        var value = File.Exists(file) ? serializer.Deserialize<Dictionary<string,object>>(File.ReadAllText(file)) : new Dictionary<string,object>();
        value["language"] = Current;
        string pending = file + ".native-tmp";
        File.WriteAllText(pending, serializer.Serialize(value), new System.Text.UTF8Encoding(false));
        if (File.Exists(file)) File.Replace(pending, file, null); else File.Move(pending,file);
    }
}
