# Acceptance matrix — 2026-10-03

Automated tests use synthetic data and injected OS actions. A PASS there is not
proof of real firewall behavior, iPhone trust, native packaging or deployment.
Record Windows/iOS versions, package hash/commit, operator and result for each
manual run in a private acceptance log. Never put tokens or real network names
in public test output. No manual row below has been executed in this source turn.

| Scenario | Automated evidence | Manual acceptance still required |
| --- | --- | --- |
| Shared roots/ports/identity | Node + compiled C# resolver + read-only PowerShell comparison | Full WebView launcher and standard-user paths |
| Startup collision | Separate ports, partial-start cleanup, lock refusal | Existing install running, stale lock after crash |
| Migration | Verified synthetic backup, concurrent-write rejection, path rewrite | Same-account CA/DPAPI/theme/file preservation |
| First local setup | Public CA listener, TTL, Host/Origin/network guard; fake fingerprint workflow and UI | Real iPhone certificate download/details/full-trust without Tailscale |
| Windows trust | Fake UAC cancellation, simultaneous operation/network change | Same-user and different-admin UAC, timeout, partial failure |
| Firewall removal | Fail-closed application permissions + scoped helper source | Actual old/new owned-rule cleanup; foreign rules untouched |
| Connections | Pure subnet/network policy and transport guard | Two adapters, Public/unknown network, removal mid-transfer |
| Transfer | Unicode/RTF/RTFD, image/file envelopes, streaming 65 MiB, exact artificial limits | Both directions text/photo/PDF/video, actual 512 MiB boundary, interrupted phone transfer |
| Storage | Owned-only cleanup, favorites/unmanaged preservation, stable ENOSPC mapping | Real disk exhaustion during upload/history/config write |
| Update/rollback | Isolated manifest/kernel, failed activation recovery, schema guard | Production bootstrapper, power loss, initial install interruption |
| Removal | Design only; destructive legacy uninstaller excluded | Keep/delete data, owned artifacts, shared Tailscale unaffected |
| Clean distribution | Fresh npm lock restore, audit, inventory/notices evidence | Clean x64 Windows without Node/Tailscale/WebView2; SDK/runtime acquisition and native build |
| Privacy/license | Allowlist gate, synthetic UI, lock inventory | Complete Git history/archive/QR/image inspection, project license, binary license compliance |

Release is blocked while production integrations in LIFECYCLE.md and unexecuted
manual rows remain. An approved disposable Windows environment is preferred;
tests that alter CA/firewall/clipboard must not silently target the personal
installation. Deployment to that installation requires separate authorization
and a verified private backup.
