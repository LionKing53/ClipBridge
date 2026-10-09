using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;

// Renders only the form; no install, removal, registry, network or OS adapters.
internal static class SetupLanguageProbe
{
    [STAThread]
    static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        foreach (string language in new [] { "tr", "en" }) {
            Language.Current = language;
            using (var form = new SetupWindow()) {
                form.StartPosition = FormStartPosition.Manual;
                form.Location = new Point(-20000,-20000);
                form.Show(); form.Refresh(); Application.DoEvents();
                Check(form, language);
                using (var image = new Bitmap(form.Width,form.Height)) {
                    form.DrawToBitmap(image,new Rectangle(0,0,form.Width,form.Height));
                    image.Save(Path.Combine(args[0],"setup-" + language + ".png"));
                }
                form.Close();
            }
        }
        Console.WriteLine("setup-language-layout PASS");
    }
    static void Check(Control control, string language)
    {
        foreach (Control child in control.Controls) {
            var combo = child as ComboBox;
            if (combo != null && combo.Text != (language == "tr" ? "Türkçe" : "English")) throw new Exception("Missing selected language");
            if (child is FlowLayoutPanel && child.Parent is Form && child.DisplayRectangle.Width > child.ClientSize.Width)
                throw new Exception("Horizontal setup overflow: " + language);
            Check(child,language);
        }
    }
}
