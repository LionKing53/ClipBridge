# PanoKopru development contract

## Single source and ownership

This repository is the only canonical development source. The personal installed
application is a deployment, not another development branch. Do not copy fixes
back into the installation without a separately authorized deployment step.
Development belongs to the main development conversation. The publication
conversation owns release review and GitHub publication; it must reread this
repository, not rely on an old conversation summary. No GitHub operations from
the development conversation. No simultaneous conflicting edits.

## Every work session

1. Read this file, PROJECT-STATUS.md, CHANGELOG.md and docs/ROADMAP.md.
2. Inspect `git status --short`, recent commits, and `.local/work-lock.json`.
3. Preserve all existing changes. If another owner has an active lock, stop and
   coordinate. Acquire the advisory lock with `node scripts/work-lock.js acquire
   <owner>` before editing; it is local-only, not a security boundary.
4. Do not expire or steal an existing lock automatically. Release it with the
   same owner at handoff. A crashed session requires explicit review.
5. At completion, record tests actually run, failures, source/deployment
   compatibility and remaining blockers in PROJECT-STATUS.md and CHANGELOG.md.
   Make small local commits after reviewing the staged diff. Never push here.

## Private installation and data

Canonical default: `%USERPROFILE%/source/PanoKopru`.
Installed program: `%LOCALAPPDATA%/Programs/PanoKopru`.
New-design personal data: `%LOCALAPPDATA%/PanoKopru` (NOT migrated yet).
Exact machine paths and imported-file checksums are in ignored `.local/`.

Never read or copy personal clipboard/history, tokens, pairing QR/HTML, private
keys, PFX/DPAPI, WebView profiles, logs or backups into source, tests, screenshots
or packages. Do not publish actual network/device names, tailnet addresses or
user-specific absolute paths. Use synthetic fixtures. Do not print secrets.
Only explicitly allowed source files may be tracked/exported; `.gitignore` is
not a publication security review. Review complete Git history and archives too.

## Execution and tests

`SOURCE-CHECKOUT` intentionally blocks production startup and real OS adapters.
Do NOT remove it simply to run the application. Explicit validated isolated
contexts may loadConfig/startBridge only with complete injected OS adapters.
Shared data roots/identity now have tests, but native deployment acceptance is
still pending. Never silently
fall back to installed state when development/test configuration is absent.

Use `npm ci --ignore-scripts --no-audit --no-fund`, `npm test`, `npm run test:ui`
and `npm run check:source`. Review new dependency lifecycle scripts before any
execution. Unit/integration tests must use temporary directories, ephemeral
loopback ports and injected clipboard/network/permission operations. Windows
RTF parsing may start a hidden PowerShell RichTextBox parser; it must not access
the real clipboard. UI fixtures must mock hostname, Tailscale and OS actions.
No real network trust/UAC/firewall/certificate/clipboard test without explicit
scope and separate acceptance arrangements. Never run inherited helper scripts
merely because they are present. See docs/TESTING.md.

Narrow diagnostic exception: the new read-only `inspect-install-host.ps1` and
`InstallProbe.cs` may inspect OS architecture and WebView2 Runtime registry
values, and inspect access/disk/PE metadata only on synthetic temporary targets.
`createIsolatedWindowsInstallProbes` requires a validated non-production context,
scopes targets under its data root and probes only its isolated loopback ports.
This does not allow production adapters, registry/ACL changes, candidate binary
execution, installation or personal-data reads. Existing production gates stay.

PowerShell may block npm.ps1; use npm.cmd without changing machine execution
policy. The runtime contract probe compiles only a synthetic C# executable and
reads synthetic context via PowerShell; it does not build/run the native app.
`release-store.js` is an isolated prototype, not a production updater. Keep its
production refusal until launcher, ownership, signing and acceptance are ready.

`acquire-toolchain.js` may download pinned official archives into ignored build/.
`build-native.js` is a compile-only exception: extract selected verified inputs,
compile all launcher sources into a fresh build/native-* directory, preserve the
SOURCE-CHECKOUT marker and never run the resulting app or installer. It does not
relax the guarded legacy build-app.js or authorize personal deployment.

## Deployment/release gates

No install move, service restart, data migration, firewall changes, certificate
changes, Tailscale Serve changes or uninstall during ordinary source work.
Require reviewed private backup, passing isolated tests and explicit deployment
authorization before touching the personal installation. Preserve credentials,
CA identity, networks, history, favorites, incoming files and theme preferences.
Rolling back code must not silently restore old data or discard new transfers.
Clipboard access remains in the interactive user session, never LocalSystem.
Do not choose a project license or assert asset/distribution rights without the
owner's decision and review. Release remains blocked until roadmap gates pass.
