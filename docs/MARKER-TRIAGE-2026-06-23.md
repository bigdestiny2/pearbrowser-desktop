# PearBrowser Desktop - Marker Triage (2026-06-23)

This note classifies the current task/debt marker surface for PearBrowser
Desktop. It is intended to prevent future agents from spending Level 2 loops on
generated dependency code while still preserving the real maintenance rule.

## Current Read

There are no first-party task/debt markers in the maintained PearBrowser
Desktop source tree when generated bundles, dependencies, build output,
coverage, and sourcemaps are excluded.

The only marker hits in the current project scan are inside
`backend/sheets-bundle.cjs`. That file is a generated CommonJS bundle of the
ESM-only `schema-sheets` dependency. The bundle exists because the Bare/Pear CJS
backend cannot directly dynamic-import the bare `schema-sheets` package; the
source bridge is `backend/sheets-import.mjs`, and the rebuild script is
`scripts/build-sheets-bundle.sh`.

The task comments inside `backend/sheets-bundle.cjs` are upstream/generated
dependency comments. They should not be edited manually in PearBrowser Desktop.

## Marker Inventory

Maintained source scan:

```bash
rg -n "[T]ODO|[F]IXME" \
  -g '!node_modules/**' \
  -g '!backend/sheets-bundle.cjs' \
  -g '!assets/**' \
  -g '!dist/**' \
  -g '!build/**' \
  -g '!coverage/**' \
  -g '!*.map'
```

Result: no matches.

Generated bundle scan:

```bash
rg -n "[T]ODO|[F]IXME" backend/sheets-bundle.cjs
```

Result: 16 generated/upstream comments inside the schema-sheets bundle.

## Classification

- `backend/sheets-bundle.cjs`: generated artifact, not authoritative source.
  Rebuild with `sh scripts/build-sheets-bundle.sh` after bumping
  `schema-sheets` or related transitive dependencies.
- `backend/sheets-import.mjs`: source bridge for the ESM dependency. No open
  marker.
- `backend/sheets-catalog.js`: source wrapper that loads the bundle and maps
  schema-sheets rows into the PearBrowser app DTO. No open marker.
- `scripts/build-sheets-bundle.sh`: source rebuild path with Bare builtin
  aliases. No open marker.
- `test/sheets-catalog-query.test.js`: hardening coverage for the sheets read
  path. No open marker.

## Maintenance Rule

Do not patch task comments directly in `backend/sheets-bundle.cjs`. If a marker
inside the bundle corresponds to a real PearBrowser bug, fix or pin the
upstream dependency, rebuild the bundle with `scripts/build-sheets-bundle.sh`,
and then run the relevant sheets/catalogue tests plus the root suite.

Future first-party markers should include enough context to be actionable:
owner or subsystem, date, current blocker, and the validation gate that will
close the marker.

## Validation

- Maintained-source marker scan returned no matches.
- Generated bundle marker scan returned only upstream/generated comments.
- `git diff --check` passed on the current dirty worktree.
- `npm test` passed in the adjacent status-audit loop on the same current
  worktree with 415 tests passed, 0 failed. This marker triage adds docs only.

## Recommended Next Level 1/2 Edge

Keep PearBrowser Desktop marker scoring focused on maintained source. The next
useful Level 1/2 work should be release-evidence cleanup or one bounded product
clarity improvement from `docs/CURRENT_STATUS_AUDIT_2026-06-23.md`, not manual
editing of generated schema-sheets bundle comments.
