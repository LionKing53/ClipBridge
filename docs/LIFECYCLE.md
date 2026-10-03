# Migration, update and removal — implementation boundary

No production installer/updater/uninstaller is approved yet. Do not copy this
source onto a working installation. The source guard must remain in place.

## Implemented and isolated-tested

`install-preflight.js` adds a read-only first-install decision engine with
mandatory injected OS probes, package integrity checks, separate data/program
targets, existing-target/link rejection, WebView2/Node/platform checks, shared-
volume disk budgeting, port checks and an opt-in startup preference. Unknown
results and timeouts block readiness; reports omit sensitive probe details.
It is not connected to an installer and always reports `productionReady: false`.
The Windows observer now supplies real metadata/access/space probes in validated
isolated contexts, with scoped IPv4 loopback probes. It rejects production mode
and elevated data inspection; it does not execute the candidate Node binary.
See [the input/probe contract and limitations](INSTALL-PREFLIGHT.md).

`data-migration.js` performs an explicitly confirmed same-account, offline,
copy-only migration. Paths must be absolute, disjoint, unlinked, and targets
absent. A caller-provided reviewed private ACL adapter is mandatory. It creates
and verifies a separate file backup before creating a staging tree, hashes files
with streaming SHA-256, preserves credentials/CA metadata/history/files, rewrites
only history source paths inside the old root, writes schema 1, then checks that
the original did not change before activating the destination. It never deletes
the original or silently overwrites a target. Failed stages/backups remain for
explicit recovery. Theme/WebView compatibility requires real native acceptance.

`release-store.js` is an **isolated-only lifecycle kernel**, not an installed
updater. It rejects production contexts. It verifies a manifest with version,
40-character source commit, schema range, exact file allowlist, byte lengths and
SHA-256 hashes. It rejects traversal, Windows device names, case collisions,
links, extra files and tampering. A caller must independently pin the manifest
digest. A hash alone does not authenticate the publisher; signed/pinned release
metadata and key rotation are not implemented.

Candidate files are staged and verified before an injected preflight. A journal
precedes stop/activation, immutable release directories are retained, and an
atomic pointer records current/previous versions. A failed activation demands
explicit stopped-state recovery; no process is blindly killed or restarted.
Recovery and rollback recheck package integrity/schema and change the program
pointer only. They never restore old user data. Tests confirm new transfers
survive a failed update/rollback and newer schemas block incompatible rollback.

## Remaining production integration (release blockers)

- Stable launcher/bootstrapper must consume versioned release pointers. Current
  launcher still uses the established app/runtime layout; **do not connect the
  isolated kernel to it without redesigning and testing ownership/permissions**.
- Verify/acquire clean Node and WebView2 artifacts; handle prerequisite absence,
  disk capacity, writable paths, port conflicts and user startup preference.
- Implement signed/pinned release acquisition, production preflight, controlled
  process shutdown, interrupted initial installation and crash-lock recovery.
- Add real ACL adapter for legacy migration and private verified backup. Confirm
  actual CA/DPAPI, hostname, trusted networks, favorites, files and theme survive.
- Add production-safe uninstaller with explicit keep/delete personal data choice.
  Remove only owned shortcut/task/firewall/certificate/connection artifacts with
  identity checks. Never disable an entire shared Tailscale Serve 443 endpoint.
- Retaining program versions is not restoring data. Versioned future schema
  migrations need forward tests and declared rollback constraints.
- Profile category restoration requires current-state/ownership analysis, not
  only an old `previousCategory`. iPhone profile removal remains manual.

## Planned uninstall UX, not an available command

Default: remove program, keep data. Optional separate confirmed action: erase
personal data with an explicit warning that transfers/history/keys are lost.
Show an inventory of owned Windows artifacts before administrator cleanup. If
ownership cannot be proven, leave the artifact and explain manual review. Report
partial failure accurately. A different Windows account/computer uses a new
identity and phone pairing, not an assumed-restorable folder backup.
