# P2P filter lists and Pear Plugins — publishing and subscribing

## Live drives (published, pinned, fresh-peer verified 2026-07-16)

| Artifact | Drive key | Publisher storage (`03-sites/pearbrowser-publishers/`) |
|---|---|---|
| pear-default filter list | `842fb9e64c1c2092ec426151fd4f9ffb23a2efcae26ff3dd61d5d564ed58d99f` | `seed-pear-default-filters` |
| Pear Dark Reader plugin | `bbde8330169798dc5e0d08f8909b407cea2f8fec7e31d6241f479c714ad42082` | `seed-pear-dark-reader` |
| peerit Enhancer plugin | `1b21d8a6960bdcdfb76da94b80dae0d1a28247516de87e6839ea2f87bb609e10` | `seed-peerit-enhancer` |
| Pear Plugins catalogue | `01b7473601a6a6a58ec240b1c4ef0cdcf1aef0f6f8bf7ff16636faecb640ad13` | `seed-pear-plugins-catalog` |

Subscribe to the list: Settings → Content Shield → *Filter lists from the
swarm* → paste `842fb9e6…`. Load the catalogue: *Plugin catalog* → paste
`01b74736…`. (The builtin catalogue seed already carries the plugin keys, so
Install works out of the box; the catalogue drive is for distribution beyond
this build.) Each was published with `publish-and-pin.js`, durably
replicated with `reseed-drive.js --hold 90`, and confirmed with
`verify-pin.js` from a fresh peer.

Content Shield rules and Pear Plugins are distributed the same way as every
other PearBrowser artifact: as Hyperdrives, pinned on HiveRelay, synced
peer-to-peer. No CDN, no vendor list-fetch fingerprint, fully offline after
first sync.

## Filter lists

A filter-list drive contains:

```text
/filters.txt      the rules (Content Shield syntax subset)
/manifest.json    { name, version, filters, sha256, rules, builtAt }
```

Build (regenerates the manifest checksum) and publish:

```sh
node scripts/build-shield-list.mjs filter-lists/pear-default --name pear-default
node scripts/publish-and-pin.js filter-lists/pear-default --name pear-default-filters
```

Ship an update: edit `filters.txt`, rebuild with `--bump`, re-publish with the
original `--key` and `--storage`. Subscribed browsers verify the sha256 and
hot-swap on their next refresh sweep (every 30 minutes, or immediately via
**Refresh** in Settings → Content Shield).

Subscribe in the browser: Settings → Content Shield → *Filter lists from the
swarm* → paste the drive key. Rule text is persisted locally, so the list
keeps blocking with no network at all; the subscription metadata
(version/checksum) lives in user-data settings.

## Pear Plugins

A plugin drive is an ordinary drive with plugin metadata in `/manifest.json`
(see `examples/plugins/*`):

```json
{
  "name": "Pear Dark Reader",
  "version": "1.0.0",
  "pear": {
    "plugin": {
      "capabilities": ["pear.content.styles"],
      "content": {
        "styles":  { "matches": ["*"], "path": "/style.css" },
        "scripts": { "matches": ["<drive-key>"], "path": "/content.js" },
        "filters": "/filters.txt"
      }
    }
  }
}
```

`matches` entries are document hosts — for hyper:// pages that is the drive
key, so a plugin scoped to one app names that app's drive key; `"*"` matches
everywhere. Publish exactly like a list:

```sh
node scripts/publish-and-pin.js examples/plugins/dark-reader --name pear-dark-reader
node scripts/publish-and-pin.js examples/plugins/peerit-enhancer --name peerit-enhancer
```

Install in the browser: Settings → Content Shield → *Pear Plugins* → paste
the plugin drive key. The consent surface shows the capability list; the
grant is recorded at install time. **A drive update that requests new
capabilities is disabled automatically** and flagged for explicit
re-approval — swarm updates can never silently escalate a plugin's power.
Styles and scripts are injected hash-authorized through the CSP pipeline, so
the running bytes are provably the installed bytes.

## The plugin catalogue

Users shouldn't need drive keys. Settings → Content Shield → *Plugin
catalog* lists curated entries with one-click actions: **Install** for
plugin drives (runs the normal grant flow) and **Open** for `kind: "app"`
entries — AI add-on apps like **anonGPT**, which ships in the builtin seed
with its production drive key so anyone can add it on their own. The
catalogue is metadata only: it grants nothing, and app entries stay gated by
their own manifests (anonGPT's bridge still requires its privacy-claims
manifest check, on its drive only).

Catalogues are themselves P2P: any drive with a `/plugins.json` (see
`catalogues/pear-plugins/plugins.json`) can be loaded as an extra source
from the same Settings block, and subscribed sources persist offline.
Publish the curated catalogue:

```sh
node scripts/publish-and-pin.js catalogues/pear-plugins --name pear-plugins-catalog
```

The published example keys are already recorded in `plugins.json`. When an
example is replaced, publish the new drive, update its `driveKey`, and
re-publish the catalogue with the original catalogue key and publisher storage.
