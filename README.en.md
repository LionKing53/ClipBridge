# PanoKopru

A Windows/iPhone clipboard bridge with Shortcut-triggered bidirectional text,
image and file transfer, desktop history, favorites, preview search, themes and
trusted-network management.

This is a development-only source baseline, **not an installable public release**.
The existing personal installation was not moved or updated. No personal state,
credentials, certificates, profiles or installed dependencies were imported.

iPhone transfers require an Apple Shortcut; Back Tap is an optional user setup.
There is no automatic iPhone clipboard synchronization or automatic switching
between local HTTPS and Tailscale. A desktop “ready” indicator is not an iPhone
end-to-end connectivity test. Search covers filenames/text previews, not full
stored content. Received images can be saved to Photos, files to a selected
location, and text to the iPhone clipboard for later manual pasting.

Read AGENTS.md, PROJECT-STATUS.md and docs/ROADMAP.md before development.
Use `npm ci --ignore-scripts --no-audit --no-fund`, `npm test`,
`npm run test:ui` (requires Edge), `npm run check:source` and `npm run check:history`.
Production startup/legacy build/pairing remain intentionally blocked pending native
acceptance. `build:native` compiles only; `build:candidate` produces a guarded,
non-installable engineering payload. Shared roots/ports/process identity, offline migration, local-first
setup UI, owned permission cleanup and storage management now exist in source.
Tests use temporary roots,
loopback ephemeral ports and synthetic data. Windows-only RTF tests use a hidden
RichTextBox parser, not the clipboard.

Incoming files/video: 512 MiB; incoming text/image processing: 64 MiB.
The existing outbound path has no equivalent general limit. The 256 MiB history
cache budget is not a total disk quota; incoming originals are separate.

`npm run report:dependencies` produces a lockfile CycloneDX component inventory
and collected license evidence under ignored build/. It is not the Windows
distribution SBOM or a license-compliance approval. Use npm.cmd in PowerShell if
the npm.ps1 wrapper is blocked; do not weaken machine execution policy.

Major release gates: production installer/bootstrapper/updater/uninstaller,
WebView2 Runtime installation, real ACL migration, clean Windows
and real-iPhone acceptance, final binary notices and privacy review. The isolated
update/rollback kernel does not update an installation. This project is licensed
under the GNU General Public License version 3 or, at your option, any later
version (**GPL-3.0-or-later**); see [LICENSE](LICENSE). Provided without warranty
to the extent permitted by applicable law. Logo provenance is recorded
as an owner statement, not a legal guarantee.

Pinned Node/SDK acquisition, full native compilation and guarded allowlist
packaging are verified. The launcher now validates an owned installation receipt
and payload before setting its runtime context, reports missing WebView2 Runtime
with an opt-in official download-page handoff, and implements confirmed dead-lock
recovery. These changes are synthetic-tested/compiled, not installed acceptance.
The SDK is not the Runtime. See [installed launch contract](docs/INSTALLED-LAUNCH.md).

See [architecture](docs/ARCHITECTURE.md), [lifecycle boundaries](docs/LIFECYCLE.md),
[acceptance matrix](docs/ACCEPTANCE.md), [TR/EN Shortcuts](docs/SHORTCUTS.md),
[third-party notices status](THIRD-PARTY-NOTICES.md) and PROJECT-STATUS.md.
A complete tested end-user installation guide awaits the actual installer.
