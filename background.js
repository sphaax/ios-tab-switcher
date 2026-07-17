// Service worker : capture des miniatures + ouverture du switcher.

import { putThumb, deleteThumb, keepOnly } from './lib/thumbs.js';

const SWITCHER_URL = chrome.runtime.getURL('switcher.html');
// Les aperçus sont en paysage 2:1, proche de la zone visible d'une fenêtre
// desktop maximisée (pleine largeur, hauteur réduite par la barre des tâches
// et l'UI de Chrome) : recadrage sur ce ratio AVANT de redimensionner, pour
// que chaque pixel stocké soit un pixel affiché (sinon : flou) et que la page
// remplisse la carte sans rogner les bords.
const THUMB_WIDTH = 512;
const THUMB_HEIGHT = 256;
const JPEG_QUALITY = 0.7;
const CAPTURE_THROTTLE_MS = 1000;
// Petit délai avant capture pour laisser la page finir de peindre.
const CAPTURE_SETTLE_MS = 200;

const lastCaptureAt = new Map(); // tabId -> timestamp
const pendingCapture = new Set(); // tabIds avec une capture programmée

function isCapturable(url) {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

async function captureTab(tabId) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return; // onglet fermé entre-temps
  }
  if (!tab.active || !isCapturable(tab.url)) return;

  let dataUrl;
  try {
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'jpeg',
      quality: 80,
    });
  } catch {
    return; // quota dépassé, fenêtre fermée, page protégée…
  }

  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);

  // Recadrage "cover" au ratio 2:1 : tranche centrale si la source est plus
  // large, partie haute si elle est plus étroite.
  const targetAspect = THUMB_WIDTH / THUMB_HEIGHT;
  let cropWidth = bitmap.width;
  let cropHeight = bitmap.height;
  let sx = 0;
  const sy = 0;
  if (bitmap.width / bitmap.height > targetAspect) {
    cropWidth = Math.round(bitmap.height * targetAspect);
    sx = Math.round((bitmap.width - cropWidth) / 2);
  } else {
    cropHeight = Math.round(bitmap.width / targetAspect);
  }

  // Jamais d'upscale : si la tranche source est plus petite que la cible,
  // on garde sa taille native.
  const width = Math.min(THUMB_WIDTH, cropWidth);
  const height = Math.round(width / targetAspect);
  const canvas = new OffscreenCanvas(width, height);
  canvas.getContext('2d').drawImage(bitmap, sx, sy, cropWidth, cropHeight, 0, 0, width, height);
  bitmap.close();
  const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: JPEG_QUALITY });

  if (tab.incognito) {
    // Vie privée : les miniatures incognito ne touchent jamais le disque.
    // storage.session est en mémoire et vidé à la fermeture de Chrome.
    await chrome.storage.session.set({
      [`incog-${tabId}`]: { url: tab.url, ts: Date.now(), dataUrl: await blobToDataUrl(jpeg) },
    });
  } else {
    await putThumb({ tabId, url: tab.url, ts: Date.now(), blob: jpeg });
  }
  chrome.runtime.sendMessage({ type: 'thumb-updated', tabId }).catch(() => {});
}

// FileReader n'existe pas dans un service worker : conversion manuelle,
// par blocs pour ne pas faire déborder la pile de String.fromCharCode.
async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

function scheduleCapture(tabId) {
  if (pendingCapture.has(tabId)) return;
  const elapsed = Date.now() - (lastCaptureAt.get(tabId) || 0);
  const delay = Math.max(CAPTURE_SETTLE_MS, CAPTURE_THROTTLE_MS - elapsed);
  pendingCapture.add(tabId);
  setTimeout(async () => {
    pendingCapture.delete(tabId);
    lastCaptureAt.set(tabId, Date.now());
    await captureTab(tabId);
  }, delay);
}

// --- Suivi du dernier onglet actif par fenêtre (hors switcher) ---
// Quand le switcher s'ouvre, c'est lui l'onglet actif de sa fenêtre ; on
// mémorise donc le précédent pour pouvoir surligner la bonne carte.

async function rememberActive(tabId, windowId) {
  const { lastActive = {} } = await chrome.storage.session.get('lastActive');
  lastActive[windowId] = tabId;
  await chrome.storage.session.set({ lastActive });
}

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  let tab = null;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }
  const url = tab.url || tab.pendingUrl || '';
  if (!url.startsWith(SWITCHER_URL)) {
    await rememberActive(tabId, windowId);
  }
  scheduleCapture(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    scheduleCapture(tabId);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  const [tab] = await chrome.tabs.query({ active: true, windowId });
  if (tab) scheduleCapture(tab.id);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  lastCaptureAt.delete(tabId);
  deleteThumb(tabId).catch(() => {});
  chrome.storage.session.remove(`incog-${tabId}`).catch(() => {});
});

// Sweep : purge les miniatures des onglets qui n'existent plus.
async function cleanupThumbs() {
  const tabs = await chrome.tabs.query({});
  await keepOnly(tabs.map((t) => t.id)).catch(() => {});
}
chrome.runtime.onStartup.addListener(cleanupThumbs);
chrome.runtime.onInstalled.addListener(cleanupThumbs);

// --- Ouverture du switcher (instance unique) ---

async function openSwitcher(sourceTab) {
  // L'onglet d'où l'extension a été appelée (fourni par l'événement,
  // sinon retrouvé via la dernière fenêtre focus).
  const current =
    sourceTab || (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];

  // Toggle : si le switcher est déjà l'onglet actif, le raccourci le referme
  // et rend la main à l'onglet d'où il avait été ouvert.
  if (current?.url?.startsWith(SWITCHER_URL)) {
    await closeSwitcherTab(current);
    return;
  }

  if (current) {
    // Mémorise l'onglet source : surbrillance de la carte active, retour de
    // focus à la fermeture, et démarrage en mode privé si besoin.
    await chrome.storage.session.set({
      switcherSource: { tabId: current.id, windowId: current.windowId },
    });
    // Capture fraîche de l'onglet courant avant de le masquer.
    lastCaptureAt.set(current.id, Date.now());
    await captureTab(current.id);
  }

  // Les pages d'extension ne peuvent pas s'afficher dans une fenêtre privée
  // (mode incognito "spanning"). Depuis une fenêtre privée, on ouvre donc le
  // switcher dans une fenêtre normale : il démarrera sur le mode privé et
  // rendra le focus à la fenêtre privée à la fermeture.
  let targetWindowId = current?.windowId;
  if (current?.incognito) {
    const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
    targetWindowId = windows.find((w) => !w.incognito)?.id;
  }

  const existing = await chrome.tabs.query({ url: SWITCHER_URL });
  const sameWindow =
    targetWindowId != null
      ? existing.find((t) => t.windowId === targetWindowId)
      : existing[0];

  let keptId;
  if (sameWindow) {
    keptId = sameWindow.id;
    await chrome.tabs.update(sameWindow.id, { active: true });
    await chrome.windows.update(sameWindow.windowId, { focused: true });
  } else if (targetWindowId != null) {
    try {
      const created = await chrome.tabs.create({ url: SWITCHER_URL, windowId: targetWindowId });
      await chrome.windows.update(targetWindowId, { focused: true });
      keptId = created.id;
    } catch {
      keptId = await createSwitcherWindow();
    }
  } else {
    // Aucune fenêtre normale disponible (que des fenêtres privées).
    keptId = await createSwitcherWindow();
  }

  // Instance unique : ferme les switchers restés ouverts dans d'autres fenêtres.
  const staleIds = existing.filter((t) => t.id !== keptId).map((t) => t.id);
  if (staleIds.length) chrome.tabs.remove(staleIds).catch(() => {});
}

async function createSwitcherWindow() {
  const win = await chrome.windows.create({ url: SWITCHER_URL, focused: true });
  return win.tabs?.[0]?.id;
}

// Referme le switcher en rendant le focus à l'onglet source (ou à défaut au
// dernier onglet actif de la fenêtre du switcher).
async function closeSwitcherTab(switcherTab) {
  const { switcherSource, lastActive = {} } = await chrome.storage.session.get([
    'switcherSource',
    'lastActive',
  ]);
  const candidates = [];
  if (switcherSource?.tabId != null) candidates.push(switcherSource);
  if (lastActive[switcherTab.windowId] != null) {
    candidates.push({ tabId: lastActive[switcherTab.windowId], windowId: switcherTab.windowId });
  }
  for (const candidate of candidates) {
    try {
      await chrome.tabs.update(candidate.tabId, { active: true });
      if (candidate.windowId !== switcherTab.windowId) {
        await chrome.windows.update(candidate.windowId, { focused: true });
      }
      break;
    } catch {
      // onglet fermé entre-temps : on essaie le candidat suivant
    }
  }
  await chrome.tabs.remove(switcherTab.id).catch(() => {});
}

chrome.action.onClicked.addListener((tab) => openSwitcher(tab));
chrome.commands.onCommand.addListener((command, tab) => {
  if (command === 'open-switcher') openSwitcher(tab);
});
