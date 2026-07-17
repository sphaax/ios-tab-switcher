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
See all your tabs as a grid of live-preview cards — an iOS-style tab switcher with search, groups, and window sections.
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
Bring the familiar iOS-style tab switcher to your desktop.

Tab Switcher (iOS Style) opens a full-screen grid of all your open tabs as rounded cards with live screenshot previews, so you can spot the one you want at a glance instead of squinting at a crowded tab strip.

FEATURES

• Grid of preview cards — every open tab becomes a card with a live screenshot preview, its favicon, and its title. Click a card to jump straight to that tab.

• Live updates — the grid reflects your tabs in real time as you open, close, reload, or switch between them.

• Search — start typing to instantly filter your tabs by title or URL. Press Enter to open the first match.

• Per-window sections — with several windows open, the grid is split into a labelled section per window, your current window first.

• Tab groups — browse your existing Chrome tab groups, open a group into a color-tinted detail view, and rename or recolor it right there.

• Pinned & audio badges — pinned tabs are marked with a pin you can click to unpin; tabs playing sound show a speaker badge you can click to mute or unmute.

• Private browsing — a dedicated view for your incognito tabs, with previews kept in memory only and never written to disk.

• Keyboard shortcut — open and close the switcher with a shortcut (default Ctrl+Shift+E, customizable at chrome://extensions/shortcuts). Press Escape or the shortcut again to return to your previous tab.

• Clean dark design — a calm, iOS-inspired dark interface with smooth card animations.

100% LOCAL & PRIVATE

Everything stays on your device. The extension has no accounts, no tracking, no analytics, and talks to no servers. Tab previews are stored locally in your browser and are deleted when a tab is closed or the extension is removed. See the privacy policy for details.

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
Used to read the list of open tabs and their titles and URLs so they can be shown as cards, and to activate or close a tab when the user clicks a card or its close button.
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
Used to display the user's existing Chrome tab groups and to let the user rename a group or change its color from the switcher.
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
  Suggested set, using your own real switcher captures:
  1. The main grid full of cards — the hero shot. Caption: "All your tabs at a glance."
  2. Search in action (a query typed, grid filtered). Caption: "Type to find any tab instantly."
  3. Tab-groups list or a color-tinted group detail view. Caption: "See and edit your tab groups."
  4. Private-browsing view. Caption: "A separate space for incognito tabs."
  5. A card showing the audio/pin badges. Caption: "Spot and mute noisy tabs; manage pinned tabs."
- **Small promo tile** (optional, for featuring): 440×280 PNG/JPEG.

## Before uploading

1. Rebuild the package so the zip contains the renamed manifest:
   `powershell -ExecutionPolicy Bypass -File build.ps1`
2. Upload `dist/ios-tab-switcher-v<version>.zip`.
3. Fill the fields above; add screenshots; set the privacy policy URL.
4. Expect the `<all_urls>` justification to get the most review attention — the text above
   states the technical reason (background captureVisibleTab) that reviewers look for.
