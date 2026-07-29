# PearBrowser Desktop v0.8.0

PearBrowser v0.8.0 makes Pear v3 delivery a first-class, explicit catalogue
contract. Native apps are installed as verified OS packages through a
host-confirmed action; Hyper sites remain browsable peer-to-peer content.

## Highlights

- Submit a released Pear v3 app with its canonical root production link,
  version, exact installed product name, and platform targets.
- Upload a bounded PNG, JPEG, WebP, GIF, or safe SVG catalogue icon.
- Review one signed submission receipt instead of conflating native package
  distribution with Hyper content seeding.
- Bind approval to the exact reviewed receipt and, for Hyper sites, the exact
  reviewed content version.
- Install compatible native releases through the Pear v3 launcher with strict
  identity, target, destination, upgrade, and one-GUI-artifact checks.
- See Pear v3 listings on mobile as desktop-only metadata; mobile never opens
  them as web content.

The release also includes the embedded Pear v3 host migration, private-search
home, reconnect-safe renderer/backend RPC, Content Shield, Pear Plugins, local
Ask Browser/QVAC, federated search, naming, Nostr, and P2P publishing work that
landed after v0.7.1.

## Trust and distribution note

The GitHub native workflow currently produces package-proof assets with
SHA-256 sidecars. macOS Developer ID notarization and Windows public-trust
signing remain unavailable until production credentials are configured. The
retained PearBrowser upgrade identity remains a migration record until the
human-controlled Pear v3 provision/multisig release is independently verified.

## Verification

- Desktop: 700/700 tests.
- Mobile: 566/566 tests.
- iOS: unsigned generic-device build succeeded.
- Android: debug Kotlin compilation succeeded.
