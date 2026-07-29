# Community catalogue submission and review

PearBrowser separates four concerns that must not be collapsed into one button:

1. an author releases and distributes an app;
2. the author submits a bounded catalogue receipt;
3. an operator reviews and approves that receipt;
4. a secret-holding publisher writes approved metadata to the Community catalogue.

A relay approval only allows the receipt drive to be replicated. It does not
endorse an app, pin a native release, or publish the shared catalogue entry.

## Pear v3 native apps

Pear v3 applications are released through Pear's deployment pipeline, not by
uploading executable bytes to PearBrowser or HiveRelay:

1. mint and seed the release lines with `pear touch` / `pear seed`;
2. set the package `upgrade` identity;
3. build platform artifacts and assemble the deployment with `pear build`;
4. dry-run and apply `pear stage`;
5. move the staged version to a provision line and, for production, gate it
   through multisig;
6. keep the stable root production link seeded.

The catalogue form accepts only a canonical root
`pear://<52-character-key>` identity. Versioned stage links, paths, query
strings, and fragments are rejected. Authors must state the package version,
the exact installed product name, and every OS/architecture target included in
the release. The resulting catalogue entry uses:

```json
{
  "type": "standalone",
  "nativeDelivery": {
    "status": "available",
    "kind": "pear-v3",
    "installLink": "pear://<52-character-production-key>",
    "productName": "Example App",
    "targets": ["darwin-arm64", "linux-x64", "win32-x64"]
  }
}
```

PearBrowser never runs a submitted link during review. When a user later
chooses **Install app**, the existing `pear-install` boundary verifies the
requested release identity, exact product name, platform target, one GUI
artifact, and normal OS destination before recording the installation.

## Browsable Hyper content

A Hyper submission references a separately published and seeded drive. Its
root `/index.html` must be available to a cold reader. The catalogue receipt
does not automatically pin the target drive and does not turn Hyper content
into a native application.

## Receipt lifecycle

1. The author selects **Pear v3 app** or **Hyper site**, enters bounded
   catalogue metadata, and optionally uploads a small image icon.
2. PearBrowser validates the target and publishes one receipt drive containing
   `/manifest.json`.
3. A signed HiveRelay seed request places that receipt drive in a relay's
   authenticated `review` queue.
4. The operator loads the queue and fetches the receipt. Hyper reviews also
   fetch the separately declared target drive and inspect `/index.html`.
5. The operator records a note and either approves receipt replication or
   rejects the request with a reason.
6. Approved metadata is published through the separate secret-holding
   Community catalogue release process and verified from a fresh reader.

Using the receipt as the single queue item avoids the former double-queue bug:
the old flow seeded a metadata drive and the app drive independently, while the
moderator only knew the app key and therefore could not reliably retrieve the
form metadata.

## Automated due diligence

All reviews verify a canonical receipt key, relay-visible publisher key,
bounded receipt manifest, supported receipt version, duplicate target state,
and queue freshness.

Hyper reviews additionally verify the declared target key, target replication
version, bounded root `/index.html`, and high-signal page behavior. Pear v3
reviews validate the canonical production identity, package version, exact
product name, supported target list, and publisher release attestation. Native
package availability and provenance remain explicit human-review items because
catalogue review must not install or execute third-party code.

An icon is presentation metadata only. Uploads are capped to the shared
catalogue limit and restricted to PNG, JPEG, WebP, GIF, or passive SVG bytes.
They never affect trust or launch decisions.

## Decision records

Approval fails closed when evidence changes, any blocker remains, the review
queue is stale or not in `review` mode, the human acknowledgement is missing,
or no reviewer note is recorded. Evidence binds approval to both the receipt
drive version and, for Hyper submissions, the target drive version.

Approvals and rejections are written to a bounded local audit trail containing
the receipt key, publisher key, action, note or rejection reason, decision
time, and check counts. Operator credentials are never copied into audit data.

## Operator checklist

- Confirm the relay reports `review` mode.
- Refresh and run due diligence immediately before the decision.
- For a Hyper site, open the target preview and investigate warnings.
- For a Pear v3 app, independently verify publisher provenance, `pear info`,
  production seeding, version, product name, signing, and declared artifacts.
- Record what was checked and acknowledge the remaining limits.
- Approve only the receipt or reject it with an actionable reason.
- Publish approved metadata through the Community catalogue publisher and
  verify installation or browsing from a clean reader.
