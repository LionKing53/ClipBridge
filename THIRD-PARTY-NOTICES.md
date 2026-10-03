# Third-party review status — not final distribution notices

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
