# Community catalogue review process

PearBrowser separates content replication from catalogue endorsement. A relay
pin approval means a relay may store and serve a drive. It does **not** by
itself publish that drive into the shared Community catalogue.

## Submission lifecycle

1. A publisher opens **Apps → Submit your app**, supplies a browsable
   `hyper://` target, and submits it.
2. PearBrowser publishes a bounded submission receipt and sends a signed seed
   request for the content drive.
3. A HiveRelay running in `review` acceptance mode adds that request to its
   authenticated management queue.
4. An operator opens **Apps → Moderator tools**, loads the queue, and runs due
   diligence for one request at a time.
5. The operator previews the site, records a note, and either approves the
   relay pin or rejects the request with a reason.
6. Approved metadata is published into the Community Hyperbee through the
   separate secret-holding catalogue release process. Until this final step,
   the content may be replicated but is not listed for all users.

A broadcast with zero initial relay acknowledgements is reported as
`awaiting-relay`, not as a confirmed pending review. The client may retry the
signed seed request, but an operator must see it in a relay queue before any
decision is possible.

## Automated due diligence

The browser fetches evidence directly from the queued content drive and checks:

- canonical 64-hex content key and visible publisher public key;
- replicated Hyperdrive version and a bounded `/index.html` entrypoint;
- a parseable `/manifest.json` with a non-empty app name;
- manifest target consistency with the queued drive;
- rejection of native, `pear://`, `file://`, package, and executable targets;
- duplicate drive entries in the catalogues currently loaded by the browser;
- external HTTP origins and high-signal page behavior such as dynamic code,
  iframes, forms, or service-worker registration;
- queue age and other provenance metadata exposed by the relay.

Missing content, a missing publisher key, an invalid/missing manifest, key
mismatch, or an executable delivery declaration is a blocker. Duplicates,
behavioral signals, mutable-drive updates, and the fact that a signing key does
not prove a real-world identity are warnings. The page scan is bounded and does
not inspect linked scripts. Automated checks never declare an app safe: every
eligible approval still requires the operator to open the preview and
explicitly acknowledge the warnings.

## Decision records

Approvals and rejections are written to a bounded local audit trail containing
the app key, publisher key, action, reviewer note or rejection reason, decision
time, and automated-check counts. API credentials are never copied into audit
records.

Rejection requires a reason. Approval fails closed if evidence has blockers or
the human-review acknowledgement or reviewer note is missing. Decisions also
require a queue refreshed within the last five minutes from a relay reporting
`review` mode. Approval is bound to the exact Hyperdrive version shown in the
review report; if the content changes before the decision, the reviewer must
fetch and inspect new evidence. File-size caps are checked from authenticated
Hyperdrive metadata before content is downloaded. The relay management API
receives only the app key because its current protocol does not carry reviewer
notes; the detailed record stays in PearBrowser until a signed shared
moderation log is introduced.

## Operator checklist

- Confirm the relay reports `review` mode.
- Run or refresh due diligence.
- Compare the manifest name, author, version, and purpose with the publisher's
  claimed identity through an independent channel when possible.
- Open the preview and exercise the main flows without granting unnecessary
  permissions.
- Investigate external origins, forms, iframes, dynamic execution, and duplicate
  listings rather than treating them as automatic guilt.
- Record what was checked.
- Approve the relay pin only when the evidence is coherent, or reject with an
  actionable reason.
- Publish approved metadata through the Community catalogue release process and
  verify the resulting catalogue from a fresh reader.
