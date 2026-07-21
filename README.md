# Tab Switcher (iOS Style)

Chrome extension (Manifest V3) that brings an iOS-style tab switcher to desktop: a responsive grid of landscape tab cards with live screenshot previews, dark theme, tab counter and floating new-tab button. The card layout follows the iPad version of the switcher, which suits a wide desktop screen better than the phone's portrait cards.

Visual references: [docs/reference.jpg](docs/reference.jpg) (phone), [docs/reference-ipad.jpg](docs/reference-ipad.jpg) (iPad)

## Installation (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the root folder of this repository (the one containing `manifest.json`).

## Usage

- **Open/close the switcher**: click the extension icon, or press `Ctrl+Shift+E` (also `Ctrl+Shift+E` on Mac, using the physical Ctrl key). The shortcut is a toggle: from the switcher, it closes it and returns to the previous tab. Configurable in `chrome://extensions/shortcuts`.
- **Click a card**: activates the corresponding tab (and its window) and closes the switcher.
- **Click the ✕**: closes the tab.
- **+ button**: opens a new tab (in the current mode: normal, private, or inside the open group).
- **Escape**: leaves the group detail view, otherwise closes the switcher and returns to the previously active tab.
- **Arrow keys**: move keyboard focus between cards (spatial navigation — works with the responsive grid's variable column count, and jumps cleanly across section headers). **Enter** or **Space** activates the focused card; **Delete** closes it. Focus survives live re-renders and is ignored while typing in search or a group name.
- **Search** (pill on the top-left): live-filters cards by title/URL in every view (and group rows by name). Enter opens the first match; Escape clears the query.
- **Duplicate tabs**: a pill next to search appears only when two or more open tabs share the exact same URL ("Tabs" and "Private" modes). Click it to filter the grid to just those tabs, grouped by URL with a section label — then click the trash button to close all duplicates but one per group (prefers keeping a pinned tab, then the tab you opened the switcher from, then the first). Typing in search exits the filter.
- With several Chrome windows open, the grid splits into one section per window, your current window first.
- Tabs belonging to a Chrome tab group show a ring in the group's color. The active tab is outlined in blue.
- **Pinned tabs** remain regular cards, identified by an upright pin badge on the top-left of their preview. Clicking the badge unpins the tab. On an unpinned, ungrouped card the same badge — tilted 45°, since it only *offers* to pin — appears **on hover** (or when the card has keyboard focus; always visible on touch devices, hidden while dragging) and pins the tab.
- **Grouped tabs** show an ungroup badge on the top-left of their preview (same slot as the pin badge — a tab can never be both pinned and grouped in Chrome). Clicking it removes the tab from its group; this is the only way to ungroup from inside a group's detail view, where every card shares the same group and drag-and-drop has no valid target to drop out onto.
- **Drag & drop**: drag a card onto another — drop near an edge (25% of the card's width) to reorder, drop in the center (50%) to group, matching Chrome's native tab strip. Reordering inserts before/after (blue bar shows the side); grouping adds the dragged tab to the target's group, or creates a new group if the target has none (dashed outline shows the target). A newly created group is **named and colored automatically** — after the site if both tabs come from one (e.g. "YouTube"), otherwise after a shared category ("Work", "Dev", "Shopping"…). For a single-site group the color is taken from the **dominant non-neutral color of the site's favicon** (blue for Facebook, red for YouTube), falling back to the category/domain color when the favicon is monochrome. Classification is entirely local (a built-in domain table plus local pixel analysis, no network request); with no confident match the group is left untitled, and the name stays editable from the title pill. Works across window sections and inside a group's detail view. Chrome's invariants are enforced: pinned tabs only reorder among other pinned tabs and can't be grouped, groups stay contiguous (an outside tab can only be dropped at a group's edges to reorder; dragging a grouped tab out ungroups it). Disabled while a search filter is active.

### The three modes (top pill)

- **Tabs** (counter, center): the classic grid.
- **Private browsing** (hat icon, left): incognito tabs, dark cards, active tab ringed in white. Requires allowing the extension in incognito (`chrome://extensions` → Details → "Allow in Incognito"). Incognito thumbnails are kept in memory only (`storage.session`), never written to disk, and vanish when Chrome closes. Chrome limitation: an extension page cannot be displayed *inside* a private window ("spanning" incognito mode); when invoked from a private window, the switcher therefore opens in a normal window, directly in private mode, and returns focus to the private window on close.
- **Groups** (grid icon, right): the list of your real Chrome tab groups. Click a group → detail view tinted with the group's color, where you can rename the group and change its color from the title pill; the **+** adds a tab directly to the group, and the circular ungroup button in the top-right dissolves the group (ungroups all its tabs at once — they stay open). From the list, the **+** creates a new Chrome group.

## How previews work

`chrome.tabs.captureVisibleTab()` can only capture the currently visible tab. The service worker therefore captures each tab **at the moment you view it** (activation or load completion, throttled to ~1 s), crops the capture to the 2:1 preview ratio (center slice, close to a maximized desktop viewport), resizes it to 512×256 (JPEG quality 70) and stores it in IndexedDB.

Consequences:

- A tab never visited since installation has no preview → fallback card with a large centered favicon (like Chrome iOS for unloaded tabs).
- `chrome://` pages, the Chrome Web Store and other protected pages cannot be captured → same fallback.
- The preview reflects your last visit to the tab, not necessarily its current state.

## Structure

```
manifest.json    — MV3; permissions tabs, storage, favicon, tabGroups; <all_urls>
background.js    — service worker: captures, active-tab tracking, switcher opening
lib/thumbs.js    — IndexedDB access to thumbnails (shared between SW and page)
lib/group-naming.js — local domain table: auto-names/colors a new tab group
switcher.html    — the switcher page (opened as a full-screen tab)
switcher.css     — iOS dark theme, responsive grid, animations
switcher.js      — card rendering, interactions, real-time updates
```

The `<all_urls>` host permission is required: without it, `captureVisibleTab` demands a user gesture on the captured tab (`activeTab`), which is incompatible with automatic background capture.

## Packaging for the Chrome Web Store

Run the build script (Windows PowerShell) to produce an upload-ready zip in `dist/`:

```
powershell -ExecutionPolicy Bypass -File build.ps1
```

It bundles only the runtime files (`manifest.json`, `background.js`, `switcher.*`, `lib/`, `_locales/`, `icons/`) with `manifest.json` at the zip root — no git data, docs, or reference images. Upload the resulting `dist/ios-tab-switcher-v<version>.zip` at the [Chrome Web Store developer console](https://chrome.google.com/webstore/devconsole).

## Privacy

The extension collects and transmits nothing — all tab data and screenshot thumbnails stay on your device. See [PRIVACY.md](PRIVACY.md) for the full policy (usable as the Web Store privacy-policy URL).

## Out of scope

- Pinning a **grouped** tab from the switcher: its top-left slot holds the ungroup badge, and Chrome would silently pull the tab out of its group. Ungroup first, then pin.
