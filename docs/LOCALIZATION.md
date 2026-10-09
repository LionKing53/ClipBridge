# Türkçe / English

Version 1.2.0 provides real application localization, not documentation-only
replacement labels. Choose **Türkçe / English** in **Ayarlar / Settings**.
The preference is saved in `ui-settings.json` under the configured data root.
Existing users default to Turkish. A fresh installation uses Turkish for a
Turkish Windows UI language, English otherwise; the installer choice wins.

The desktop, setup/removal UI, launcher/tray, pairing and phone guides share
reviewed catalogs in `locales/`. Phone pages follow the Windows app preference.
Windows-owned UAC dialogs, iOS settings and third-party software retain their
own operating-system language. Native Yes/No button labels are Windows-owned.

Dates/numbers use `tr-TR` or `en-US`. Search uses locale-aware case handling;
name sorting uses `Intl.Collator`. Protocol paths, error codes, access keys,
network/file names and transferred user contents are never translated.
Language-only saves do not change history limits or trim history.

## Existing personal installation

The explicitly authorized personal language patch keeps its legacy data root
and transfer/network implementation. It is not a migration, reinstall or a
general-purpose updater. Its six reviewed program inputs are hash-pinned;
an unreviewed version is refused. Program files come from canonical source or
the audited language-only adapter. No private data enters an artifact.
The compatibility launcher binds to the hash-pinned existing WebView2 SDK
assemblies; those libraries/runtime are not upgraded by a language patch.

Back up privately and verify hashes before replacement. Preserve Windows
certificate store/DPAPI identity and all user data. Rollback restores only
changed program files; never automatically replace data with an older backup.
The legacy runtime does not gain the fresh-install/storage/permission-cleanup
features of the new layout; unavailable controls remain disabled.

## Verification and limits

Synthetic tests cover catalog/reference and parameter parity, language defaults,
preference restart persistence, native preference preservation, two-language
setup form rendering, browser layouts, setup security wording and unchanged
Unicode contents/protocols. Compilation is not clean-machine/iPhone acceptance.
Documentation screenshots now use the real English language option in an
isolated synthetic fixture and verify preference persistence after reload.

Türkçe: Dil seçimi Ayarlar'da yapılır ve yeniden açılışta korunur. Telefon
rehberleri uygulamanın dilini kullanır. Windows/iOS'un kendi pencerelerinin
dili değiştirilmez. Dil güncellemesi eski kişisel verileri taşımaz/sıfırlamaz.
Geri alma yalnız programı geri getirir; sonraki aktarımları silmez.
