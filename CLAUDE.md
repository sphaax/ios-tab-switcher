# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome Manifest V3 extension (plain ES modules, no build step, no dependencies, no test suite) that replaces the tab strip with an iOS-style grid of tab cards with live screenshot previews. `README.md` documents every user-facing behaviour in detail — read it before changing interaction logic, and keep it in sync when behaviour changes.

## Working on it

- **No build, no bundler.** Source files *are* the shipped files. To test a change: load the repo root as an unpacked extension at `chrome://extensions` (Developer mode → Load unpacked), then hit the reload arrow after each edit — the switcher page and the service worker both need it.
- **Syntax check** (the only automated check available): copy a file to a `.mjs` name and run `node --check` on it (Node refuses `--check` on `.js` treated as CommonJS with `import`). Same trick for validating `manifest.json` with `JSON.parse`.
- **Package for the Web Store**: `powershell -ExecutionPolicy Bypass -File build.ps1` → `dist/ios-tab-switcher-v<version>.zip`. It's a whitelist of runtime files (`manifest.json`, `background.js`, `switcher.*`, `lib/`, `_locales/`, `icons/`); anything new that ships must be added to `$include` in [build.ps1](build.ps1).
- **Version** lives only in `manifest.json` and drives the zip filename.

## Conventions

- **Code comments are in French; docs (README, PRIVACY, STORE_LISTING) and commit messages are in English.** Follow that split.
- **No user-facing string literals in code.** Every one goes through `chrome.i18n` — either `t('key')` in JS or a `data-i18n-title` / `data-i18n-placeholder` / `data-i18n-text` attribute in `switcher.html` (applied in one pass at the top of `switcher.js`). Both `_locales/en` and `_locales/fr` must be updated together; they are kept at parity.
- **Nothing leaves the device.** No network requests, no analytics — this is a stated privacy guarantee ([PRIVACY.md](PRIVACY.md)) and the reason group naming/coloring uses a local domain table plus local favicon pixel analysis rather than any lookup service.
- Features land on `feat/*` branches merged into `main` with merge commits.

## Architecture

Three runtime pieces, no framework:

| File | Role |
| --- | --- |
| [background.js](background.js) | Service worker: thumbnail capture, last-active-tab tracking, opening/toggling the switcher |
| [switcher.js](switcher.js) | The whole UI: rendering, interactions, live updates (~1200 lines, sectioned by `// ---------- … ----------` banners) |
| [lib/thumbs.js](lib/thumbs.js) | IndexedDB thumbnail store, shared by the SW (writes) and the page (reads) |
| [lib/group-naming.js](lib/group-naming.js) | Pure, local domain table + HSL color math for auto-naming/coloring new groups |

**Thumbnails.** `chrome.tabs.captureVisibleTab()` only sees the visible tab, so the SW opportunistically captures on activation / load-complete / window-focus (throttled ~1 s, with a 200 ms settle delay), crops "cover" to 2:1, downscales to 512×256 JPEG and stores it in IndexedDB keyed by `tabId`. Never upscales. A tab never visited since install has no thumbnail → favicon fallback card. Incognito captures go to `chrome.storage.session` under `incog-<tabId>` instead, so they never touch disk. Thumbnails are deleted on `tabs.onRemoved` and swept on startup/install via `keepOnly()`.

**Switcher page as a tab.** The switcher is a full-screen extension tab, single-instance (stale copies in other windows are closed on open). The action click and the `open-switcher` command both call `openSwitcher()`, which toggles: if the current tab *is* the switcher, it closes and restores focus. The tab to return to comes from `storage.session`: `switcherSource` (where the switcher was invoked from) with `lastActive[windowId]` as fallback — that same pair is read in both `background.js:closeSwitcherTab` and `switcher.js:closeSwitcher`, so changes must be mirrored. Extension pages can't render inside an incognito window, so invoking from one opens the switcher in a normal window already in private mode.

**Rendering model.** State is a handful of module-level `let`s in `switcher.js` (`mode`, `searchQuery`, `duplicatesOnly`, `openGroupId`, …). Every Chrome tab/tabGroup event funnels into a debounced `scheduleRefresh()` → `refresh()`, which re-queries all tabs and delegates to `renderTabs` / `renderIncognito` / `renderGroupsList` / `renderGroupDetail`. Three invariants that are easy to break:

- `refresh()` is async and events arrive in bursts, so it uses a `renderSeq` generation token; every renderer takes a `stale()` callback and must bail after each `await`.
- The grid is **never cleared at the top of `refresh()`** — each view swaps its content in one block, otherwise the page height collapses mid-await and the scroll position jumps.
- `refresh()` returns early while `editingName` or `isDraggingCard` is set, so live re-renders don't destroy an in-progress edit or drag. Any new modal-ish interaction needs the same guard, and keyboard focus is restored across re-renders via `pendingFocusTabId`.

**Chrome tab invariants.** Drag & drop, grouping and pinning all enforce Chrome's own rules (pinned tabs reorder only among pinned tabs and can't be grouped; groups must stay contiguous). See `isValidDropTarget` / `isValidGroupTarget` / `performDrop` / `performGroupDrop` — that logic is the trickiest part of the codebase and is described behaviourally in the README's drag & drop bullet.

**Permissions.** `<all_urls>` is load-bearing: without it `captureVisibleTab` requires a user gesture on the captured tab (`activeTab` semantics), which makes automatic background capture impossible. Don't "simplify" it away.
