# PearBrowser Desktop v0.9.1

Corrective release for v0.9.0. Two user-facing defects survived the nonvisual
release gates and were caught by post-release visual QA of the shipped
package; both are fixed here, each with a regression test.

## Fixed

- **Blank window under the embedded Electron host.** index.html loaded the
  React shell through bare module specifiers, which cannot resolve over
  `file://`. The shell is now a committed esbuild bundle
  (`ui/dist/main.bundle.js`, rebuilt via `npm run build:ui`) that renders
  identically under every host, and a guard test pins index.html to it.
- **Boot race in the renderer.** The 9876–9880 backend port scan ran a single
  pass while the Bare worker was still binding its WS server, so healthy
  installs could show "Boot failed — reinstall the verified signed native
  package". The scan now retries under a 25-second deadline.
- **Settings relay capability checks.** Every https gateway check failed with
  `transport.get is not a function` — `bare-https@2` exports `request()`
  only. Relay GETs now use `request()+end()`, verified live against the US
  gateway's signed `/.well-known/hiverelay.json`.

## Known infrastructure note (not a code defect)

`relay-sg.p2phiverelay.xyz` and `relay-eu.p2phiverelay.xyz` currently have no
DNS records, so their capability rows report a resolution failure even after
this fix. Hybrid fetch falls back to pure P2P by design; restoring those
gateway records is a fleet/DNS operation outside this release.

## Verification

- Full suite: 931/931 (includes the ui-bundle and relay-transport guards).
- Shell renders and connects under the embedded host
  (`[rpc] connected on :9876`); runtime smoke passes against the running app.
- Live capability round-trip against `relay-us.p2phiverelay.xyz` returns the
  signed capability document.
- All v0.9.0 verification (wallet ceremony/isolate/EVM smokes, QVAC native
  smoke, WDK cohort/network gates, release story smoke with 10 evidence rows)
  applies unchanged to this code line.
