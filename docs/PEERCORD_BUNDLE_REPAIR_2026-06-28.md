# Peercord Bundle Repair Note - 2026-06-28

This note captures the current Peercord bundle availability investigation for
the PearBrowser release gate.

## Summary

Peercord's catalogue row is still correct, but the public Pear bundle is not
currently available from a fresh peer.

- Catalogue link: `pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy`
- Decoded public key: `a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26`
- Latest source commit checked: `ea260a3bfba279769acfbfe0a436140c87a0fa15`
- Source URL: `https://git.churchofmalware.org/mastercodeon/Peercord`
- Source package version: `1.0.8`

The current public-key verifier still fails the release gate:

```sh
node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90
```

The 2026-06-28 fresh-peer runs timed out or resolved an empty checkout with no
file entries. The earlier 2026-06-23 proof with 14,730 entries is therefore
historical evidence only.

## Source Audit

The upstream source is reachable and matches PearBrowser's launch contract:

- `Peercord Source/pear.json` declares `type: "desktop"` and `main: "index.js"`.
- `Peercord Source/index.js` constructs an Electron `BrowserWindow`.
- No `Pear.worker.pipe` or pear-request worker entry point is published.
- `Peercord Source/package.json` keeps the same `upgrade` link and release
  scripts for the decoded `a2ea4d...` public key.

This means Peercord should remain `standalone`/window-only in PearBrowser until
upstream publishes a compatible worker/headless entry point.

## Why PearBrowser Cannot Repair This Locally

The upstream release scripts target the canonical Peercord key:

```sh
pear stage pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy out/build
pear seed pear://wmir47w7mai3b1skj66mx7fzso6k6o91kipaney7gtt69npimouy
```

Running those from the PearBrowser release environment is not a safe repair
path. Staging/seeding the canonical Pear link requires the publisher's writable
Pear state or equivalent authority. The source also contains placeholder admin
update signing material (`[PLACE_HOLDER]`), so a local rebuild cannot honestly
stand in for the publisher's release.

Do not run Peercord's `pear:stage`, `pear:seed`, or `release:*` scripts from the
PearBrowser release machine unless the Peercord publisher explicitly provides
release authority and asks us to operate that key.

## Required Remediation

One of these must happen before Peercord bundle availability can return to
`PASS`:

- The Peercord publisher re-stages and seeds the canonical `pear://wmir47...`
  release from a complete build.
- The Peercord publisher/operator provides the complete publisher storage or an
  equivalent full-content bundle source for the existing key.
- Relay/operator cleanup removes the empty checkout, and a complete canonical
  seed is accepted by the relay fleet.

After remediation, rerun:

```sh
node scripts/verify-app-full.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord --samples 12 --timeout 90
node scripts/verify-pear-bundle-contract.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord-linux --app-root by-arch/linux-x64/app/peercord/resources/app --expect-type desktop --expect-main index.js --contains index.js:BrowserWindow --absent index.js:Pear.worker.pipe
node scripts/verify-pear-bundle-contract.js --key a2ea4d769d5e2b90caca4fbcb7f4b7b43caf43f2555b81201d3463ef89b55c26 --name peercord-windows --app-root by-arch/win32-x64/app/peercord/resources/app --expect-type desktop --expect-main index.js --contains index.js:BrowserWindow --absent index.js:Pear.worker.pipe
```

Only mark the Peercord bundle rows `PASS` when the fresh-peer full-bundle
sampler returns file entries and zero missing sampled blobs.
