using System;
using System.Globalization;
using System.IO;
using System.Threading;
internal static class LanguageProbe
{
    static void Main(string[] args)
    {
        string root = args[0];
        Thread.CurrentThread.CurrentUICulture = CultureInfo.GetCultureInfo("en-US");
        Language.Initialize(root, false); if (Language.Current != "en") throw new Exception("New default");
        Language.Initialize(root, true); if (Language.Current != "tr") throw new Exception("Existing default");
        if (Language.Text("m_4a3600a8e2fe") != "ClipBridge'yü aç") throw new Exception("Turkish");
        Directory.CreateDirectory(root);File.WriteAllText(Path.Combine(root,"ui-settings.json"),"{\"language\":\"en\",\"theme\":\"light\"}");
        Language.Initialize(root,true); if(Language.Text("m_4a3600a8e2fe") != "Open ClipBridge") throw new Exception("English preference");
        Language.Current="tr"; Language.SavePreference(root);Language.Current="en";Language.Initialize(root,false);
        if(Language.Current!="tr" || !File.ReadAllText(Path.Combine(root,"ui-settings.json")).Contains("light"))throw new Exception("Preservation");
        Console.WriteLine("native-language PASS");
    }
}
