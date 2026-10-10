# Third-party notices and distribution review

## Current engineering review — 2026-10-10

The Windows x64 libvips 8.18.7 source rebuild completed in the pinned MXE
environment. Its DLL SHA-256 matches the original npm DLL byte for byte:
`06dab07cc386748513337a31672b1d5269fbc770a14ff403080575665bf0813f`.
The separate Windows job tested this DLL with the original sharp 0.35.5 C++
wrapper/addon, five image paths, fresh package sealing and setup compilation.
This verifies this DLL rebuild, not every toolchain binary or device acceptance.

The experimental distribution must include the matching native source companion,
original notices, application source and the Rust root notice supplement below.
Use cairo's LGPL-2.1 alternative; preserve original license texts and the recipient
rebuild/recombination instructions. The current review found no remaining blocker
in these native source/notices/replacement provisions. This is an engineering
review with the stated scope, not a legal warranty or a stable-release claim.
Final package privacy/integrity review and owner publication approval are separate.

Earlier review records below retain the status they had at the time.

## Runtime source coverage follow-up — 2026-10-10

The pinned MXE recipes also use LLVM 23.1.2 runtimes and MinGW-w64 57b5950;
these are outside the 28-entry library-version table. The updated companion
contains those two checksum-verified archives and seven additional original
runtime license texts (749 collected texts in total). Full source archives retain
all embedded notices, including files outside the separately collected subset.
LLVM uses Apache-2.0 with LLVM exceptions; MinGW's original notices are preserved.
This does not claim that every collected source or notice is linked.

The original handed-off `c3a269f` binary ZIP is unchanged and lacks this follow-up.
Any publication candidate must use the updated source companion. Actual source
rebuild/Windows ABI verification is running separately in GitHub Actions; it is
not yet recorded as passed and binary publication is not approved.

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

## Rust standard-library source notices — 2026-10-10

The pinned MXE Rust recipe uses the 2026-09-24 nightly sources. The
verified source archive SHA-256 is
`f2c139528ba025f1141935df4f634e18db614b9b3b1cf2ea59e3675a6ade89f3`.
Source: https://static.rust-lang.org/dist/2026-09-24/rustc-nightly-src.tar.xz

The original root COPYRIGHT and license texts are preserved below. Rust
standard-library portions with the Apache-2.0/MIT choice are supplied under
the Apache-2.0 option here; both original license texts remain available.
This does not relicense other dependencies or assert every toolchain component
is linked. Exact recipes and separate native source notices remain applicable.
The full compiler source archive is a verified review input, not added to the
installer; this is a notice supplement, not an offline compiler-source claim.

### Original Rust COPYRIGHT

```text
Short version for non-lawyers:

The Rust Project is dual-licensed under Apache 2.0 and MIT
terms.

It is Copyright (c) The Rust Project Contributors.

Longer version:

Copyrights in the Rust project are retained by their contributors. No
copyright assignment is required to contribute to the Rust project.

Some files include explicit copyright notices and/or license notices.
For full authorship information, see the version control history or
<https://thanks.rust-lang.org>

Except as otherwise noted, Rust is licensed under the Apache License, Version
2.0 <LICENSE-APACHE> or <http://www.apache.org/licenses/LICENSE-2.0> or the MIT
license <LICENSE-MIT> or <http://opensource.org/licenses/MIT>, at your option.

We track licenses for third-party materials in two ways:

* We use [REUSE](https://reuse.software) to track license information for
  in-tree source files - both those authored by the Rust project and those
  authored by third parties. See `REUSE.toml`, and our cached output of the
  `reuse` tool which is committed to `license-metadata.json`.
* We use `cargo` to track license information for out-of-tree dependencies.

These two sources of information are collected by the tool `generate-copyright`
into a file called `COPYRIGHT.html`, which is shipped with each binary release
of Rust. Please refer to that file for detailed information as to the components of
any given Rust release. We also produce a `COPYRIGHT-library.html` file which only
covers the subset of source code used in the Rust Standard Library, as opposed
to the toolchain as a whole.
```

### Original Rust LICENSE-MIT

```text
Copyright (c) The Rust Project Contributors

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

### Original Rust LICENSE-APACHE

```text
                              Apache License
                        Version 2.0, January 2004
                     http://www.apache.org/licenses/

TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

1. Definitions.

   "License" shall mean the terms and conditions for use, reproduction,
   and distribution as defined by Sections 1 through 9 of this document.

   "Licensor" shall mean the copyright owner or entity authorized by
   the copyright owner that is granting the License.

   "Legal Entity" shall mean the union of the acting entity and all
   other entities that control, are controlled by, or are under common
   control with that entity. For the purposes of this definition,
   "control" means (i) the power, direct or indirect, to cause the
   direction or management of such entity, whether by contract or
   otherwise, or (ii) ownership of fifty percent (50%) or more of the
   outstanding shares, or (iii) beneficial ownership of such entity.

   "You" (or "Your") shall mean an individual or Legal Entity
   exercising permissions granted by this License.

   "Source" form shall mean the preferred form for making modifications,
   including but not limited to software source code, documentation
   source, and configuration files.

   "Object" form shall mean any form resulting from mechanical
   transformation or translation of a Source form, including but
   not limited to compiled object code, generated documentation,
   and conversions to other media types.

   "Work" shall mean the work of authorship, whether in Source or
   Object form, made available under the License, as indicated by a
   copyright notice that is included in or attached to the work
   (an example is provided in the Appendix below).

   "Derivative Works" shall mean any work, whether in Source or Object
   form, that is based on (or derived from) the Work and for which the
   editorial revisions, annotations, elaborations, or other modifications
   represent, as a whole, an original work of authorship. For the purposes
   of this License, Derivative Works shall not include works that remain
   separable from, or merely link (or bind by name) to the interfaces of,
   the Work and Derivative Works thereof.

   "Contribution" shall mean any work of authorship, including
   the original version of the Work and any modifications or additions
   to that Work or Derivative Works thereof, that is intentionally
   submitted to Licensor for inclusion in the Work by the copyright owner
   or by an individual or Legal Entity authorized to submit on behalf of
   the copyright owner. For the purposes of this definition, "submitted"
   means any form of electronic, verbal, or written communication sent
   to the Licensor or its representatives, including but not limited to
   communication on electronic mailing lists, source code control systems,
   and issue tracking systems that are managed by, or on behalf of, the
   Licensor for the purpose of discussing and improving the Work, but
   excluding communication that is conspicuously marked or otherwise
   designated in writing by the copyright owner as "Not a Contribution."

   "Contributor" shall mean Licensor and any individual or Legal Entity
   on behalf of whom a Contribution has been received by Licensor and
   subsequently incorporated within the Work.

2. Grant of Copyright License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   copyright license to reproduce, prepare Derivative Works of,
   publicly display, publicly perform, sublicense, and distribute the
   Work and such Derivative Works in Source or Object form.

3. Grant of Patent License. Subject to the terms and conditions of
   this License, each Contributor hereby grants to You a perpetual,
   worldwide, non-exclusive, no-charge, royalty-free, irrevocable
   (except as stated in this section) patent license to make, have made,
   use, offer to sell, sell, import, and otherwise transfer the Work,
   where such license applies only to those patent claims licensable
   by such Contributor that are necessarily infringed by their
   Contribution(s) alone or by combination of their Contribution(s)
   with the Work to which such Contribution(s) was submitted. If You
   institute patent litigation against any entity (including a
   cross-claim or counterclaim in a lawsuit) alleging that the Work
   or a Contribution incorporated within the Work constitutes direct
   or contributory patent infringement, then any patent licenses
   granted to You under this License for that Work shall terminate
   as of the date such litigation is filed.

4. Redistribution. You may reproduce and distribute copies of the
   Work or Derivative Works thereof in any medium, with or without
   modifications, and in Source or Object form, provided that You
   meet the following conditions:

   (a) You must give any other recipients of the Work or
       Derivative Works a copy of this License; and

   (b) You must cause any modified files to carry prominent notices
       stating that You changed the files; and

   (c) You must retain, in the Source form of any Derivative Works
       that You distribute, all copyright, patent, trademark, and
       attribution notices from the Source form of the Work,
       excluding those notices that do not pertain to any part of
       the Derivative Works; and

   (d) If the Work includes a "NOTICE" text file as part of its
       distribution, then any Derivative Works that You distribute must
       include a readable copy of the attribution notices contained
       within such NOTICE file, excluding those notices that do not
       pertain to any part of the Derivative Works, in at least one
       of the following places: within a NOTICE text file distributed
       as part of the Derivative Works; within the Source form or
       documentation, if provided along with the Derivative Works; or,
       within a display generated by the Derivative Works, if and
       wherever such third-party notices normally appear. The contents
       of the NOTICE file are for informational purposes only and
       do not modify the License. You may add Your own attribution
       notices within Derivative Works that You distribute, alongside
       or as an addendum to the NOTICE text from the Work, provided
       that such additional attribution notices cannot be construed
       as modifying the License.

   You may add Your own copyright statement to Your modifications and
   may provide additional or different license terms and conditions
   for use, reproduction, or distribution of Your modifications, or
   for any such Derivative Works as a whole, provided Your use,
   reproduction, and distribution of the Work otherwise complies with
   the conditions stated in this License.

5. Submission of Contributions. Unless You explicitly state otherwise,
   any Contribution intentionally submitted for inclusion in the Work
   by You to the Licensor shall be under the terms and conditions of
   this License, without any additional terms or conditions.
   Notwithstanding the above, nothing herein shall supersede or modify
   the terms of any separate license agreement you may have executed
   with Licensor regarding such Contributions.

6. Trademarks. This License does not grant permission to use the trade
   names, trademarks, service marks, or product names of the Licensor,
   except as required for reasonable and customary use in describing the
   origin of the Work and reproducing the content of the NOTICE file.

7. Disclaimer of Warranty. Unless required by applicable law or
   agreed to in writing, Licensor provides the Work (and each
   Contributor provides its Contributions) on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
   implied, including, without limitation, any warranties or conditions
   of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
   PARTICULAR PURPOSE. You are solely responsible for determining the
   appropriateness of using or redistributing the Work and assume any
   risks associated with Your exercise of permissions under this License.

8. Limitation of Liability. In no event and under no legal theory,
   whether in tort (including negligence), contract, or otherwise,
   unless required by applicable law (such as deliberate and grossly
   negligent acts) or agreed to in writing, shall any Contributor be
   liable to You for damages, including any direct, indirect, special,
   incidental, or consequential damages of any character arising as a
   result of this License or out of the use or inability to use the
   Work (including but not limited to damages for loss of goodwill,
   work stoppage, computer failure or malfunction, or any and all
   other commercial damages or losses), even if such Contributor
   has been advised of the possibility of such damages.

9. Accepting Warranty or Additional Liability. While redistributing
   the Work or Derivative Works thereof, You may choose to offer,
   and charge a fee for, acceptance of support, warranty, indemnity,
   or other liability obligations and/or rights consistent with this
   License. However, in accepting such obligations, You may act only
   on Your own behalf and on Your sole responsibility, not on behalf
   of any other Contributor, and only if You agree to indemnify,
   defend, and hold each Contributor harmless for any liability
   incurred by, or claims asserted against, such Contributor by reason
   of your accepting any such warranty or additional liability.

END OF TERMS AND CONDITIONS
```
