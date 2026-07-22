# PearBrowser v3 migration boundary

PearBrowser is moving from a v2 project launcher to a native desktop browser
that presents verified applications and installs as distinct user actions.

## What users do

- Install PearBrowser from a native package and verify the published checksum.
- Use `hyper://` drives as browsable content or sites.
- Treat old `pear://` app links as legacy migration identifiers. They do not
  execute in PearBrowser v3 and they are never supplied to `PearRuntime.run()`.
- Install a compatible app only when its signed AppRelease v2 package and
  platform target have been verified. A legacy-only app displays **Legacy app —
  migration required**.

## Runtime boundary

The browser’s embedded runtime starts only a bundled local worker using the
equivalent of `PearRuntime.run(require.resolve('./worker.js'))`. A remote
catalogue link is discovery metadata, not executable worker input. The
renderer cannot invoke an installer or runtime directly; those operations stay
in the privileged local backend and require explicit user confirmation.

## Data continuity

Do not delete an old installation as part of migration. Preserve its user data
until an app-specific migration adapter has completed discover, preserve,
migrate, validate, and rollback evidence. HiveRelay durability is availability
evidence, not a substitute for package signature or local data validation.

## Release gate

This source branch has removed remote legacy execution. Before it can be
promoted as a v3 native runtime build, the pinned `pear-runtime@1.3.1` host,
local worker boot/shutdown test, supported native package targets, and an
approved v3 package installer flow must all be present and independently
verified.
