# Runtime and data boundaries

One source project produces deployments. The source directory is not the running
personal installation, and the installation is not a second source branch.

| Purpose | Default / contract |
| --- | --- |
| Canonical source | `%USERPROFILE%/source/ClipBridge` |
| Program | `%LOCALAPPDATA%/Programs/ClipBridge` |
| Production data (new design) | `%LOCALAPPDATA%/ClipBridge` |
| Development/test | Explicit absolute `CLIPBRIDGE_DATA_ROOT`; never production data |
| Runtime mode | Explicit `CLIPBRIDGE_MODE`: production/development/test |
| Ports | Production API 32145, desktop 32146, local TLS 32147; isolated modes require three distinct other ports |

`runtime-context.js`, `launcher/RuntimeContext.cs` and `runtime-context.ps1`
share the identity contract: SHA-256 of mode + normalized absolute data root,
truncated to 24 hex characters. This is instance identification, not a secret or
authentication mechanism. Tests compare the three implementations on Windows.
Source builds retain `SOURCE-CHECKOUT`; production startup and native side
effects remain blocked until acceptance. The isolated native launcher is also
blocked; the test harness uses injected Node adapters, not the user's clipboard.

`boot.js` takes a validated context, acquires an exclusive instance lock, loads
schema/configuration, creates history/storage/diagnostics, then starts loopback
API and desktop servers. Failed partial startup closes its own listeners and
releases its own lock. An existing stale lock is **not** automatically stolen;
reviewed crash recovery remains a deployment requirement.

Schema version 1 is explicit. Unversioned data requires offline migration; newer
schemas cannot be opened silently. Production port changes require a coordinated
installer migration. Runtime-context changes cannot silently rebind existing data.

The desktop token is distinct from the phone token. Desktop routes require a
Bearer token, exact loopback Host and same Origin (when supplied). WebView uses
the same context for its origin and profile location. The phone API uses Bearer
authentication over local TLS or Tailscale's configured HTTPS path. Local
transport additionally checks the currently approved network and subnet.

Network/setup adapters contain Windows side effects; unit tests do not run them.
`local-services.js` composes first-run setup and the configured TLS listener.
The first-run config remains disabled/pending until explicit phone fingerprint
confirmation. No clipboard API or secret is served over the temporary public-CA
HTTP listener. Expiry, exact Host, no Origin, network checks and bounded downloads
restrict that listener; manual fingerprint verification is still essential.

Storage keeps an explicit index of newly received, app-owned files. Default
retention is unlimited. Manual cleanup requires confirmation, skips favorites
and does not adopt unknown legacy files. The 256 MiB history budget is not a disk
quota. Crash cleanup recognizes only old upload directories with this instance's
ownership marker; unknown directories are not recursively swept.

The clipboard component stays in the interactive Windows user session, never a
LocalSystem service. CurrentUser certificate private keys and DPAPI credentials
are account/machine bound; copying files is not a portable identity backup.
