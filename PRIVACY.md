# Privacy Policy — iOS Tab Switcher

_Last updated: 17 July 2026_

iOS Tab Switcher is a browser extension that shows your open tabs as a grid of
cards with screenshot previews. **It does not collect, transmit, sell, or share
any of your data.** Everything the extension reads or stores stays on your own
device.

## What the extension accesses

To render the switcher, the extension reads, entirely on your device:

- **Tab information** — the title, URL, favicon, audio (playing/muted) state, and
  tab-group membership of your open tabs, so it can draw and label the cards.
- **Screenshots of tabs you view** — when you switch to or finish loading a tab,
  the extension captures an image of that visible tab (`captureVisibleTab`) to use
  as the card preview. Only tabs you actually visit are captured; pages are never
  loaded or captured in the background on your behalf.

## Where that data is stored

- **Regular tabs** — preview thumbnails are stored locally in your browser's
  **IndexedDB**, on your device only.
- **Incognito tabs** — preview thumbnails are kept in **in-memory session storage**
  only. They are never written to disk and are discarded when you close the
  browser.

None of this data ever leaves your device. The extension makes **no network
requests**, contains **no analytics or tracking**, and uses **no third-party
services or servers**.

## Data retention

- A tab's thumbnail is deleted as soon as that tab is closed.
- Thumbnails are also swept when the browser starts, removing any that belong to
  tabs that no longer exist.
- Incognito thumbnails are cleared automatically when the browser closes.
- Removing (uninstalling) the extension deletes all of its stored data.

## Permissions and why they are needed

- **`tabs`** — to list your open tabs and their titles/URLs for the grid.
- **`storage`** — to keep preview thumbnails in local/session storage.
- **`favicon`** — to display each site's favicon on its card.
- **`tabGroups`** — to show and edit your existing Chrome tab groups.
- **`<all_urls>` (host permission)** — required by Chrome so that
  `captureVisibleTab` can capture the tab you are viewing. Without it, Chrome
  would only allow captures triggered by a click on that exact tab, which is
  incompatible with an at-a-glance switcher. This permission is used solely for
  local screenshots; the extension does not read page content or inject scripts.

## Changes to this policy

If this policy changes, the "Last updated" date above will be revised in this
file.

## Contact

Questions about privacy can be raised via the project's issue tracker:
<https://github.com/sphaax/ios-tab-switcher/issues>
