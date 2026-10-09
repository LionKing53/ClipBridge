# ClipBridge naming and compatibility

ClipBridge is the same product name in Türkçe and English, starting with 1.2.1.
New clean installations use `ClipBridge.exe`, `ClipBridgeSetup.exe`, ClipBridge
shortcuts, `%LOCALAPPDATA%/Programs/ClipBridge` and `%LOCALAPPDATA%/ClipBridge`.
Runtime settings use `CLIPBRIDGE_*`. New LAN identities use
`clipbridge-<random-id>.local` and a **ClipBridge Local CA** certificate. API paths,
ports, access keys and user content do not change.

This is **not** an automatic migration. Fresh setup rejects both ClipBridge
program/data and old PanoKopru program/data/maintenance locks rather than
installing a second bridge with conflicting ports. Development contexts protect
both sets of personal paths. Existing installations need a separately reviewed,
data-preserving compatibility patch; never copy the new runtime over old data.

The owner's reviewed legacy patch updates visible titles, TR/EN catalogs, native
brand metadata and UI assets. It intentionally retains the old executable name,
installation/data folders, process synchronization identifiers, scheduled startup
and shortcut targets, local hostname, certificate identity and Windows rules.
Changing these silently could break iPhone Shortcuts, trusted certificates or
ownership checks. Existing certificate guides show the actual certificate subject,
which can still contain the former name. No re-pairing is required for this patch.

Compatibility references are intentional, not untranslated UI:

- Old `X-PanoKopru-Type` responses remain alongside `X-ClipBridge-Type`.
  Uploads accept both old and new filename headers.
- The new theme key reads the old key only when a new preference is absent.
- Public CA reads can fall back to the old filename only if the new file is absent;
  an unreadable/corrupt new file is not silently replaced.
- Firewall cleanup accepts exact matching old/new rule groups and names, still
  requiring the expected runtime executable. It does not remove broad prefixes.
- Old source paths and approved screenshots remain in historical audit lists.
  Git history and older package evidence are not rewritten.

The canonical checkout and the current GitHub URL may retain the old directory
or repository name. Remote repository renaming/publication belongs to the separate
publication conversation. The old 1.1.0 package is not a ClipBridge-branded release.
