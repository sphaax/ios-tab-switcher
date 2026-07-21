# Chrome Web Store listing — copy/paste reference

Fields below map to the Web Store developer dashboard. English (United States).

---

## Store listing tab

### Name
```
Tab Switcher (iOS Style)
```

### Summary (short description — max 132 characters)
```
See all your tabs as a grid of live previews — an iOS-style switcher with search, drag-to-group, and duplicate cleanup.
```

### Category
```
Productivity
```

### Language
```
English (United States)
```

### Detailed description
```
NEW IN 0.2.1 — Pin a tab straight from the grid: hover any card and a pin appears in its corner. Click it and the tab is pinned; click the upright pin on an already-pinned card to unpin it.

Bring the familiar iOS-style tab switcher to your desktop.

Tab Switcher (iOS Style) opens a full-screen grid of all your open tabs as rounded cards with live screenshot previews, so you can spot the one you want at a glance instead of squinting at a crowded tab strip.

FEATURES

• Grid of preview cards — every open tab becomes a card with a live screenshot preview, its favicon, and its title. Click a card to jump straight to that tab.

• Live updates — the grid reflects your tabs in real time as you open, close, reload, or switch between them.

• Search — start typing to instantly filter your tabs by title or URL. Press Enter to open the first match.

• Drag & drop — drag a card onto another to reorder your real tabs, or drop it in the middle of a card to group the two together. Works across windows, and follows Chrome's own rules: pinned tabs stay in their zone, groups stay contiguous.

• Smart group names — a group you create that way is named and colored automatically: after the site when both tabs come from one, using that site's own brand color taken from its favicon, or after a shared theme such as Work, Dev, Shopping or News.

• Tab groups — browse your existing Chrome tab groups, open one into a color-tinted detail view, rename or recolor it, lift a single tab out of it, or dissolve the whole group in one click.

• Duplicate tabs — a badge appears only when the same address is open more than once. One click filters the grid down to those tabs, grouped by URL; another closes the extras and keeps one of each.

• Per-window sections — with several windows open, the grid is split into a labelled section per window, your current window first.

• Pin & audio badges — pin a tab without leaving the grid: hover a card and a tilted pin appears in its corner, one click and the tab is pinned. Pinned cards keep the pin upright, and clicking it unpins them. Tabs playing sound show a speaker badge you can click to mute or unmute.

• Private browsing — a dedicated view for your incognito tabs, with previews kept in memory only and never written to disk.

• Full keyboard control — open and close the switcher with a shortcut (default Ctrl+Shift+E, customizable at chrome://extensions/shortcuts). Inside the grid, move between cards with the arrow keys, open one with Enter, close one with Delete. Escape returns you to your previous tab.

• Clean dark design — a calm, iOS-inspired dark interface with smooth card animations.

100% LOCAL & PRIVATE

Everything stays on your device. The extension has no accounts, no tracking, no analytics, and talks to no servers — even the automatic group naming and coloring is worked out locally, from a built-in list of sites and the colors in the favicon itself. Tab previews are stored locally in your browser and are deleted when a tab is closed or the extension is removed. See the privacy policy for details.

HOW PREVIEWS WORK

Chrome can only capture the tab you are currently viewing, so the extension takes a thumbnail of each tab as you visit it. Tabs you have not opened since installing, and protected pages such as chrome:// and the Web Store, show a large centered favicon instead of a preview.

—

Not affiliated with, or endorsed by, Apple Inc. "iOS" refers only to the visual style this extension is inspired by.
```

---

## Privacy tab

### Single purpose (required)
```
Display the user's open browser tabs as a visual grid of preview cards so they can find and switch to a tab quickly.
```

### Permission justifications

**tabs**
```
Used to read the list of open tabs and their titles and URLs so they can be shown as cards, and to act on a tab in response to a direct user action in the grid: activate it, close it, reorder it (drag and drop), pin or unpin it, mute or unmute it, and add it to or remove it from a tab group.
```

**storage**
```
Used to store tab preview thumbnails locally (IndexedDB) and to remember the last active tab per window (in-memory session storage). No data is transmitted off the device.
```

**favicon**
```
Used to display each site's favicon on its card and in the tab-group previews, via Chrome's built-in _favicon API.
```

**tabGroups**
```
Used to display the user's existing Chrome tab groups and, in response to a direct user action, to create a new group by dragging one card onto another, set its name and color (including the automatic name/color suggested when it is created), rename or recolor an existing group, and dissolve a group.
```

**Host permission — `<all_urls>`**
```
Required so that chrome.tabs.captureVisibleTab can capture a thumbnail of the tab the user is currently viewing. Without a host permission, capturing would require a user gesture on that exact tab (activeTab), which is incompatible with an at-a-glance switcher that shows previews of the tabs you have visited. The extension only takes a screenshot of the visible tab; it does not read page content or inject any scripts, and thumbnails never leave the device.
```

**Are you using remote code?**
```
No — the extension contains all its code in the package and loads no remotely hosted code.
```

### Data usage — disclosures & certifications

The extension transmits no data off the device. Because it captures screenshots of the
visible tab, the accurate category to disclose is **Website content** (the thumbnails).
It does not collect names, contact info, financial info, authentication info, personal
communications, health, or location data.

Recommended data-collection selection:
- [x] Website content (tab screenshots, stored locally only)
- [ ] everything else: not collected

Certifications (all three should be checked — they are all true):
- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

> Note: these certifications are legally binding statements you are making. They are all
> accurate for this extension (all data stays on-device, nothing is sold or transferred),
> but read them yourself before submitting.

### Privacy policy URL
```
https://github.com/sphaax/ios-tab-switcher/blob/main/PRIVACY.md
```

---

## Graphic assets

- **Store icon**: 128×128 PNG — use `icons/icon128.png` (already in the repo).
- **Screenshots**: 1–5 required, **1280×800** or 640×400, PNG or JPEG (1280×800 recommended).
  Take raw captures of the switcher at any size, drop them in `store-screenshots/raw/`,
  then run `python make-screenshots.py` to convert them to exact 1280×800 images in
  `store-screenshots/out/` (scaled without distortion, padded with black to match the UI).
  Captions are matched by a keyword in the filename, so keep the `NN-<keyword>.jpg`
  naming — the keywords live in `CAPTIONS` in `market-screenshots.py`.
  Current set (v0.2.x listing):
  1. `01-grid` — the main grid full of cards, the hero shot. Caption: "All your tabs, at a glance."
  2. `02-dnd` — a card mid-drag over another, with the dashed "drop to group" outline.
     Caption: "Drop one tab onto another."
  3. `03-duplicates` — the "N duplicate tabs" pill active, grid filtered by URL with
     section headers and the trash button. Caption: "Find every duplicate tab."
  4. `04-search` — search in action (a query typed, grid filtered). Caption: "Find any tab, instantly."
  5. `05-private` — private-browsing view. Caption: "A private space, kept private."

  Retired shots (static group detail, pin/audio badges) are kept in
  `store-screenshots/raw-archive-v1/`.
- **Small promo tile** (optional, for featuring): 440×280 PNG/JPEG.

## Before uploading

1. Rebuild the package so the zip contains the renamed manifest:
   `powershell -ExecutionPolicy Bypass -File build.ps1`
2. Upload `dist/ios-tab-switcher-v<version>.zip`.
3. Fill the fields above; add screenshots; set the privacy policy URL.
4. Expect the `<all_urls>` justification to get the most review attention — the text above
   states the technical reason (background captureVisibleTab) that reviewers look for.
