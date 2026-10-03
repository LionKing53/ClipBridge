# First-install preflight contract

Status: isolated-tested decision engine, **not a usable installer**. No production
OS probe adapter, setup executable, download or startup registration is supplied.
`runInstallPreflight` in `src/install-preflight.js` is not connected to the current
launcher or release store. Do not treat a successful report as deployment approval.

## Inputs and effects

The caller supplies an absolute candidate directory, independently pinned release
manifest SHA-256, disjoint program/data destination roots, exactly three distinct
unprivileged ports, an exact bundled Node version, a minimum WebView2 Runtime
version and nonnegative integer program/data byte reserves. Versions used in tests
are synthetic policy examples, not a supported production version matrix.

The existing release verifier checks the manifest and every listed file. The
candidate must include a nonempty `runtime/node.exe`; this is not yet a complete
native application layout check. The package hash must come from authenticated
release metadata; taking a hash from the same untrusted download is insufficient.

The engine only reads the candidate and checks target existence/link ancestry.
It never creates destination directories, inspects existing personal data,
downloads/executes a runtime, stops an application or changes Windows settings.
Existing destinations, including empty directories, block **first install**.
Resume, update, adoption and migration must be separate ownership-checked flows.

All OS probes are injected and must be read-only. No automatic real-OS fallback
exists. They receive `{ signal }` as their final argument and must stop their own
child process/socket promptly on abort. A probe has a default five-second timeout
(explicit range 1–30000 ms). The engine signals cancellation but cannot forcibly
clean up an adapter that ignores it. Real adapters still need acceptance tests.

| Probe | Required result | Future adapter obligation |
| --- | --- | --- |
| `host(options)` | `{ platform: 'win32', arch: 'x64' }` | Identify the actual target OS/architecture; supported Windows versions remain a separate release gate |
| `webView2(options)` | `{ complete: true, versions: [userPv, machinePv] }` | Read both Runtime registry scopes; `null` for confirmed absence, incomplete/error for inaccessible scope |
| `nodeRuntime(absoluteExecutable, options)` | `{ version, platform: 'win32', arch: 'x64' }` | Inspect only the verified candidate, never PATH or the personal installation; execution needs bounded lifetime |
| `destination(absoluteRoot, options)` | `{ writable: true, volumeId, freeBytes }` | Inspect the nearest existing ancestor for the intended user's rights; return a canonical volume identity and available bytes |
| `port(number, options)` | strict `true` only when available | Account for relevant address families/bind addresses and release all temporary sockets; no killing conflicting processes |

Missing adapters are input errors. Failed/unknown probes block the report.
The Node probe is skipped when package verification or platform checking fails.
Probe exception text and raw registry/volume/path data never enter the public
report. Startup preference defaults to false and is only returned, not applied.

## WebView2 detection

Edge Stable being present does not establish WebView2 Runtime availability. SDK
files used during compilation are not a substitute for the Runtime. Microsoft
documents the Runtime's `pv` registry value under both HKCU and HKLM; a valid
installation has a version greater than `0.0.0.0`. For x64 Windows, the HKLM key
uses `SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients` and HKCU uses
`Software\Microsoft\EdgeUpdate\Clients`, with client ID
`{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}`.
See [Microsoft's WebView2 distribution guidance](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution).

The pure evaluator compares four numeric components, considers both scopes, and
distinguishes missing, outdated and unknown. A failed scope lookup is not evidence
of absence. No registry lookup or Runtime installer was executed in these tests.

## Capacity and races

Capacity budgeting includes two copies of all payload files and the manifest,
plus explicit program and data reserves. Requirements for destinations on the
same canonical volume are summed; the lower observed available space is used.
Different volumes are evaluated independently, with integer-safe arithmetic.
Reserves must cover filesystem overhead and any future download/bootstrap needs.
This is a planning estimate, not a quota or disk-space reservation.

Successful checks are a snapshot, not a lock or security boundary: paths, ACLs,
ports, bytes and available disk space can change immediately afterwards. The
future installer must revalidate integrity, ownership, link ancestry, capacity
and bind success immediately before the respective operation. It must not blindly
trust this report or execute a candidate whose bytes changed after verification.

## Current tests and remaining integration

Ten tests use temporary synthetic packages and injected OS observations. They
cover successful read-only planning, WebView2 version scopes, invalid inputs,
existing targets, tampering, shared-volume budgeting, distinct failure codes,
sanitized errors, timeout cancellation and a linked destination ancestor.
No actual Windows clipboard, certificate, network permission or personal runtime
is used. Reports always include `productionReady: false`.

Next: reviewed Windows probe adapters, clean pinned Node/WebView2 SDK acquisition,
an isolated native build and complete package layout verification. Then connect
the checks to setup UI and production lifecycle only after ownership/recovery
design and clean-machine acceptance. Keep `SOURCE-CHECKOUT` and production guards.
