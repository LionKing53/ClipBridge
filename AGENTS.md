# ClipBridge development contract

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
   Make small local commits after reviewing the staged diff. Development sessions
   must not push; the publication session may publish within explicit owner scope.

## Private installation and data

Canonical default for new checkouts: `%USERPROFILE%/source/ClipBridge`.
The existing canonical checkout is not moved; use ignored machine records.
New installation: `%LOCALAPPDATA%/Programs/ClipBridge`.
New-design personal data: `%LOCALAPPDATA%/ClipBridge`.
The owner's legacy installation/data retain their previous PanoKopru paths;
no brand-related data migration or certificate/hostname regeneration is allowed.
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

`build-candidate.js` is a file-only packaging check on a clean committed source:
fresh production dependencies with scripts disabled, explicit app/native inputs,
allowlisted source snapshot, notices/inventory, sealed manifest and source guard.
Its ignored build/candidate-* output is NOT an installer or accepted release.
It may not launch packaged executables or change any Windows/application state.

The isolated OwnedNodeProbe may compile only OwnedNode.cs plus its synthetic
harness and run a synthetic Node stdin child with temporary test output. It must
not compile/run Program/Main, WebView or production clipboard/network adapters.
Native application start/stop and real installer acceptance remain separate.

The InstalledLaunchProbe may compile only InstalledLaunch.cs and its synthetic
console harness. It validates receipts and hashes under a temporary fake profile;
it must never call Program, ConfigureEnvironment, WebView or a production adapter.
Crash-recovery tests use synthetic child PIDs and temporary data only. Signal 0
checks process existence, never terminates it; tests must not target personal locks.

The FreshInstallProbe may compile only FreshInstall.cs, InstalledLaunch.cs and
its synthetic adapter/harness. It copies non-executable fixture files under a
temporary fake profile, never changes ACLs, registers shortcuts or invokes the
real WindowsFreshInstall adapter. `build-setup.js` may compile the full standalone
setup beside a matching clean guarded candidate, binding its manifest hash. Do
not run that executable. It retains the candidate's source/not-installable gates;
this compile-only exception does not authorize production installation, source
guard removal, unguarded packaging or personal-machine acceptance.

## Deployment/release gates

### Logo readability — owner decision 2026-10-10

The publication conversation may adjust the desktop c/b monogram spacing and
alignment, regenerate isolated English screenshots and record a separate source
commit after the development lock is released. Do not alter or rebuild the handed
off candidate or personal installation. Keep its recorded hashes/source revision;
any future package must explicitly include this later source change.

### Experimental package handoff — owner decision 2026-10-10

Prepare current ClipBridge EXE/ZIP and source companions for the publication
conversation, without adding product features or touching the personal install.
Real clean Windows/iPhone acceptance is pending, not a stable-release gate to
silently mark passed. Experimental labeling does not waive distribution licenses.
Review source coverage, notices, package hashes and privacy; keep an unresolved
native rebuild/compatibility check explicit. The previous separate-environment
native-build decision remains: no WSL/Docker installation or upstream build-script
execution on this host. Do not publish here or approve binaries while that
distribution review remains incomplete.

### GitHub repository rename — owner decision 2026-10-09

The owner authorized the publication conversation to rename the existing public
repository to `LionKing53/ClipBridge`, update origin and current repository links,
and publish this documentation record. The canonical checkout stays in place;
personal installation/data and binary release gates remain unchanged.
Current repository: https://github.com/LionKing53/ClipBridge.

### ClipBridge rebrand — owner decision 2026-10-09

Use ClipBridge as the same TR/EN brand, including new-install technical names,
native metadata, package/shortcut/asset names and fresh network identities.
The owner requested updating the existing application too. A narrow reviewed
brand/language patch may be deployed after tests and a verified private backup,
with program-only rollback. Preserve existing executable/shortcut compatibility,
data paths, CA/hostname, tokens, network permissions, history, files and theme.
Do not move the personal installation or recreate its identity to erase an old
name. Legacy protocol aliases and protected paths remain explicit compatibility
exceptions. Do not rename the public repository or push from this conversation.

### Localization and personal language patch — owner decision 2026-10-09

The owner explicitly authorized complete TR/EN localization and, after isolated
tests, a narrow language update of their existing personal installation. Verify
a private backup and retain code rollback before replacement. Do not reinstall,
reset or migrate its legacy data; preserve identity, certificates, networks,
history, favorites, inbox and WebView/theme. Read only reviewed program sources
for the compatibility patch; never import personal state into the repository.
The language patch is not a production updater or clean-device acceptance.
Local preference/native UI checks may run on this authorized installation; do
not exercise the real clipboard, firewall or certificates without separate scope.
No GitHub operations. Existing publication/binary acceptance gates remain.

### English documentation and screenshots — owner decision 2026-10-09

The publication conversation may make README and setup documentation English-first,
retain Turkish copies and publish synthetic English documentation screenshots.
Since 1.2.0, captures must use the real app language preference; do not inject
translated labels. `capture-docs.js` may render the real desktop UI in headless Edge with temporary fixture data, complete
synthetic OS adapters and blocked browser clipboard writes. No real installer,
UAC, certificate store, pairing QR or personal state may be captured. Only PNGs
individually reviewed and hash-pinned in source-manifest.json may enter Git;
source/history gates must continue rejecting unapproved binary files and metadata.

### Source publication — owner decision 2026-10-09

The owner authorized the publication conversation to review source/privacy and
reachable Git history, update TR/EN README status and publish the public source
repository. This authorization excludes binary releases, installer execution and
personal deployment. Clean Windows/iPhone acceptance and native rebuild/distribution
review remain pending. Future pushes still require an authorized publication task.

### Native source provisions — owner decision 2026-10-08

The owner assigned actual libvips rebuild validation to a separate environment.
Do not install WSL/Docker here. File-only pinned source acquisition, tar listing/
stdout notice reads, recipe snapshots and source-companion ZIP production are
authorized. Do not execute upstream build scripts here. The optional native
library override only changes fresh candidate staging; never personal installs.
Record source/checksum/recombination tests separately from actual native builds.

### Acceptance deferral — owner decision 2026-10-08

The owner postponed testing on a separate Windows computer and iPhone and asked
to finish the EXE/package. Record clean-device acceptance as deferred/unverified,
not passed. Their reported successful network enrollment/transfer concerns the
existing personal installation, not this source-built installer. Continue file-only
packaging and publication checks; do not install on the personal host. Do not
mark native-library distribution obligations resolved just because testing was
deferred. GitHub publication remains the other conversation's responsibility.

### First usable release scope — owner decision 2026-10-07

The owner now authorizes producing an installable, clean-install-only Windows
x64 package through an explicit release build (never by deleting the checkout
guard). Keep SOURCE-CHECKOUT in this repository and its source snapshot; omit it
only from the reviewed runtime payload of that explicit build. Guarded candidate
builds remain available. No production updater, rollback or legacy migration in
this release: leave the experimental kernel disconnected and production-refusing.
Add a data-preserving removal path. Do not deploy or run it on the personal host.
Actual installation/UAC/firewall/phone acceptance is to be arranged with the owner
on their separate clean test computer; record pending until observed/reported.
Do not present compilation/synthetic tests as device acceptance. No GitHub writes.
The narrow synthetic harness exception also permits testing removal core logic
with fake process/permission/shortcut adapters and temporary owned files only.

No install move, service restart, data migration, firewall changes, certificate
changes, Tailscale Serve changes or uninstall during ordinary source work.
Require reviewed private backup, passing isolated tests and explicit deployment
authorization before touching the personal installation. Preserve credentials,
CA identity, networks, history, favorites, incoming files and theme preferences.
Rolling back code must not silently restore old data or discard new transfers.
Clipboard access remains in the interactive user session, never LocalSystem.
Do not choose a project license or assert asset/distribution rights without the
owner's decision and review. Release remains blocked until roadmap gates pass.
