# Documentation screenshots

These screenshots show the real HTML/CSS desktop interface rendered by
Microsoft Edge in an isolated fixture. The capture script selects **English**
through the application's **Settings → Language** control and verifies the
saved preference after reload. No documentation-only text replacements are used.
The app supports both **English and Turkish** starting with version 1.2.0.
The current desktop screenshots use the **ClipBridge 1.2.1** product name.
The light/dark history images include the 2026-10-10 c/b monogram spacing fix.

The sample computer (`DEMO-PC`), network (`Demo Home`), addresses, text, image
and PDF are synthetic. No personal clipboard, network settings, credentials,
certificate store or installed application is read. No pairing or certificate
QR is captured. A ready state in these previews is a fixture, not device acceptance.

## Reproduce

After restoring the project's reviewed dependencies:

```powershell
node scripts/capture-docs.js
```

Output goes to ignored `build/docs-preview/`. The script binds an ephemeral
loopback port, uses complete synthetic OS adapters, blocks browser clipboard
writes and deletes its temporary fixture state when finished. It never calls
production onboarding or Windows permission adapters.

Review every image visually before copying it into `docs/images/`. Approved
images are listed individually in `source-manifest.json` with SHA-256, size and
dimensions. Source/history checks allow only those exact PNG bytes, reject
unapproved binary files and reject PNG text/EXIF metadata. Replacing an image
requires another explicit visual/privacy review and an update to the image
policy, including consideration of its earlier Git-history version.

## Reviewed images

| Image | Purpose |
| --- | --- |
| `history-light.png` | Text, image, PDF, favorites and history in the light theme |
| `history-dark.png` | The same synthetic history in the dark theme |
| `trusted-networks.png` | Local network trust, permissions and manual route selection |
| `first-time-setup.png` | Network selection and Windows approval explanation |

The landscape thumbnail is a simple SVG created in the capture script. All
visible text and examples were reviewed for English labels and privacy.
These screenshots and Mermaid diagrams document the flow; no iOS or installer
acceptance screenshot is claimed.
