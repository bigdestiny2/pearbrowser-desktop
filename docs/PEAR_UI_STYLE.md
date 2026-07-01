# Pear UI Light - Desktop Adoption

Canonical design system:

`design-system/README.md` from the workspace root, or `../../design-system/README.md` from this file.

Full app GUI spec:

`../../design-system/PEARBROWSER_FULL_APP_GUI_SPEC.md`

Live preview:

`previews/next-release-ui.html`

## Desktop Direction

The desktop shell should become the reference implementation for Pear UI Light:

- Use the browser-first layout from the preview: left rail, compact tabs, central address/search command, and optional right-side network panel.
- Use pear green only for primary action, connected state, trusted resolution, and selected navigation.
- Use compact status badges for pins, peers, relays, trust tier, and cache state.
- Keep all cards, controls, panels, tabs, and address bars at 8px radius.
- Prefer icon buttons for browser tools and short text buttons only for direct commands such as Open, Publish, Save, and Retry.

## Token Mapping

Use CSS variables from `design-system/platform/css/pear-ui.css`.

| Current desktop idea | Pear UI token |
| --- | --- |
| App background | `--pear-color-canvas` |
| Chrome, cards, panels | `--pear-color-surface` |
| Hover/active soft fill | `--pear-color-surface-soft` |
| Border | `--pear-color-line` |
| Strong border | `--pear-color-line-strong` |
| Main text | `--pear-color-text` |
| Secondary text | `--pear-color-muted` |
| Quiet metadata | `--pear-color-quiet` |
| Primary action | `--pear-color-accent` |
| Healthy state | `--pear-color-success` |
| Warning state | `--pear-color-warning` |
| Error state | `--pear-color-error` |

## Migration Order

1. Move the preview token values into a desktop theme CSS file.
2. Restyle the top-level shell chrome: rail, tab strip, URL bar, status chip.
3. Restyle Browse empty/loading/about-site states.
4. Restyle Apps catalog cards and launch progress.
5. Restyle Sites, Library, Settings, and consent sheets.

Ship each step behind a theme class or feature flag until the whole shell is coherent.
