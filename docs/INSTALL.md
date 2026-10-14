# ClipBridge — start here

**1.2.1 experimental test package. Clean Windows/iPhone installation and transfer
acceptance have not been completed. Setup is unsigned; this is not a stable release.**

1. Use a clean Windows x64 computer/account (Windows 11 or Windows 10 build
   19045+, kept supported and updated). Existing ClipBridge/PanoKopru program or
   data must not be overwritten. WebView2 Evergreen Runtime is required; setup
   provides Microsoft's download-page link if it is missing. Node is bundled.
2. Check the ZIP's SHA-256 against the supplied delivery record. Extract the
   **whole ZIP** to a local folder and keep this structure:

   ```text
   ClipBridgeSetup.exe
   payload/
   READ-ME-FIRST.md
   READ-ME-FIRST.tr.md
   ```

   **The EXE cannot be used alone.** Do not launch it from inside the ZIP or
   delete/change files in `payload`. Run setup as a normal user; login startup is
   optional and off by default. Do not disable security protections to bypass
   an unexpected warning.
3. Open ClipBridge. Choose Settings → Language → English or Türkçe. Select a
   network you control in first setup. Windows permission needs administrator
   approval and sets that network to Private, which may also activate other
   apps' existing Private-profile rules.
4. On iPhone, download the public CA through the wizard's temporary link.
   Independently compare the fingerprint shown on both devices, install the
   profile, and explicitly enable certificate trust. Root trust extends beyond
   this app. Never bypass a TLS warning or share a pairing QR/access key.
5. Complete HTTPS pairing and create send/receive Apple Shortcuts using your
   own endpoint and key. Follow the [Shortcut actions](https://github.com/LionKing53/ClipBridge/blob/main/docs/SHORTCUTS.md)
   and [full setup guide](https://github.com/LionKing53/ClipBridge/blob/main/docs/QUICKSTART.md).
   Test text, a small photo and a PDF in both directions. These online guides
   are also in `application/docs` inside the matching source ZIP.

Local use does not require Tailscale. Remote use has separate optional Tailscale
Shortcuts; **route selection is manual**. There is no automatic iPhone clipboard
sync. File/video input limit: 512 MiB; text/image processing: 64 MiB.

Removing a trusted network only removes app trust; it does not revert the Windows
profile or delete firewall rules. Permission cleanup is a separate UAC-approved
action that removes owned rules and leaves profiles/Tailscale settings unchanged.

Keep the extracted setup and payload. To uninstall, reopen the same version's
setup and choose **Remove (keep data)**. Owned program files, shortcuts and
firewall rules are removed; data and Windows CA identity are retained. Cancelled
firewall approval retains the program. Remove only this app's certificate profile
manually on iPhone. Retained data prevents another clean install under that account.
Automatic updates, production rollback and legacy migration are not included.

Licenses and source-package identity: `payload/licenses`. The matching
`ClipBridge-1.2.1-sources.zip` is offered alongside the binary at the same download
location; it is for rebuilding, not a prerequisite to start setup. For problems,
use the [troubleshooting guide](https://github.com/LionKing53/ClipBridge/blob/main/docs/TROUBLESHOOTING.md)
and report the version, hash and sanitized error code, without personal content.
