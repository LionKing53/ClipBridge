# Native source delivery and owner rebuild — sharp 0.35.5 / libvips 8.18.7

This document describes engineering provisions, not a legal warranty. Full
cross-compilation has not been performed on this host: Linux/OCI build tools
are absent. The owner assigned this validation to a separate environment on
2026-10-08. Do not label that test passed. Upstream sources are unmodified;
upstream build patches are preserved separately in their recipe snapshots.

## Source delivery

`native-sources-lock.json` pins the 28 native source archives by the SHA-256
values in the exact libvips Windows/MXE recipes, not by guessed download hashes.
Fontconfig uses MXE's mirror with the same upstream checksum. Mozjpeg uses the
exact upstream commit tarball, not an archive with different generated paths.
`scripts/fetch-native-sources.js` retrieves and verifies those files. With
`--crates` it reads the verified librsvg Cargo.lock and retrieves all registry
crate archives by their lock checksums (a superset including tests/platforms and
crates removed by upstream patches). No upstream code is executed or extracted.

Recipe snapshots retain patches, build flags and licenses at these commits:

- build-win64-mxe: `ef19ca09af2453d127453d677c849ccb37cf5694`
- MXE llvm-mingw: `c36160b231e66e1cbe032ed54aef7617e8b259da`
- sharp: `51a990faa26ade5586a4934ac9673c98d8893326`
- sharp-libvips: `ebb95f8add54eee8bed840e3fb587e4cbec857d7`

The source companion ZIP contains the archives, recipe snapshots, inventory,
checksums and collected original license/copyright texts (including a superset
of test/optional components, not a statement all of them are linked). Publish
the verified companion **alongside** the matching binary, with equal access,
not merely a link to the upstream project. Do not substitute old 8.18.6 sources.
The application source snapshot is separately included in the binary payload.

To recreate the companion, clone the four public repositories above into
`build/native-source-review-8.18.7`, `build/native-mxe-review-20260924`,
`build/sharp-source-review-0.35.5` and `build/sharp-libvips-source-review-1.3.4`
respectively (vips, MXE, sharp, sharp-libvips); check out their exact pinned
commits and keep those worktrees clean. Then run:

```powershell
node scripts/fetch-native-sources.js
node scripts/fetch-native-sources.js --crates
node scripts/bundle-native-sources.js
npm.cmd run build:test-package -- --native-source-directory build/native-sources-<reported-id>
```

The last option includes the companion ZIP and native notices inside the sealed
payload. Its hashes and source/recipe inventory are checked before copying.
If combined with a library override, the original source bundle is not claimed
to cover the user's modified libraries; supply their modified sources as well.

## Rebuild the upstream library on a separate Linux/OCI build machine

Extract the recipe snapshots into separate directories. Read their README,
Dockerfiles and scripts before running. `build.sh` requires Docker or Podman.
Use the `vips-web` **x86_64-w64-mingw32.static** build (libvips itself remains a
DLL, while dependencies are statically linked inside it). Do not substitute
`vips-all`, HEVC, FFI-compat or another architecture.

The upstream starting command is:

```sh
./build.sh --without-prebuilt --target x86_64-w64-mingw32.static vips-web
```

Use the bundled MXE commit in place of the branch clone in the base Dockerfile;
review changes explicitly. The original base image and system packages are not
pinned by upstream, so this is not a claim of bit-for-bit reproducibility or an
offline compiler toolchain. Seed MXE's download cache with the bundled sources
using the filenames expected by each recipe. The Rust crate collection can seed
Cargo's registry cache; preserve Cargo.lock checksums and the bundled upstream
patches. No system/container installation is performed automatically by ClipBridge.

The sharp-libvips `build/win.sh` snapshot documents packaging the Windows library
headers/import libraries/DLLs. The sharp snapshot's `.github/workflows/ci.yml`,
`src/binding.gyp`, `install/build.js` and `npm/from-local-build.js` contain the
addon build/packaging steps. Windows C++/Python/node-gyp prerequisites are needed
when rebuilding the `.node` addon. For ABI-compatible changes to libvips, retain
the addon and replace only the DLLs. For ABI changes, rebuild the addon too.
Compatibility must be tested with the resulting binaries; PE checks alone do
not establish working image decoding.

## Recombine with ClipBridge without disabling integrity checks

Recipients may modify/rebuild the application and its libraries under their
licenses, including debugging such changes. No publisher signing key, private
token or original developer account is needed to make a new package.

In a clean committed ClipBridge source checkout, place your rebuilt x64 files in
a separate directory containing only one or more of:

- `libvips-42.dll`
- `libvips-cpp-8.18.7.dll`
- `sharp-win32-x64-0.35.5.node`

Then run:

```powershell
npm.cmd ci --ignore-scripts --no-audit --no-fund
npm.cmd run build:test-package -- --native-library-directory C:\RebuiltLibraries
npm.cmd run build:setup -- build/candidate-<reported-id>
npm.cmd run package:test -- build/candidate-<reported-id>
```

The explicit option replaces only these files **in the fresh staging payload**,
records original/replacement hashes and marks compatibility untested. The package
and its Setup are sealed using the new hashes. Installed-file checking stays on;
the option does not edit an existing installation, receipt, user data or firewall.
Use a clean account/VM for installation; v1.1.0 does not support upgrading an
existing installation or adopting preserved data. The replaced artifacts and
their modified corresponding sources must accompany any further redistribution.
Do not present a modified build as the original project's verified artifact.

## Validation boundary

### 2026-10-10 review for ClipBridge 1.2.1

The locked Windows package's `versions.json` identifies 28 native components.
The source lock covers these exact versions (archive/exif/ffi/heif/imagequant/
png/rsvg/uhdr/webp/xml2 map to the corresponding source-package names).
`libnsgif`, mentioned in the generic npm README, is included in the libvips
source tree rather than being a separate entry in this Windows versions list.
The `vips-web.mk` recipe generates that list; `vips.mk` explicitly builds libvips
as a DLL even for the static-dependencies target. This is source/version coverage,
not proof of an actual relink or complete linked binary provenance.

The reviewed license route is corresponding-source delivery and recipient
recombination, not a claim that installed integrity checks permit arbitrary DLL
replacement. See [LGPLv3 section 4](https://www.gnu.org/licences/lgpl.html).
Application sources, build utilities and pinned lockfiles are supplied in
`payload/source`; the native companion supplies source archives and upstream
patch/recipe snapshots. Original copyrights/license texts are retained in
`review/NATIVE-NOTICES.txt` and the companion. Node and WebView2 SDK notices are
included separately. WebView2 Evergreen Runtime is not bundled.

Before binary publication, an external build reviewer must produce the pinned
Windows x64 vips-web libraries, record compiler/container versions and recipe
adaptations, then exercise fresh-stage replacement, rebuild Setup and verify
image decoding with those rebuilt libraries. `SOURCE_DATE_EPOCH` depends on Git
metadata omitted by `git archive`; use pinned checkouts or explicitly record
the snapshot adaptation. Do not run `sharp-libvips/build/win.sh` unchanged as
evidence of rebuilding: it downloads prebuilt binaries and a moving `main`
notice file. Package the locally rebuilt libraries and pinned notices instead.

No OCI runtime or installed WSL environment is available on this host. Actual
native cross-compilation and rebuilt-library ABI checks remain unperformed.
Synthetic replacement tests and working original npm binaries cannot close that
review. No legal warranty or unconditional binary-publication approval is given.

Automated tests cover checksum enforcement, fresh-stage-only replacement, x64
library shape, manifest re-sealing and rejection of unlisted/tampered paths.
These are not successful native cross-compilation or clean-device acceptance.
Keep the source companion review open if any source/notice/linked-component
coverage or build/recombination requirement has not actually been checked.

Primary references: https://github.com/libvips/build-win64-mxe/tree/v8.18.7,
https://github.com/lovell/sharp/tree/v0.35.5,
https://github.com/lovell/sharp-libvips/tree/v1.3.4.
