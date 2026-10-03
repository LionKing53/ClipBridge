# Verified native build (developer workflow)

This is a **compile-only** workflow, not a user installer. Do not copy its output
over a working installation. No app, installer, clipboard or certificate helper
is started by these commands.

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run toolchain:fetch
npm.cmd run build:native
```

Run from the canonical source on Windows with the x64 .NET Framework C# compiler.
Dependencies with lifecycle scripts are not executed. The build renders the
project SVG icon into its own fresh ignored output directory.

## Inputs and evidence

`toolchain-lock.json` pins Node 24.15.0 Windows x64 and WebView2 SDK 1.0.4258.31.
The official Node SHASUMS256 and NuGet catalog packageHash URLs are recorded with
the pins. HTTPS origin, redirect policy, maximum streamed size, digest and cache
integrity are checked. Corrupt cache entries are not silently replaced. Downloads
use exclusive partial files and no-clobber publication; linked paths are rejected.
This is not verification of a detached upstream release signature.

The extractor rechecks archive hashes and extracts only named runtime, SDK and
license entries. It rejects links, duplicate entries and excessive selected-entry
sizes. It also requires a valid Node Authenticode signature from OpenJS Foundation.
SDK archive integrity comes from its recorded NuGet SHA-512 pin.

`build/native-<unique-id>/` contains the compiled launcher, WebView2 SDK libraries,
Node runtime, native notices, icon and build/toolchain evidence. Evidence records
the base source commit, dirty-tree flag, input hashes and executable hash. A dirty
build is not represented as an exact build of the base commit. The application
executable itself is **unsigned**. `app/SOURCE-CHECKOUT` remains present so this
intermediate artifact cannot be mistaken for an approved production deployment.

WebView2 **SDK** libraries are not the WebView2 **Runtime** needed on the user's
computer. Runtime acquisition, installer integration, controlled process stop,
update/rollback, uninstall and clean-machine acceptance remain separate gates.
Only x64 is compiled here; ARM64 compatibility is not asserted.

## License evidence

The selected Node archive's complete LICENSE is preserved. This SDK version's
LICENSE contains Microsoft BSD three-clause redistribution conditions; its NOTICE
includes additional component notices. Both files are preserved verbatim. This
does not establish the terms for distributing the Evergreen Runtime or satisfy
the separate sharp/libvips corresponding-source and replacement review.

## Verification

`test/artifact-download.test.js` uses synthetic responses (no network) for cache,
origin, checksum, interruption, size, linked-path and concurrent download cases.
`npm.cmd run build:native` validates the full C# compilation against the pinned SDK.
Compilation is not an execution or end-to-end acceptance test.
