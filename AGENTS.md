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
Planned personal data: `%LOCALAPPDATA%/PanoKopru` (NOT migrated yet).
Exact machine paths and imported-file checksums are in ignored `.local/`.

Never read or copy personal clipboard/history, tokens, pairing QR/HTML, private
keys, PFX/DPAPI, WebView profiles, logs or backups into source, tests, screenshots
or packages. Do not publish actual network/device names, tailnet addresses or
user-specific absolute paths. Use synthetic fixtures. Do not print secrets.
Only explicitly allowed source files may be tracked/exported; `.gitignore` is
not a publication security review. Review complete Git history and archives too.

## Execution and tests

`SOURCE-CHECKOUT` intentionally blocks loadConfig/production startup. Do NOT
remove it simply to run the application. First implement shared data roots,
isolated ports and process identity across Node, C# and PowerShell. Never silently
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
