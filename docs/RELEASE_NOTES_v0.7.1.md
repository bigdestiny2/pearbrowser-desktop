# PearBrowser Desktop v0.7.1

PearBrowser `v0.7.1` is a corrective transport release for the desktop browser.
It fixes the cluster of `RPC timeout` messages that could appear in Settings
after a renderer reload or live-update handoff even though the identity,
profile, permissions, and relay handlers were healthy.

What changed:

- Pending RPC calls fail immediately when the local renderer socket closes,
  instead of waiting 30 seconds and blaming an unrelated command number.
- The per-launch authenticated renderer automatically reconnects during a
  bounded eight-second backend grace period.
- Backend events are buffered across that brief handoff and the shell displays
  an explicit reconnect/resume screen.
- Failed initial port candidates are destroyed so a late socket cannot claim
  the browser's single renderer slot.
- If automatic recovery is impossible, PearBrowser gives a clear full-relaunch
  instruction without asking users to delete their profile or app storage.

The full desktop suite passes `681/681`. A controlled Pear renderer reload also
completed the authenticated reconnect path end to end; the four originally
reported Settings calls then answered in `1–2 ms`.

All browser protection and extension features from `v0.7.0` remain included:
P2P Content Shield lists, capability-gated Pear Plugins, offline list restore,
and the one-click P2P plugin catalogue.

The stable Pear address continues to hot-sync the current app:

`pear://tco5k7h38uoxatedp1wongdbhjxow1x7jiwm3t1i9cujbebhsbty`
