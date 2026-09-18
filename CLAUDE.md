# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

`iobroker.vis-hqwidgets` is a **widget set for ioBroker.vis and vis-2**, not a running adapter. `io-package.json`
declares `"mode": "none"`, `"onlyWWW": true`, `"type": "visualization-widgets"` — there is **no Node.js runtime
code**. Everything ships in `widgets/` and runs in the browser inside vis.

Every widget exists **twice**, with the same widget ids and the same attribute names:

| | vis (vis-1) | vis-2 |
|---|---|---|
| source | `widgets/hqwidgets.html` + `widgets/hqwidgets/` (hand-maintained) | `src-widgets/src/*.tsx` |
| technique | EJS templates, jQuery, jQuery UI, `jquery.knob`, `odometer.js` | React + TypeScript, no third-party UI libs |
| shipped as | the same files | `widgets/vis-2-widgets-hqwidgets/` (generated) |

vis-2 loads both and **a React widget replaces the EJS widget of the same id** (`visWidgetsCatalog.tsx`:
`visWidgetTypes.findIndex(item => item.name === widgetObj.name)` → replace; the runtime then resolves
`VisWidgetsCatalog.rxWidgets[widget.tpl]` first). That is the whole migration mechanism, and it only works while
three things hold:

1. `getWidgetInfo().id` equals the vis-1 `<script id="tplHq…">`.
2. `getWidgetInfo().visSet` is `'hqwidgets'`.
3. Every attribute name of the vis-1 template still exists — widget data is stored per attribute name, so a
   renamed field silently drops the user's setting.

`npm run check-widgets` enforces all three; see below.

## Commands

```bash
npm run build          # sync version into the vis-1 set, then npm i + tsc + vite build + copy to widgets/
npm run tsc            # type-check src-widgets only
npm run check-widgets  # validate the widget declarations against the vis-1 templates (see below)
npm run preview        # vite dev server with a stub of vis-2 - shows all widgets without an ioBroker
npm run screenshots    # render the images of docs/img/ with a headless Chrome (see below)
npm run lint           # eslint with @iobroker/eslint-config
npm test               # mocha --exit -> test/testPackageFiles.js (package/io-package validation)
npm run npm            # install in root and src-widgets
npm run release-patch  # release-script; runs lint before the check and build before the commit
```

`npm run build` must not be replaced by a plain vite build: `tasks.js` deletes **only**
`widgets/vis-2-widgets-hqwidgets` and `src-widgets/build`, never the whole `widgets/` folder — the vis-1 set
lives there and is maintained by hand.

### Version bumps

The version lives in `package.json`, `io-package.json` (both handled by `release-script`), plus the header
comment of `widgets/hqwidgets.html` and the `version:` field of `vis.binds.hqwidgets` in
`widgets/hqwidgets/js/hqwidgets.js`. `tasks.js` rewrites the latter two by regex from `package.json` on every
build (`node tasks --version` does only that), so keep those literals in a shape the regexes still match.

### `npm run check-widgets`

`src-widgets/checkWidgets.mjs` bundles the widget sources for node, stubs `window.visRxWidget`, calls every
`getWidgetInfo()` and checks the three migration invariants above plus that every `label`/`tooltip`/select option
exists in `src-widgets/src/i18n/en.json`. Attributes the vis-1 template offered but never actually used are
listed in its `DROPPED` map with the reason — add to that list only after confirming the vis-1 code really
ignored the attribute.

## Architecture of the vis-2 widget set (`src-widgets/`)

Vite + `@module-federation/vite`, federation name `visHqWidgets`, remote entry `customWidgets.js`. The exposed
component names and the URL are repeated in `io-package.json` under `common.visWidgets.visHqWidgets` — adding a
widget means touching `vite.config.ts` (`exposes`) **and** that block.

`moduleFederationShared(pack)` from `@iobroker/types-vis-2` filters the shared modules by the dependencies in
`src-widgets/package.json`. React and `react/jsx-runtime` must stay shared, otherwise vis-2's
`visWidgetSetCompatibility.ts` refuses to load the set. MUI and emotion were deliberately removed from the
dependencies: the widgets draw their own look with `src/styles.css` and inline SVG, so declaring MUI would only
add a large prebuilt share chunk.

`@swc/core` is pinned to `1.15.30` via `overrides` — `vite-plugin-top-level-await` fails on 1.16 with
`missing field 'type'` while printing the AST.

### Widget classes

Every widget extends `Generic` (`src/Generic.tsx`), which extends `window.visRxWidget` provided by the vis-2
runtime, and declares `getI18nPrefix() === 'vis_hqwidgets_'`. `Generic.t('key')` therefore looks up
`vis_hqwidgets_key`; the JSON files under `src/i18n/` hold the keys **without** the prefix and
`src/translations.ts` adds it.

- `Components/HqButtonBase.tsx` — the shared implementation of the four round widgets (`HqButton`, `HqDimmer`,
  `HqInTemp`, `HqOutTemp`), the counterpart of the vis-1 `vis.binds.hqwidgets.button`. Subclasses only override
  `isNumber()` (the vis-1 `wType === 'number'`), `isTemperature()` and `getMainOid()`, and compose their
  attribute groups from its static `groupCenter` / `groupLeftRight` / `groupStyles` / `groupIndicators` helpers.
- `HqShutter`, `HqDoor`, `HqLock`, `HqCheckbox`, `HqCircle`, `HqOdometer` extend `Generic` directly.
- `Components/` holds the replacements for the dropped libraries: `CircularSlider` (SVG, replaces
  `jquery.knob` + the `$.fn.scala` wrapper), `VerticalSlider` (replaces `$.fn.makeSlider`), `ShineSwitch`
  (replaces `$.fn.shineCheckbox`), `Odometer` (replaces `odometer.js`), `Indicators` (battery/working/no-data).

### Conventions that come from the vis-1 set

- **Attribute values arrive as strings.** `utils.ts` has the coercions (`isTrue`, `toNumber`, `toStateValue`);
  use them instead of comparing against `true`/`1` directly. `HqButtonBase` even keeps a `looseEqual` helper,
  because the original compared `min`/`max` against state values with `==` and configurations rely on it.
- **CSS class names are stored in projects.** `styleNormal` / `styleActive` hold names like
  `hq-button-base-on` or `glossy-button-orange`; `SKINS` in `HqButtonBase.tsx` and the rules in `styles.css`
  must keep them. Everything in `styles.css` is scoped under `.hq-rx` so the vis-1 stylesheet, which vis-2 also
  loads, does not collide.
- **The dark theme runs over CSS variables.** Every widget root uses `Generic.getRootClass()`, which adds
  `hq-rx-dark` when `context.themeType === 'dark'`; the variables at the top of `styles.css` then switch. Only
  what lies **on the view** follows the theme (the description pills, the track of the arc, the signal text and
  the popups of the shutter and the lock) —
  the button skins, the window, the door and the switch are surfaces of the object itself and keep their
  colours, otherwise a yellow lamp would suddenly be grey at night. For the same reason `.hq-centerinfo` has an
  explicit dark text colour instead of inheriting: it sits on a light button skin in both themes.
- **Writes go through `this.props.context.setValue(oid, value)`.** vis-2 applies the value optimistically with
  `ack: false`, which is what makes the "working" indicator appear until the adapter acknowledges — no local
  optimistic state needed.
- Images are referenced relative to the vis root: `img/bulb_off.png` resolves against vis-2's own `img/` folder,
  `widgets/hqwidgets/img/…` against the vis-1 assets this package ships.

### `src-widgets/preview/` — the development page

`npm run preview` starts a vite dev server (port 4173) with a page that renders all ten widgets against a stub of
`VisRxWidget`. No ioBroker needed, and editing a widget hot-reloads it.

- The **state values live in the page**, not in the widgets: the stub feeds them in via
  `getDerivedStateFromProps`, so the sliders and switches on the left drive every widget at once, and a click on
  a widget writes back through `context.setValue` with `ack: false` — the same round trip as in vis-2, including
  the "working" marker.
- The **sash matrix** at the bottom shows every `slide_type` against every handle value (closed / tilted /
  opened). That is the fastest way to spot a broken window state, since those combinations are otherwise only
  reachable with real HomeMatic states.
- Toggles for dark background, edit mode and "arc always on" cover the cases that are easy to get wrong.

Not part of the widget set, excluded from lint, `dist/` is git-ignored.

`preview/stub.tsx` (the `VisRxWidget` stub) and `preview/icons.ts` are shared by two pages: `index.html`, the
interactive page above, and `shots.html`, fixed scenes for the documentation. Every `<section data-shot="name">` of
`shots.tsx` becomes `docs/img/name.png`. `npm run screenshots` (`preview/screenshots.mjs`) starts its own vite on
port 4175 with its own cache dir, drives a local Chrome over the DevTools protocol (node 22 `WebSocket`, no
puppeteer) and saves the sections at 2x. `npm run screenshots -- door lock` renders only those. Set `VIS2_IMG` to
the `www/img` folder of a vis-2 checkout so the lamp and thermometer are the real vis-2 images; the vite config
serves `/img/` from there and `/widgets/` from this repository. After changing how a widget looks, re-render the
images and check the user documentation in `docs/en/README.md` and `docs/de/README.md`. Both describe every
setting of every vis-2 widget.

To compare a widget against the vis-1 original, serve the repository root and load
`widgets/hqwidgets/css/hqwidgets.css` next to the built `widgets/vis-2-widgets-hqwidgets/assets/styles-*.css` —
the `data-vis-prev` attribute of a template in `widgets/hqwidgets.html` is a ready-made snapshot of the original
markup and renders with that stylesheet.

Note that the scripts of `src-widgets` have to be called with `npx` (`cd src-widgets && npx vite …`): `npm run`
only puts the `node_modules/.bin` of the **root** on the PATH.

`npm run preview` starts the development page from the root **and** from `src-widgets` — the vite default
`vite preview` was replaced there on purpose: it only served the federation build, whose `index.html` loads the
empty `src/index.tsx` and stays white. `npm start` in `src-widgets` is still the federation dev server; on its own
it also shows a white page, it is only useful while vis-2 loads the widget set from it.

**A blank preview page usually means a second vite is running.** Two dev servers of the same project overwrite
each other's optimized dependencies and the page then loads without any error. The config therefore uses
`strictPort: true` (a second `npm run preview` fails with "Port 4173 is already in use" instead of moving to
4174) and its own `cacheDir`. If a server seems stuck, check with
`Get-NetTCPConnection -State Listen -LocalPort 4173` — stopping the npm wrapper does not always kill the vite
process underneath.

## The vis-1 widget set (`widgets/`)

Still shipped and still maintained by hand; only touch it for fixes that vis (vis-1) users need.

- `widgets/hqwidgets.html` — one `<script type="text/ejs" class="vis-tpl" id="tplHq…">` per widget. The
  `data-vis-attrs*` mini-DSL defines the editor fields (`;`-separated, `group.x` opens a group, `[default]`,
  `/type`, `(1-slide_count)` for indexed groups). Attribute labels are translated through `systemDictionary` at
  the bottom of `js/hqwidgets.js`.
- **Lines ~169–297 are one big HTML comment** holding `tplHqText` … `tplHqEventlist`. They call
  `vis.binds.hqWidgetsExt`, which does not exist in this repository — dead code, not ported.
- `js/hqwidgets.js` — jQuery plugins, `systemDictionary`, `vis.binds.hqwidgets` (`window`, `door`, `lock`,
  `circle`, `checkbox`, `odometer`) and the edit-mode-only `changed*Id` helpers that auto-fill sibling OIDs.
- `js/hqButton.js` — `vis.binds.hqwidgets.button` for the four round widgets.
- `js/jquery.knob.js`, `js/odometer.min.js` and the `css/odometer-theme-*.css` are vendored third-party copies.

The vis-1 lifecycle is `init()` → normalize `data` → `$div.data('data', data)` → `draw()` (builds the DOM once,
binds `vis.states`) → `changeState()` for updates; the `setTimeout` retries in `init`/`draw` are load-bearing,
because vis renders views lazily.

## Changelog

`README.md` carries the changelog; the release script moves the `### **WORK IN PROGRESS**` section into
`io-package.json` `common.news` with translations. Add entries as `* (author) description`.
