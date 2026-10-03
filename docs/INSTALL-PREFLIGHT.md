# First-install preflight contract

Status: decision engine and real Windows observation adapter tested in isolation,
**not a usable installer**. No production OS adapter, setup executable, download
or startup registration is supplied.
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

The engine and Windows adapter only read candidate/target metadata; the adapter
also temporarily binds and closes isolated loopback sockets. They never create
destination directories, inspect existing personal data, download/execute a
runtime, stop an application or change Windows settings.
Existing destinations, including empty directories, block **first install**.
Resume, update, adoption and migration must be separate ownership-checked flows.

All OS probes are injected and must be read-only. No automatic real-OS fallback
exists. They receive `{ signal }` as their final argument and must stop their own
child process/socket promptly on abort. A probe has a default five-second timeout
(explicit range 1–30000 ms). The engine signals cancellation but cannot forcibly
clean up an adapter that ignores it. Real adapters still need acceptance tests.

| Probe | Required result | Future adapter obligation |
| --- | --- | --- |
| `host(options)` | `{ platform: 'win32', arch: 'x64', elevated: false }` | Identify the actual target OS/architecture and original non-elevated context; supported Windows versions remain a separate release gate |
| `webView2(options)` | `{ complete: true, versions: [userPv, machinePv] }` | Read both Runtime registry scopes; `null` for confirmed absence, incomplete/error for inaccessible scope |
| `nodeRuntime(absoluteExecutable, options)` | `{ version, platform: 'win32', arch: 'x64' }` | Inspect only the verified candidate's PE/version resources, never execute it or use PATH/personal runtime |
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
of absence. The Windows adapter test now reads both registry scopes; it never
logs their raw values, writes a key or runs a Runtime installer.

## Windows observation adapter (isolated only)

`createIsolatedWindowsInstallProbes` requires a validated development/test context
and a pinned candidate beneath its explicit data root. It rejects production
contexts, foreign targets, package-overlapping destinations, linked ancestors and
ports not listed in that context. Runtime metadata is rechecked against the full
package manifest immediately before inspection. All adapter failures are sanitized.

The fixed `inspect-install-host.ps1` helper compiles the repository's small C#
observer with Add-Type (temporary compiler artifacts may be created). It uses
hidden, noninteractive PowerShell, a bounded output buffer, a ten-second child
timeout and AbortSignal cancellation. Targets are argument data, never shell
source. It does not invoke a candidate executable or a production permission
helper. Elevated contexts are reported by Host and refused by other operations;
the preflight engine blocks such a host. Different-user/UAC installer handling
remains unimplemented.

Host architecture comes from
[IsWow64Process2](https://learn.microsoft.com/en-us/windows/win32/api/wow64apiset/nf-wow64apiset-iswow64process2),
not just the architecture of the querying process. Unsupported API calls fail
closed. Destination probing opens the nearest existing ancestor using
[CreateFile directory semantics](https://learn.microsoft.com/en-us/windows/win32/fileio/obtaining-a-handle-to-a-directory)
with OPEN_EXISTING and add-file/add-subdirectory rights; it creates nothing.
This only observes the ancestor's current access, not inherited rights on future
children, Controlled Folder Access behavior, or eventual write success.

Available bytes use the caller-specific result of
[GetDiskFreeSpaceEx](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getdiskfreespaceexw);
volume grouping uses
[GetVolumeNameForVolumeMountPoint](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-getvolumenameforvolumemountpointw).
UNC paths, long paths over the conservative 240-character helper limit, and
reparse points (including mounted folders) are rejected. A denied/unknown query
does not grant readiness.

Node inspection reads PE machine type and
[ProductVersion metadata](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.fileversioninfo.productversion)
while holding a read handle that denies writes/deletion. It is not proof the
runtime can actually start; that requires a separately scoped clean-artifact
smoke test and authenticated package provenance.

The port adapter tests only IPv4 loopback, never all interfaces, firewall policy
or LAN reachability. Production binding on the selected LAN interface, IPv6 and
race-aware activation are still acceptance gates. Even a passing report retains
`productionReady: false`.

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

Eleven engine tests use temporary synthetic packages and injected OS observations. They
cover successful read-only planning, WebView2 version scopes, invalid inputs,
existing targets, tampering, shared-volume budgeting, distinct failure codes,
sanitized errors, timeout cancellation, a linked destination ancestor and elevated
user-context rejection. Eight adapter tests add real loopback lifecycle checks,
scope enforcement, read-only registry/disk observations, native PE metadata and
child-process cancellation. A synthetic Node-named executable is compiled but
never executed. Full preflight composition uses that fixture plus a synthetic
WebView version so success does not depend on installed WebView versions.
No actual Windows clipboard, certificate, network permission or personal runtime
is used. Reports always include `productionReady: false`.

Next: clean pinned Node/WebView2 SDK acquisition,
an isolated native build and complete package layout verification. Then connect
the checks/production adapters to setup UI and lifecycle only after ownership/recovery
design and clean-machine acceptance. Keep `SOURCE-CHECKOUT` and production guards.
