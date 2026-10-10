# Third-party review status — not final distribution notices

## ClipBridge 1.2.1 review — 2026-10-10

Exact-version Windows native source coverage, preserved recipe patches and full
source-companion notices are reviewed again for the current package. The original
28-component Windows versions list maps to the 28 pinned native source archives;
357 Cargo archives and four pinned recipe/source snapshots accompany them.
License evidence includes the BSD-licensed libimagequant 2.4.1 fork, LGPL components,
cairo's upstream MPL alternative, MIT/BSD/font/image/patent notices and the actual
Node/WebView2 SDK notices. Generic package metadata alone is not the conclusion.
The companion's 742 collected original texts intentionally include a source
superset; they are not a claim of 742 linked libraries.

The engineering review of recipient recombination is documented in
`docs/NATIVE-REBUILD.md`, including the upstream Git-metadata assumption and the
sharp-libvips script's prebuilt-download behavior. Fresh-staging replacement and
manifest re-sealing have synthetic tests; a real rebuilt-library run has not
occurred. **Binary distribution review remains open**, including actual rebuild/
compatibility and linked-component/source completeness validation. Experimental
release labeling does not resolve it. No personal installation is a build input.

## Native source delivery implemented — 2026-10-08

The earlier missing-source and missing-recombination provisions now have concrete
implementations: `native-sources-lock.json`, `fetch-native-sources.js`,
`bundle-native-sources.js`, and the explicit `--native-library-directory` build
option. 28 native archives and 357 Rust archives were downloaded and verified
against upstream recipe/Cargo checksums. Four pinned recipe/source snapshots
preserve build flags and patches. 742 original license/copyright/author files
were collected, including the full LGPL/GPL texts supplied by libheif. The
collection includes unused/test/platform sources and is not a linked-only SBOM.

The source companion and collected notices can be included in the sealed binary
payload with `--native-source-directory`. Changed libraries are re-sealed into a
new owner-built installer, with their hashes and untested compatibility recorded;
there is no publisher key restriction and installed-file integrity stays on.
Details and exact commits: `docs/NATIVE-REBUILD.md`. Modified builds must include
their modified corresponding sources, not rely on the original companion alone.

The owner explicitly moved actual native rebuild verification to another
environment. That check remains **unperformed**, not implicitly passed by source
collection. In particular, the source recipes retain upstream compiler/base-image
requirements; byte-identical reproduction, full linked-component coverage and
native ABI compatibility are not asserted without that review. The historical
checklist below records why this work was required, not missing implementations
that should be repeated. Public approval still requires the separate review.

## 1.1.0 package review — 2026-10-08

The private acceptance payload now collects the exact Windows sharp README
license table and versions.json as well as LICENSE/NOTICE files. The locked
version is sharp/@img/sharp-win32-x64 0.35.5, with libvips 8.18.7 and librsvg
2.63.2. Previous 0.35.4/8.18.6 inventories are not evidence for this payload.

Still open before public binary distribution:

- Obtain and identify the matching native-library sources, build recipes and
  patches (including dependencies statically included in the libvips DLLs),
  and prepare a verified source-delivery mechanism alongside the binary.
- Include the applicable complete native dependency license/copyright texts;
  an upstream README table and npm metadata are not the complete notice bundle.
- Review the actual library replacement/rebuild route: installed-payload hash
  checks currently reject changed DLLs. Do not claim users can simply replace
  a library in the installed directory. The corresponding source/rebuild route
  and any applicable installation information must be verified first.
- Check the precise license alternatives of the native build, not the unrelated
  libvips-all distribution. Do not substitute a generic LGPL statement for review.

Primary inventory/build evidence:
https://github.com/libvips/build-win64-mxe/tree/v8.18.7
and the exact locked npm artifact's README.md/versions.json. The first source
contains version-specific build inputs; it is not itself proof that we supplied
all corresponding sources. No legal-compliance or public-distribution clearance
is asserted by the current package. Device-test deferral does not waive these items.

This source tree does not contain a bundled Node runtime, WebView2 SDK/runtime,
or installed native libraries. Dependency code is restored from the reviewed
lock with `npm ci --ignore-scripts`. No installed personal application is used
as a packaging input.

Run `npm run report:dependencies` after a clean dependency install. It writes
ignored `build/dependency-review/` files: a lockfile inventory, a CycloneDX 1.6
component inventory, and collected LICENSE/NOTICE/COPYING texts with evidence
hashes in the inventory. This includes development and optional platform entries;
it is **not** the final Windows binary SBOM. No automatic legal approval occurs.

Review checklist:

| Component | Current review requirement |
| --- | --- |
| archiver, mime-types, multicast-dns, qrcode, png-to-ico | Preserve MIT notices from the actual distributed versions |
| busboy, streamsearch | Inspect actual LICENSE text even if package metadata omits the license field |
| sharp, Playwright | Preserve Apache-2.0 text and applicable notices; Playwright is development-only |
| Windows sharp/libvips native packages | LGPL-3.0-or-later components require separate packaging, corresponding-source and replacement/relinking review |
| Node runtime and embedded components | Pin an official runtime artifact, verify its published integrity, include its complete notices |
| WebView2 SDK/runtime | Review Microsoft's redistribution terms; retain SDK LICENSE/NOTICE; document runtime distribution mode |

The project's own GPL-3.0-or-later license, selected by the owner on 2026-10-03,
does not replace any of these obligations. Binary distribution compatibility (particularly native
and Microsoft components) must be evaluated before licensing/releasing a bundle.
There is no approved downloadable installer in this repository yet.

## Native build evidence, 2026-10-03

The separate ignored compile-only output now contains officially downloaded,
pinned Node 24.15.0 win-x64 and WebView2 SDK 1.0.4258.31 selected files. Node's
complete LICENSE and SDK LICENSE/NOTICE are retained. This SDK LICENSE uses
Microsoft BSD three-clause conditions; the NOTICE includes ANTLR/StringTemplate
component notices. No WebView2 Runtime installer is bundled by this workflow.
See `toolchain-lock.json` and `docs/NATIVE-BUILD.md`. The source-lock inventory
above remains distinct from a final binary-distribution SBOM.
