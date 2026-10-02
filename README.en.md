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
`npm run test:ui` (requires Edge) and `npm run check:source`.
Production startup/build/pairing are intentionally blocked until shared data
roots, ports and process isolation are implemented. Tests use temporary roots,
loopback ephemeral ports and synthetic data. Windows-only RTF tests use a hidden
RichTextBox parser, not the clipboard.

Incoming files/video: 512 MiB; incoming text/image processing: 64 MiB.
The existing outbound path has no equivalent general limit. The 256 MiB history
cache budget is not a total disk quota; incoming originals are separate.

Major release gates: safe first-run onboarding without Tailscale, data migration,
owned firewall cleanup, data-preserving updates/rollback/uninstall, clean Windows
and real-iPhone acceptance, licensing/notices/SBOM, reproducible packaging and
complete publication privacy review. Project license and asset rights remain
undecided. See the Turkish detailed guides for the current engineering record;
complete English installation/security/troubleshooting guides are still pending.
