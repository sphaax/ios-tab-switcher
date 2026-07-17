# ios-tab-switcher

Chrome extension (Manifest V3) that replicates the Chrome iOS tab switcher on desktop: a responsive grid of landscape tab cards with live screenshot previews, dark theme, tab counter and floating new-tab button. The card layout follows the iPad version of the switcher, which suits a wide desktop screen better than the phone's portrait cards.

Visual references: [docs/reference.jpg](docs/reference.jpg) (phone), [docs/reference-ipad.jpg](docs/reference-ipad.jpg) (iPad)

## Installation (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the root folder of this repository (the one containing `manifest.json`).

## Usage

- **Open/close the switcher**: click the extension icon, or press `Ctrl+Shift+Space` (also `Ctrl+Shift+Space` on Mac, using the physical Ctrl key). The shortcut is a toggle: from the switcher, it closes it and returns to the previous tab. Configurable in `chrome://extensions/shortcuts`.
- **Click a card**: activates the corresponding tab (and its window) and closes the switcher.
- **Click the ✕**: closes the tab.
- **+ button**: opens a new tab (in the current mode: normal, private, or inside the open group).
- **Escape**: leaves the group detail view, otherwise closes the switcher and returns to the previously active tab.
- **Search** (pill on the top-left): live-filters cards by title/URL in every view (and group rows by name). Enter opens the first match; Escape clears the query.
- With several Chrome windows open, the grid splits into one section per window, your current window first.
- Tabs belonging to a Chrome tab group show a ring in the group's color. The active tab is outlined in blue.
- **Pinned tabs** remain regular cards, identified by a pin badge on the top-left of their preview. Clicking the badge unpins the tab.

### The three modes (top pill)

- **Tabs** (counter, center): the classic grid.
- **Private browsing** (hat icon, left): incognito tabs, dark cards, active tab ringed in white. Requires allowing the extension in incognito (`chrome://extensions` → Details → "Allow in Incognito"). Incognito thumbnails are kept in memory only (`storage.session`), never written to disk, and vanish when Chrome closes. Chrome limitation: an extension page cannot be displayed *inside* a private window ("spanning" incognito mode); when invoked from a private window, the switcher therefore opens in a normal window, directly in private mode, and returns focus to the private window on close.
- **Groups** (grid icon, right): the list of your real Chrome tab groups. Click a group → detail view tinted with the group's color, where you can rename the group and change its color from the title pill; the **+** adds a tab directly to the group. From the list, the **+** creates a new Chrome group.

## How previews work

`chrome.tabs.captureVisibleTab()` can only capture the currently visible tab. The service worker therefore captures each tab **at the moment you view it** (activation or load completion, throttled to ~1 s), crops the capture to the 16:9 preview ratio (center slice), resizes it to 512×288 (JPEG quality 70) and stores it in IndexedDB.

Consequences:

- A tab never visited since installation has no preview → fallback card with a large centered favicon (like Chrome iOS for unloaded tabs).
- `chrome://` pages, the Chrome Web Store and other protected pages cannot be captured → same fallback.
- The preview reflects your last visit to the tab, not necessarily its current state.

## Structure

```
manifest.json    — MV3; permissions tabs, storage, favicon, tabGroups; <all_urls>
background.js    — service worker: captures, active-tab tracking, switcher opening
lib/thumbs.js    — IndexedDB access to thumbnails (shared between SW and page)
switcher.html    — the switcher page (opened as a full-screen tab)
switcher.css     — iOS dark theme, responsive grid, animations
switcher.js      — card rendering, interactions, real-time updates
```

The `<all_urls>` host permission is required: without it, `captureVisibleTab` demands a user gesture on the captured tab (`activeTab`), which is incompatible with automatic background capture.

## Out of scope (v1)

- Drag & drop reordering.
- Pinning tabs from the switcher (unpinning works; pinning is done via Chrome's native tab context menu).
