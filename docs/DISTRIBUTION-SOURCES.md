# Sources and licenses for the download

ClipBridge uses GPL-3.0-or-later and includes LGPL-covered native libraries.
Original third-party licenses and copyrights remain in `payload/licenses`
and the installed npm packages. In 1.2.2 the entire payload, including these
notices, is embedded in the standalone Setup EXE and installed unchanged.

## Matching source download

The standalone `ClipBridgeSetup.exe` (and optional convenience ZIP) is paired
with `ClipBridge-<version>-sources.zip`. Find its exact SHA-256 and application
commit in the embedded/installed `licenses/SOURCE-PACKAGE.json`.
The source ZIP contains:

- `application/`: the complete allowlisted source snapshot of that commit,
  including build scripts, lockfiles, tests, source guard and developer documents;
- `native/ClipBridge-sharp-0.35.5-sources.zip`: the original verified source
  archives, Cargo sources, recipe snapshots, patches and original notices;
- `native/inventory.json`, `evidence.json` and `NATIVE-NOTICES.txt`: matching
  inputs for the source-companion option in an owner rebuild;
- `source-delivery.json`: application file hashes, native bundle hash and identity.

Installation does not require opening the sources. For a library modification,
read `application/docs/NATIVE-REBUILD.md` and `application/docs/NATIVE-BUILD.md`.
Use the documented fresh-staging rebuild and manifest re-sealing path; installed
integrity checks deliberately reject an unrecorded DLL replacement. No publisher
signing key is needed for the documented owner-built package. Retain modified
corresponding sources when distributing a modified build.

## Distribution conditions

The EXE and source ZIP must be offered together at the same download location, with
equivalent access and no additional charge. Identify both filenames, hashes and
the exact source commit. The optional binary ZIP does not replace either of
these deliverables. Do not substitute a moving branch, upstream links,
expired CI artifacts or a different-version archive. A binary-only publication
is not authorized by this layout. Local review outputs are not source delivery.

GNU GPLv3 section 6(d) permits network delivery with equivalent access to
Corresponding Source. GNU LGPLv3 section 4(d)(0) requires corresponding library
and application materials suitable for recombination under the GPL source
delivery mechanism; GNU LGPLv2.1 section 6 requires the applicable library source
and relinking materials and allows equivalent download access for those materials.
This layout preserves the existing source/recombination route, rather than
removing required sources. Original native notices remain in both deliveries.

Primary license texts: [GPLv3](https://www.gnu.org/licenses/gpl-3.0.html),
[LGPLv3](https://www.gnu.org/licences/lgpl.html),
[LGPLv2.1](https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html).
This is a scoped engineering assessment, not a legal warranty. Actual publication
must recheck paired accessibility, applicable licenses and package integrity.
Clean Windows/iPhone acceptance remains unverified; this is experimental.
