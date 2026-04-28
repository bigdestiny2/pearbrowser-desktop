# echo-peer — `swarm.v1` smoke test

A 100-line `hyper://` page that exercises every primitive in
`window.pear.swarm.v1`:

- joins a **Tier A** drive-derived topic (no consent prompt)
- handles `peer`, `peer-leave`, `message`, `error`, `closed` events
- sends bytes (`Uint8Array`) on first peer connect
- echoes any inbound message back as `"re: <orig>"`
- broadcasts `"ping <ts>"` from a button click
- tears down with `channel.destroy()`

## Running it

You need PearBrowser Desktop **v0.3.0 or later** — older builds don't
expose `window.pear.swarm.v1`. The page itself works in any environment;
it just feature-detects and disables the buttons if the API isn't there.

### Quick local test (one device)

```sh
# In one terminal: serve this directory as a tiny static drive.
# (Any tool that mints a Hyperdrive from a filesystem folder works —
# the desktop's own "P2P Sites" tab is the easiest.)
```

Then in **PearBrowser Desktop**, paste the resulting `hyper://...` URL
into the address bar. Open the page in **two tabs** (`⌘T`) and watch
them discover each other on the DHT and exchange messages.

### Two-device test

Publish the drive, copy the `hyper://...` URL, and open it on two
machines on different networks. The DHT will route them to each other
within a few seconds. Messages travel **directly peer-to-peer** — they
do not pass through the relay or the localhost proxy. You'll see this
in the page's log as it fires `← <peerId>: hello from echo-peer (...)`
and your reply lands as `→ broadcast "ping ..."`.

## Why Tier A

The page uses:

```js
await window.pear.swarm.v1.join(null, {
  subtopic: 'echo-peer/v1',
  ...
})
```

Passing `subtopic` (with `topicHex: null`) tells the worklet to derive
the topic as `sha256("pear.swarm.v1:" + driveKey + "echo-peer/v1")`.
That topic is provably scoped to whatever drive served this page, so
PearBrowser doesn't need to ask the user for consent — only pages
served from this drive can address that namespace.

For arbitrary 32-byte topics (Tier C), the user would see a consent
sheet on the first join. Subsequent joins of the same topic for the
same app reuse the persisted grant.

## Files

- `index.html` — the page itself, top-to-bottom standalone.
- `README.md` — this file.
