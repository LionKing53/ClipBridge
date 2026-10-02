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
