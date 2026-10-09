# Installed launch contract / Kurulu açılış sözleşmesi

Status: implemented and synthetic-tested; **not an installer or release approval**.
No installation receipt is emitted by `build:candidate`; its SOURCE-CHECKOUT
guard remains. Do not manually create a receipt to run that candidate.

## Layout and validation

The current native layout is `%LOCALAPPDATA%/Programs/ClipBridge`, with `app/`
and `runtime/` beneath it. Data stays at `%LOCALAPPDATA%/ClipBridge`. A future
reviewed installer must copy and verify the complete release before writing
`install-receipt.json` as its last ready step:

```json
{
  "format": 1,
  "application": "ClipBridge",
  "state": "ready",
  "ownerSid": "<installing Windows user SID>",
  "manifestHash": "<independently verified release.json SHA-256>"
}
```

The native launcher derives the real current user's LocalApplicationData from
Windows, not from a receipt path. It rejects wrong location/owner, linked paths,
source guards, incomplete receipts, changed manifest/payload, unknown files,
duplicate/traversing/device paths, and incompatible schema bounds. It reads no
clipboard/configuration to validate installation. Only after success does it
set its own process environment for production. Explicit development/test or
conflicting inherited settings are rejected, not silently rewritten.

The receipt and hash provide **local installation consistency**, not publisher
authentication against another process with the same account's write access.
Signed/pinned acquisition and installer ACL/ownership review remain mandatory.
They must not be replaced by downloading a hash from the same untrusted payload.

## Missing prerequisites and startup failures

Before opening the UI or starting a new backend, the foreground launcher checks
WebView2 availability and rejects preview-channel versions. On failure it offers
the official Microsoft WebView2 download page only after the user selects Yes.
It does not download/execute an installer or silently request elevation.
This is a manual prerequisite handoff, not automatic/offline Runtime acquisition.
Microsoft documents this handoff as a distribution option:
[WebView2 distribution guidance](https://learn.microsoft.com/microsoft-edge/webview2/concepts/distribution).

A failed backend readiness check shows an error instead of opening an empty
WebView. Health probes are loopback-only, bypass proxies, bound response size,
and compare instance identity. Readiness still does not certify iPhone access.

Exit codes: 2 stop timeout, 4 installation/context rejection, 5 missing Runtime,
6 backend not ready, 7 unsuccessful/uncertain lock recovery. These are not proof
that overwriting/removing the installation is safe.

## Confirmed crash recovery

The future installed `--recover-lock` action refuses an active desktop/backend,
asks for explicit confirmation, then invokes only the fixed Node recovery entry
point. It does not start the bridge. The entry point verifies the existing data
identity, serializes with acquire/release, and checks a bounded regular lock
record. Signal 0 tests PID existence; it does not kill any process. Only ESRCH
(process absent) allows removal. Live/reused PIDs, permission errors, foreign or
malformed records, symlinks and identity changes fail closed.

An interrupted critical section can leave `instance.guard`. It is intentionally
not stolen or deleted automatically. No history, settings, keys or data backup
is deleted/restored during lock recovery. Actual Windows dialog, process/session
race and crash acceptance remain to be performed on a disposable test machine.

## Remaining integration

The stable app/runtime layout still differs from the isolated release-store's
versioned directories. A standalone first-installer now implements receipt writing,
private staging and shortcut/startup registration; see [FIRST-INSTALL.md](FIRST-INSTALL.md).
It is compiled against guarded candidates, not production-accepted. This receipt
contract does **not** connect the updater or implement rollback or uninstall.
The installer and elevated helpers must agree on one reviewed activation layout
before deployment. Personal legacy installation/migration remains separate.

Türkçe özet: çift tıklama için güvenli bağlam yükleme ve eksik Runtime bildirimi
kaynakta var; aday paket hâlâ açılamaz. Yeni ilk kurucu kayıt sözleşmesini
uyguluyor, fakat gerçek Windows kabulü bekliyor. Kilit kurtarma kullanıcı onayı ve kapalı süreç doğrulaması ister;
veri yedeği geri yüklemez, aktif süreci kapatmaz. Kişisel kurulum değişmedi.
