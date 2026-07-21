// Page switcher : trois modes (onglets / navigation privée / groupes)
// + vue détail d'un groupe, calqués sur Chrome iOS.

import { getAllThumbs } from './lib/thumbs.js';
import {
  suggestGroupIdentity,
  dominantChromeColorFromPixels,
  GROUP_COLORS,
} from './lib/group-naming.js';

// --- i18n : chaînes dans _locales/, langue de l'UI de Chrome ---
const t = (key, substitutions) => chrome.i18n.getMessage(key, substitutions);

document.documentElement.lang = chrome.i18n.getUILanguage();
document.title = t('pageTitle');
for (const el of document.querySelectorAll('[data-i18n-title]')) {
  el.title = t(el.dataset.i18nTitle);
}
for (const el of document.querySelectorAll('[data-i18n-placeholder]')) {
  el.placeholder = t(el.dataset.i18nPlaceholder);
}
for (const el of document.querySelectorAll('[data-i18n-text]')) {
  el.textContent = t(el.dataset.i18nText);
}

// Lien de soutien (Ko-fi). Remplace l'URL si ton handle diffère.
const SUPPORT_URL = 'https://ko-fi.com/sphaax';
document.getElementById('support-link').href = SUPPORT_URL;

const EMPTY_ICONS = {
  incognito: `
    <svg viewBox="0 0 120 120" width="110" height="110" fill="none" aria-hidden="true">
      <rect x="38" y="22" width="44" height="76" rx="10" stroke="#8ab4f8" stroke-width="4"/>
      <path d="M52 56c-3 0-5.5 2.5-5.5 5.5S49 67 52 67s5.5-2.5 5.5-5.5S55 56 52 56zm16 0c-3 0-5.5 2.5-5.5 5.5S65 67 68 67s5.5-2.5 5.5-5.5S71 56 68 56zM76 52H44v2.5h32zM66.5 42.5c-.2-.4-.7-.6-1.1-.5l-5.4 1.8-5.4-1.8c-.5-.1-1 .1-1.1.5L50 51h20z" fill="#9aa0a6"/>
      <path d="M30 44c-6 4-8 12-3 16M90 76c6-4 8-12 3-16" stroke="#5f6368" stroke-width="3" stroke-linecap="round" stroke-dasharray="6 7"/>
      <path d="M28 72l8 4-8 4z" fill="#5f6368"/>
      <circle cx="92" cy="50" r="3.5" fill="#5f6368"/>
    </svg>`,
  groups: `
    <svg viewBox="0 0 120 120" width="110" height="110" fill="none" aria-hidden="true">
      <rect x="42" y="14" width="64" height="44" rx="16" fill="#1c3f94"/>
      <rect x="14" y="60" width="60" height="44" rx="16" fill="#1c3f94"/>
      <rect x="34" y="26" width="56" height="72" rx="12" stroke="#c8dafc" stroke-width="3.5"/>
      <rect x="41" y="35" width="19" height="25" rx="4" stroke="#c8dafc" stroke-width="3"/>
      <rect x="64" y="35" width="19" height="25" rx="4" stroke="#c8dafc" stroke-width="3"/>
      <rect x="41" y="64" width="19" height="25" rx="4" stroke="#c8dafc" stroke-width="3"/>
      <rect x="64" y="64" width="19" height="25" rx="4" stroke="#c8dafc" stroke-width="3"/>
    </svg>`,
};

// Icône du badge épingle (épingler au survol / désépingler).
const PIN_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z"/>' +
  '</svg>';
// Icônes haut-parleur du badge audio (mêmes glyphes que la barre d'onglets).
const SPEAKER_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>' +
  '</svg>';
const SPEAKER_MUTED_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
  '<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z"/>' +
  '</svg>';

const grid = document.getElementById('grid');
const groupsList = document.getElementById('groups-list');
const emptyState = document.getElementById('empty-state');
const emptyIcon = document.getElementById('empty-icon');
const emptyTitle = document.getElementById('empty-title');
const emptySubtitle = document.getElementById('empty-subtitle');
const detailBar = document.getElementById('detail-bar');
const detailDot = document.getElementById('detail-dot');
const detailName = document.getElementById('detail-name');
const colorPicker = document.getElementById('color-picker');
const tabCountEl = document.getElementById('tab-count');
const newTabBtn = document.getElementById('new-tab-btn');
const cardTemplate = document.getElementById('card-template');

const modeButtons = {
  incognito: document.getElementById('mode-incognito'),
  tabs: document.getElementById('mode-tabs'),
  groups: document.getElementById('mode-groups'),
};
const sep1 = document.getElementById('sep-1');
const sep2 = document.getElementById('sep-2');

const searchInput = document.getElementById('search-input');
const duplicatesPill = document.getElementById('duplicates-pill');
const duplicatesCountEl = document.getElementById('duplicates-count');
const duplicatesCloseBtn = document.getElementById('duplicates-close-btn');

let mode = 'tabs'; // 'tabs' | 'incognito' | 'groups'
let searchQuery = ''; // filtre live sur titre/URL
let duplicatesOnly = false; // n'afficher que les onglets en double (URL exacte)
let duplicateGroups = new Map(); // url -> tabs[] : dernier calcul, pour le filtre et "Fermer les doublons"
let sourceTabId = null; // l'onglet depuis lequel le switcher a été ouvert
let sourceWindowId = null; // sa fenêtre : affichée en premier dans la grille
let openGroupId = null; // groupe affiché en vue détail
let openGroupTitle = ''; // titre au moment du rendu, pour détecter un changement
let editingName = false; // gèle les re-renders pendant la saisie du nom
let selfTab = null; // l'onglet du switcher lui-même
let firstRender = true;
const knownTabIds = new Set(); // cartes déjà affichées : pas d'animation d'entrée
// tabId -> { ts, url } : object URL mis en cache tant que la miniature n'a pas
// changé, pour que les re-renders ne re-décodent pas toutes les images (flash).
const objectUrls = new Map();

function faviconUrl(pageUrl, size = 32) {
  const url = new URL(chrome.runtime.getURL('/_favicon/'));
  url.searchParams.set('pageUrl', pageUrl);
  url.searchParams.set('size', String(size));
  return url.toString();
}

function releaseObjectUrl(tabId) {
  const cached = objectUrls.get(tabId);
  if (cached) {
    URL.revokeObjectURL(cached.url);
    objectUrls.delete(tabId);
  }
}

function matchesSearch(tab) {
  if (!searchQuery) return true;
  const query = searchQuery.toLowerCase();
  return (
    (tab.title || '').toLowerCase().includes(query) ||
    (tab.url || tab.pendingUrl || '').toLowerCase().includes(query)
  );
}

// ---------- Détection des onglets en double (URL exacte) ----------

function computeDuplicateGroups(tabs) {
  const groups = new Map();
  for (const tab of tabs) {
    const url = tab.url || tab.pendingUrl || '';
    if (!url) continue;
    if (!groups.has(url)) groups.set(url, []);
    groups.get(url).push(tab);
  }
  for (const [url, list] of groups) {
    if (list.length < 2) groups.delete(url);
  }
  return groups;
}

// Affichage court d'une URL pour l'en-tête de section ("exemple.com/page").
function shortenUrl(url) {
  let display = url;
  try {
    const u = new URL(url);
    display = u.hostname + (u.pathname === '/' ? '' : u.pathname);
  } catch {
    // URL non standard (data:, chrome://…) : affichée telle quelle
  }
  return display.length > 46 ? `${display.slice(0, 45)}…` : display;
}

// Une section par URL en double, dans l'ordre de détection.
function buildDuplicateSections() {
  return [...duplicateGroups.entries()].map(([url, list]) => ({
    label: `${shortenUrl(url)} · ${t('manyTabs', [String(list.length)])}`,
    tabs: list,
    contiguousGroups: false, // pas d'adjacence réelle : pas de bords de groupe à calculer
  }));
}

// Recalcule les doublons à partir de la liste (non filtrée par la recherche)
// et met à jour la pilule. Si le filtre était actif et qu'il ne reste plus
// de doublon, on en sort pour ne pas rester bloqué sur une vue vide.
function updateDuplicatesPill(tabs) {
  duplicateGroups = computeDuplicateGroups(tabs);
  const dupCount = [...duplicateGroups.values()].reduce((sum, list) => sum + list.length, 0);
  if (dupCount === 0) {
    duplicatesOnly = false;
    duplicatesPill.hidden = true;
    duplicatesCloseBtn.hidden = true;
    return;
  }
  duplicatesPill.hidden = false;
  duplicatesPill.classList.toggle('active', duplicatesOnly);
  duplicatesPill.title = t(duplicatesOnly ? 'showAllTabs' : 'showDuplicates');
  duplicatesCountEl.textContent = t('duplicatesCount', [String(dupCount)]);
  duplicatesCloseBtn.hidden = !duplicatesOnly;
}

// Ferme tous les doublons sauf un par groupe : garde en priorité un onglet
// épinglé, sinon l'onglet source du switcher, sinon le premier (ordre natif).
async function closeDuplicates() {
  const toClose = [];
  for (const list of duplicateGroups.values()) {
    const keep = list.find((tab) => tab.pinned) || list.find((tab) => tab.id === sourceTabId) || list[0];
    toClose.push(...list.filter((tab) => tab.id !== keep.id).map((tab) => tab.id));
  }
  if (toClose.length) await chrome.tabs.remove(toClose);
}

// ---------- Drag & drop : réordonner les onglets ----------

let dragTab = null; // l'onglet en cours de glissement
let isDraggingCard = false; // gèle les re-renders pendant le drag
// Après fermeture d'une carte au clavier (Suppr), l'onglet fermé n'existe
// plus au rendu suivant : ceci indique la carte voisine à focaliser à la
// place, pour que la navigation reste sur place plutôt que de sauter à
// l'onglet actif ou en tête de grille.
let pendingFocusTabId = null;

function clearDropMarkers() {
  for (const el of grid.querySelectorAll('.drop-before, .drop-after, .drop-group')) {
    el.classList.remove('drop-before', 'drop-after', 'drop-group');
  }
}

// Une cible est valide si elle respecte les invariants de Chrome : les
// épinglés ne se réordonnent qu'entre eux (zone fixe en tête, comme la
// vraie barre d'onglets), un groupe reste contigu (un onglet extérieur
// ne peut viser que les bords d'un groupe).
function isValidDropTarget(refTab, groupFirst, groupLast, after) {
  if (!dragTab || refTab.id === dragTab.id) return false;
  if (refTab.pinned !== dragTab.pinned) return false;
  if (refTab.incognito !== dragTab.incognito) return false;
  if (refTab.groupId !== -1 && refTab.groupId !== dragTab.groupId) {
    if (!after && !groupFirst) return false;
    if (after && !groupLast) return false;
  }
  return true;
}

// Déplace l'onglet glissé avant/après l'onglet de référence. Les index
// sont résolus au moment du drop (ils ont pu bouger pendant le drag).
async function performDrop(dragTabId, refTabId, placeAfter) {
  try {
    let drag = await chrome.tabs.get(dragTabId);
    let ref = await chrome.tabs.get(refTabId);
    // Lâché hors de son groupe : on en sort d'abord (l'ungroup peut
    // décaler les index, donc on relit les deux onglets).
    if (drag.groupId !== -1 && drag.groupId !== ref.groupId) {
      await chrome.tabs.ungroup(dragTabId);
      [drag, ref] = await Promise.all([chrome.tabs.get(dragTabId), chrome.tabs.get(refTabId)]);
    }
    // chrome.tabs.move attend la position FINALE : en avançant dans la
    // même fenêtre, le retrait de l'onglet décale la cible de 1.
    let index = ref.index + (placeAfter ? 1 : 0);
    if (drag.windowId === ref.windowId && drag.index < index) index -= 1;
    await chrome.tabs.move(dragTabId, { windowId: ref.windowId, index });
  } catch {
    // onglet fermé pendant le drag : le refresh remettra l'état réel
  }
}

// Déposer au centre d'une carte (plutôt que sur un bord) groupe l'onglet
// glissé avec l'onglet visé : les épinglés ne peuvent pas être groupés
// (comme dans Chrome), et un onglet déjà dans le même groupe que la
// cible n'a nulle part où aller.
function isValidGroupTarget(refTab) {
  if (!dragTab || refTab.id === dragTab.id) return false;
  if (dragTab.pinned || refTab.pinned) return false;
  if (refTab.incognito !== dragTab.incognito) return false;
  if (dragTab.groupId !== -1 && dragTab.groupId === refTab.groupId) return false;
  return true;
}

// Ajoute l'onglet glissé au groupe de la cible, ou crée un nouveau groupe
// contenant les deux si la cible n'est pas encore groupée. Chrome retire
// automatiquement l'onglet de son groupe précédent le cas échéant.
// Couleur de groupe déduite du favicon d'un site. L'API _favicon est servie
// par notre propre origine (chrome-extension://) : le canvas n'est donc pas
// « tainted » et ses pixels restent lisibles.
async function dominantFaviconColor(pageUrl) {
  try {
    const response = await fetch(faviconUrl(pageUrl, 32));
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    bitmap.close();
    return dominantChromeColorFromPixels(data);
  } catch {
    return null; // favicon absent/illisible : on garde la couleur déjà choisie
  }
}

async function performGroupDrop(dragTabId, refTabId) {
  try {
    const ref = await chrome.tabs.get(refTabId);
    if (ref.groupId !== -1) {
      await chrome.tabs.group({ tabIds: dragTabId, groupId: ref.groupId });
      return;
    }
    const drag = await chrome.tabs.get(dragTabId);
    const groupId = await chrome.tabs.group({
      tabIds: [dragTabId, ref.id],
      createProperties: { windowId: ref.windowId },
    });
    // Nouveau groupe : on lui propose un nom et une couleur déduits des deux
    // onglets. Sans certitude, on ne touche à rien (groupe sans titre, comme
    // le ferait Chrome) — le nom reste éditable depuis la pilule de titre.
    const identity = suggestGroupIdentity([drag, ref], t);
    if (!identity) return;
    const { title, color, sameSite } = identity;
    // Onglets d'un même site : la couleur de marque du favicon est plus
    // parlante que celle de notre table (bleu Facebook plutôt que rose social).
    let finalColor = color;
    if (sameSite) {
      const brandColor = await dominantFaviconColor(ref.url || ref.pendingUrl || drag.url);
      if (brandColor) finalColor = brandColor;
    }
    await chrome.tabGroups.update(groupId, { title, color: finalColor });
  } catch {
    // onglet fermé pendant le drag : le refresh remettra l'état réel
  }
}

// Une seule carte est marquée active : l'onglet depuis lequel le switcher
// a été appelé (mémorisé par le service worker à l'ouverture). En repli,
// le dernier onglet actif de la fenêtre du switcher.
function isTabActive(tab, lastActive) {
  if (sourceTabId != null) return tab.id === sourceTabId;
  return tab.windowId === selfTab.windowId && tab.id === lastActive[selfTab.windowId];
}

function buildCard(tab, { thumbSrc, isActive, groupColor, index, variant, groupFirst, groupLast }) {
  const card = cardTemplate.content.firstElementChild.cloneNode(true);
  card.dataset.tabId = String(tab.id);
  if (variant) card.classList.add(variant);
  if (knownTabIds.has(tab.id)) {
    card.style.animation = 'none';
  } else if (firstRender) {
    // Apparition en cascade au premier rendu (plafonnée pour les grosses grilles).
    card.style.animationDelay = `${Math.min(index * 40, 600)}ms`;
  }
  if (isActive) card.classList.add('is-active');
  if (groupColor) {
    card.classList.add('in-group');
    card.style.setProperty('--group-color', groupColor);
  }

  const pageUrl = tab.url || tab.pendingUrl || '';
  const favicon = card.querySelector('.card-favicon');
  if (pageUrl) {
    favicon.src = faviconUrl(pageUrl);
  } else {
    favicon.hidden = true;
  }

  card.querySelector('.card-title').textContent = tab.title || pageUrl || t('newTab');

  const preview = card.querySelector('.card-preview');
  if (tab.pinned) {
    const badge = document.createElement('button');
    badge.className = 'pin-badge is-pinned';
    badge.title = t('unpinTab');
    badge.innerHTML = PIN_SVG;
    badge.addEventListener('click', (event) => {
      event.stopPropagation();
      chrome.tabs.update(tab.id, { pinned: false });
    });
    preview.appendChild(badge);
  } else if (tab.groupId !== -1) {
    // Chrome interdit qu'un onglet soit à la fois épinglé et groupé : cet
    // emplacement (haut-gauche) est donc sans conflit avec le badge épingle.
    // Utile surtout dans la vue détail d'un groupe, où toutes les cartes
    // partagent le même groupe : le drag n'y a aucune cible pour dégrouper.
    const badge = document.createElement('button');
    badge.className = 'ungroup-badge';
    badge.title = t('ungroupTab');
    badge.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>' +
      '</svg>';
    badge.addEventListener('click', (event) => {
      event.stopPropagation();
      chrome.tabs.ungroup(tab.id);
    });
    preview.appendChild(badge);
  } else {
    // Ni épinglé ni groupé : même emplacement, mais le badge n'apparaît qu'au
    // survol (ou au focus clavier de la carte) — il propose d'épingler.
    const badge = document.createElement('button');
    badge.className = 'pin-badge on-hover';
    badge.title = t('pinTab');
    badge.innerHTML = PIN_SVG;
    badge.addEventListener('click', (event) => {
      event.stopPropagation();
      chrome.tabs.update(tab.id, { pinned: true });
    });
    preview.appendChild(badge);
  }
  // Onglet qui émet du son (ou coupé) : badge haut-parleur, clic = muet/actif.
  const muted = !!tab.mutedInfo?.muted;
  if (tab.audible || muted) {
    const audio = document.createElement('button');
    audio.className = 'audio-badge';
    audio.title = t(muted ? 'unmuteTab' : 'muteTab');
    audio.innerHTML = muted ? SPEAKER_MUTED_SVG : SPEAKER_SVG;
    audio.addEventListener('click', (event) => {
      event.stopPropagation();
      chrome.tabs.update(tab.id, { muted: !muted });
    });
    preview.appendChild(audio);
  }
  if (thumbSrc) {
    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = thumbSrc;
    preview.appendChild(img);
  } else {
    const fallback = document.createElement('div');
    fallback.className = 'fallback';
    const big = document.createElement('img');
    big.src = pageUrl ? faviconUrl(pageUrl, 64) : '';
    big.alt = '';
    fallback.appendChild(big);
    preview.appendChild(fallback);
  }

  card.addEventListener('click', () => activateTab(tab));
  card.querySelector('.card-close').title = t('closeTab');
  card.querySelector('.card-close').addEventListener('click', (event) => {
    event.stopPropagation();
    chrome.tabs.remove(tab.id);
  });

  // --- Réordonnancement par glisser-déposer ---
  // Les épinglés se réordonnent entre eux (voir isValidDropTarget) ;
  // désactivé pendant une recherche (les index d'insertion seraient
  // ambigus sur une liste filtrée).
  const canDrag = !searchQuery;
  card.draggable = canDrag;
  if (canDrag) {
    card.addEventListener('dragstart', (event) => {
      dragTab = tab;
      isDraggingCard = true;
      document.body.classList.add('card-drag');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(tab.id));
      requestAnimationFrame(() => card.classList.add('dragging'));
    });
    card.addEventListener('dragend', () => {
      dragTab = null;
      isDraggingCard = false;
      document.body.classList.remove('card-drag');
      card.classList.remove('dragging');
      clearDropMarkers();
      refresh();
    });
  }

  // Bords de carte (25 % chacun) = réordonner ; centre (50 %) = grouper —
  // même logique que la barre d'onglets native de Chrome.
  const DROP_EDGE_RATIO = 0.25;
  const dropZone = (event) => {
    const rect = card.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    if (ratio < DROP_EDGE_RATIO) return 'before';
    if (ratio > 1 - DROP_EDGE_RATIO) return 'after';
    return 'group';
  };
  card.addEventListener('dragover', (event) => {
    const zone = dropZone(event);
    if (zone === 'group') {
      if (!isValidGroupTarget(tab)) {
        clearDropMarkers();
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      clearDropMarkers();
      card.classList.add('drop-group');
      return;
    }
    const after = zone === 'after';
    if (!isValidDropTarget(tab, groupFirst, groupLast, after)) {
      clearDropMarkers();
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    clearDropMarkers();
    card.classList.add(after ? 'drop-after' : 'drop-before');
  });
  card.addEventListener('dragleave', () => {
    card.classList.remove('drop-before', 'drop-after', 'drop-group');
  });
  card.addEventListener('drop', (event) => {
    const zone = dropZone(event);
    if (zone === 'group') {
      if (!isValidGroupTarget(tab)) return;
      event.preventDefault();
      performGroupDrop(dragTab.id, tab.id);
      return;
    }
    const after = zone === 'after';
    if (!isValidDropTarget(tab, groupFirst, groupLast, after)) return;
    event.preventDefault();
    performDrop(dragTab.id, tab.id, after);
  });

  return card;
}

function showEmpty(iconKey, title, subtitle) {
  grid.replaceChildren();
  emptyIcon.innerHTML = EMPTY_ICONS[iconKey];
  emptyTitle.textContent = title;
  emptySubtitle.textContent = subtitle;
  emptyState.hidden = false;
}

function thumbSrcFromBlob(tabId, record) {
  if (!record) return null;
  const cached = objectUrls.get(tabId);
  if (cached && cached.ts === record.ts) return cached.url;
  if (cached) URL.revokeObjectURL(cached.url);
  const url = URL.createObjectURL(record.blob);
  objectUrls.set(tabId, { ts: record.ts, url });
  return url;
}

// ---------- Rendu des vues ----------

// `sections` (optionnel) : liste précalculée de { label, tabs, contiguousGroups }
// — utilisée par la vue doublons (groupée par URL). Par défaut, sectionnement
// par fenêtre Chrome (la fenêtre d'origine d'abord ; à fenêtre unique, pas
// d'en-tête — grille plate).
function renderCards(tabs, { thumbSrcFor, lastActive, groupColorById, variant, sections }) {
  let sectionList = sections;
  if (!sectionList) {
    const primaryWindowId = sourceWindowId ?? selfTab.windowId;
    const windowIds = [...new Set(tabs.map((t) => t.windowId))].sort((a, b) => {
      if (a === primaryWindowId) return -1;
      if (b === primaryWindowId) return 1;
      return a - b;
    });
    const multiWindow = windowIds.length > 1;
    sectionList = windowIds.map((windowId, windowIndex) => {
      const windowTabs = tabs.filter((tab) => tab.windowId === windowId);
      const name =
        windowId === primaryWindowId ? t('thisWindow') : t('windowTitle', [String(windowIndex + 1)]);
      const count = windowTabs.length > 1 ? t('manyTabs', [String(windowTabs.length)]) : t('oneTab');
      return { label: multiWindow ? `${name} · ${count}` : null, tabs: windowTabs, contiguousGroups: true };
    });
  }

  const orderedTabs = sectionList.flatMap((s) => s.tabs);
  const isActiveMap = new Map(orderedTabs.map((tab) => [tab.id, isTabActive(tab, lastActive)]));
  // La cascade d'apparition rayonne depuis la carte active (centrée à
  // l'écran après le scroll initial), pas depuis le coin haut-gauche.
  const activeIndex = Math.max(0, orderedTabs.findIndex((tab) => isActiveMap.get(tab.id)));

  const fragment = document.createDocumentFragment();
  let index = 0;
  for (const section of sectionList) {
    if (section.label) {
      const label = document.createElement('h2');
      label.className = 'window-label';
      label.textContent = section.label;
      fragment.appendChild(label);
    }
    section.tabs.forEach((tab, position) => {
      // Bords de groupe : seuls points d'insertion valides pour un onglet
      // extérieur au groupe (un groupe reste contigu). N'a de sens que si
      // l'ordre de la section reflète l'adjacence réelle des onglets (pas
      // le cas de la vue doublons, groupée par URL).
      const prevTab = section.contiguousGroups ? section.tabs[position - 1] : null;
      const nextTab = section.contiguousGroups ? section.tabs[position + 1] : null;
      fragment.appendChild(
        buildCard(tab, {
          thumbSrc: thumbSrcFor(tab),
          isActive: isActiveMap.get(tab.id),
          groupColor:
            groupColorById && tab.groupId !== -1 ? groupColorById.get(tab.groupId) : null,
          index: Math.abs(index - activeIndex),
          variant,
          groupFirst: tab.groupId !== -1 && prevTab?.groupId !== tab.groupId,
          groupLast: tab.groupId !== -1 && nextTab?.groupId !== tab.groupId,
        })
      );
      index++;
    });
  }

  // Les cartes sont entièrement recréées à chaque rendu (replaceChildren) :
  // sans ça, le focus clavier serait perdu à chaque rafraîchissement en
  // temps réel. On capture l'état AVANT le remplacement. Si la carte
  // focalisée vient d'être fermée (Suppr), elle a déjà été retirée du DOM à
  // ce stade (removeCardWithAnimation) : le navigateur a alors déjà rendu le
  // focus à <body> tout seul, donc `hadGridFocus` lira faux — c'est pour ça
  // que pendingFocusTabId (posé AVANT la fermeture) est un signal séparé,
  // qui doit lui aussi déclencher la restauration.
  // On ne teste que la carte elle-même, pas ses descendants : un clic sur un
  // badge (épingle, dégrouper, son, fermer) focalise le bouton, qui n'a pas de
  // data-tab-id — on retomberait alors sur la carte active et on lui donnerait
  // un focus qu'elle n'a jamais demandé (badge de survol révélé à tort).
  const hadGridFocus = document.activeElement?.classList.contains('card');
  const focusedTabId = hadGridFocus ? document.activeElement.dataset.tabId : null;
  const shouldRestoreFocus = hadGridFocus || pendingFocusTabId != null;

  grid.replaceChildren(fragment);

  knownTabIds.clear();
  for (const tab of orderedTabs) knownTabIds.add(tab.id);

  // Roving tabindex (une seule carte dans l'ordre de tabulation) : priorité
  // à la carte voisine désignée après une fermeture au clavier, sinon on
  // restaure le focus sur la même carte si la grille l'avait déjà, sinon on
  // désigne simplement la carte active comme point d'entrée pour la
  // prochaine navigation aux flèches (sans lui donner le focus DOM).
  const focusTarget =
    (pendingFocusTabId != null && grid.querySelector(`[data-tab-id="${pendingFocusTabId}"]`)) ||
    (focusedTabId != null && grid.querySelector(`[data-tab-id="${focusedTabId}"]`)) ||
    grid.querySelector('.card.is-active') ||
    grid.querySelector('.card');
  pendingFocusTabId = null; // consommé, ne doit pas persister au-delà de ce rendu
  if (focusTarget) {
    focusTarget.tabIndex = 0;
    if (shouldRestoreFocus) focusTarget.focus({ preventScroll: true });
  }

  if (firstRender) {
    firstRender = false;
    grid.querySelector('.card.is-active')?.scrollIntoView({ block: 'center' });
  }
}

async function renderTabs(normalTabs, stale) {
  const [groups, thumbs, session] = await Promise.all([
    chrome.tabGroups.query({}),
    getAllThumbs(),
    chrome.storage.session.get('lastActive'),
  ]);
  if (stale()) return;
  const groupColorById = new Map(groups.map((g) => [g.id, GROUP_COLORS[g.color] || '#5f6368']));

  updateDuplicatesPill(normalTabs);
  const sections = duplicatesOnly ? buildDuplicateSections() : undefined;
  const shown = duplicatesOnly ? sections.flatMap((s) => s.tabs) : normalTabs.filter(matchesSearch);
  renderCards(shown, {
    thumbSrcFor: (tab) => thumbSrcFromBlob(tab.id, thumbs.get(tab.id)),
    lastActive: session.lastActive || {},
    groupColorById,
    sections,
  });
}

async function renderIncognito(incognitoTabs, stale) {
  if (!incognitoTabs.length) {
    const allowed = await chrome.extension.isAllowedIncognitoAccess();
    if (stale()) return;
    duplicatesPill.hidden = true;
    duplicatesCloseBtn.hidden = true;
    showEmpty(
      'incognito',
      t('emptyPrivateTitle'),
      allowed ? t('emptyPrivateSubtitle') : t('emptyPrivateNoAccess')
    );
    return;
  }
  const store = await chrome.storage.session.get(null);
  if (stale()) return;

  updateDuplicatesPill(incognitoTabs);
  const sections = duplicatesOnly ? buildDuplicateSections() : undefined;
  const shown = duplicatesOnly ? sections.flatMap((s) => s.tabs) : incognitoTabs.filter(matchesSearch);
  renderCards(shown, {
    thumbSrcFor: (tab) => store[`incog-${tab.id}`]?.dataUrl || null,
    lastActive: store.lastActive || {},
    variant: 'incog',
    sections,
  });
}

// Dissout un groupe : dégroupe tous ses onglets d'un coup (ils restent
// ouverts). Le groupe cesse d'exister une fois vide. Non destructif, donc
// pas de confirmation — comme le « Dissoudre le groupe » natif de Chrome.
async function dissolveGroup(groupId) {
  try {
    const tabs = await chrome.tabs.query({ groupId });
    if (tabs.length) await chrome.tabs.ungroup(tabs.map((tab) => tab.id));
  } catch {
    // groupe déjà disparu entre-temps : le refresh remettra l'état réel
  }
}

async function renderGroupsList(stale) {
  const groups = await chrome.tabGroups.query({});
  if (stale()) return;
  if (!groups.length) {
    showEmpty('groups', t('emptyGroupsTitle'), t('emptyGroupsSubtitle'));
    return;
  }

  const visibleGroups = searchQuery
    ? groups.filter((g) =>
        (g.title || t('unnamedGroup')).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  const rows = await Promise.all(
    visibleGroups.map(async (group) => {
      const tabs = await chrome.tabs.query({ groupId: group.id });
      const row = document.createElement('button');
      row.className = 'group-row';
      row.dataset.groupId = String(group.id);

      const mini = document.createElement('div');
      mini.className = 'group-mini';
      for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        const tab = tabs[i];
        const pageUrl = tab ? tab.url || tab.pendingUrl || '' : '';
        if (pageUrl) {
          const img = document.createElement('img');
          img.src = faviconUrl(pageUrl);
          img.alt = '';
          slot.appendChild(img);
        }
        mini.appendChild(slot);
      }

      const meta = document.createElement('div');
      meta.className = 'group-meta';
      const nameRow = document.createElement('div');
      nameRow.className = 'group-name-row';
      const dot = document.createElement('span');
      dot.className = 'group-dot';
      dot.style.background = GROUP_COLORS[group.color] || '#5f6368';
      const name = document.createElement('span');
      name.className = 'group-name';
      name.textContent = group.title || t('unnamedGroup');
      nameRow.append(dot, name);
      const sub = document.createElement('div');
      sub.className = 'group-sub';
      sub.textContent = tabs.length > 1 ? t('manyTabs', [String(tabs.length)]) : t('oneTab');
      meta.append(nameRow, sub);

      row.append(mini, meta);
      row.addEventListener('click', () => {
        openGroupId = group.id;
        refresh();
      });

      const dissolve = document.createElement('button');
      dissolve.className = 'group-dissolve';
      dissolve.title = t('dissolveGroup');
      dissolve.innerHTML =
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>' +
        '</svg>';
      dissolve.addEventListener('click', async (event) => {
        event.stopPropagation();
        await dissolveGroup(group.id);
        refresh();
      });

      // Conteneur : les deux boutons sont frères (pas de <button> imbriqué).
      const wrap = document.createElement('div');
      wrap.className = 'group-row-wrap';
      wrap.append(row, dissolve);
      return wrap;
    })
  );
  if (stale()) return;
  grid.replaceChildren();
  groupsList.replaceChildren(...rows);
  groupsList.hidden = false;
}

async function renderGroupDetail(stale) {
  let group;
  try {
    group = await chrome.tabGroups.get(openGroupId);
  } catch {
    openGroupId = null;
    return renderGroupsList(stale);
  }
  if (stale()) return;

  const base = GROUP_COLORS[group.color] || '#5f6368';
  document.body.style.setProperty('--group-base', base);
  detailDot.style.background = base;
  detailName.value = group.title || '';
  detailName.style.width = `${Math.max(8, (group.title || '').length + 2)}ch`;
  openGroupTitle = group.title || '';
  for (const swatch of colorPicker.children) {
    swatch.classList.toggle('current', swatch.dataset.color === group.color);
  }
  detailBar.hidden = false;

  const [tabs, thumbs, session] = await Promise.all([
    chrome.tabs.query({ groupId: openGroupId }),
    getAllThumbs(),
    chrome.storage.session.get('lastActive'),
  ]);
  if (stale()) return;
  renderCards(tabs.filter(matchesSearch), {
    thumbSrcFor: (tab) => thumbSrcFromBlob(tab.id, thumbs.get(tab.id)),
    lastActive: session.lastActive || {},
    variant: 'tinted',
  });
}

// ---------- Orchestration ----------

function updateTopbar() {
  for (const [key, btn] of Object.entries(modeButtons)) {
    btn.classList.toggle('active', key === mode);
  }
  // Séparateur visible uniquement entre deux segments inactifs adjacents.
  sep1.hidden = mode !== 'groups';
  sep2.hidden = mode !== 'incognito';
}

// Jeton de génération : les événements Chrome arrivent en rafale et chaque
// refresh fait plusieurs await ; sans garde, un vieux rendu qui termine ses
// requêtes en retard écrirait dans le DOM par-dessus un rendu plus récent.
let renderSeq = 0;

async function refresh() {
  if (editingName) return; // ne pas écraser le champ pendant la saisie
  if (isDraggingCard) return; // ne pas reconstruire la grille pendant un drag
  const seq = ++renderSeq;
  const stale = () => seq !== renderSeq;

  if (!selfTab) selfTab = await chrome.tabs.getCurrent();

  const allTabs = await chrome.tabs.query({ windowType: 'normal' });
  if (stale()) return;
  const normalTabs = allTabs.filter((t) => !t.incognito && t.id !== selfTab.id);
  const incognitoTabs = allTabs.filter((t) => t.incognito && t.id !== selfTab.id);
  tabCountEl.textContent = String(normalTabs.length);

  // Ne PAS vider la grille ici : elle serait vide pendant les await des
  // renderers, la hauteur de page s'effondrerait et le scroll reviendrait
  // en haut à chaque re-render. Chaque vue remplace son contenu d'un bloc.
  updateTopbar();
  groupsList.hidden = true;
  emptyState.hidden = true;
  detailBar.hidden = true;
  colorPicker.hidden = true;
  duplicatesPill.hidden = true;
  duplicatesCloseBtn.hidden = true;

  if (mode === 'tabs') {
    await renderTabs(normalTabs, stale);
  } else if (mode === 'incognito') {
    await renderIncognito(incognitoTabs, stale);
  } else if (openGroupId == null) {
    await renderGroupsList(stale);
  } else {
    await renderGroupDetail(stale);
  }
  if (stale()) return;

  document.body.dataset.view =
    mode === 'groups' && openGroupId != null ? 'group-detail' : mode;
}

async function activateTab(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  if (selfTab) chrome.tabs.remove(selfTab.id);
}

function removeCardWithAnimation(tabId) {
  const card = grid.querySelector(`[data-tab-id="${tabId}"]`);
  if (!card || card.classList.contains('closing')) {
    scheduleRefresh();
    return;
  }
  card.classList.add('closing');
  const done = () => {
    card.remove();
    refresh();
  };
  card.addEventListener('transitionend', done, { once: true });
  setTimeout(done, 300); // filet de sécurité si transitionend ne vient pas
}

async function closeSwitcher() {
  const me = selfTab || (await chrome.tabs.getCurrent());
  const { switcherSource, lastActive = {} } = await chrome.storage.session.get([
    'switcherSource',
    'lastActive',
  ]);
  const candidates = [];
  if (switcherSource?.tabId != null) candidates.push(switcherSource);
  if (lastActive[me.windowId] != null) {
    candidates.push({ tabId: lastActive[me.windowId], windowId: me.windowId });
  }
  for (const candidate of candidates) {
    try {
      await chrome.tabs.update(candidate.tabId, { active: true });
      if (candidate.windowId !== me.windowId) {
        await chrome.windows.update(candidate.windowId, { focused: true });
      }
      break;
    } catch {
      // onglet fermé entre-temps : on essaie le candidat suivant
    }
  }
  chrome.tabs.remove(me.id);
}

// ---------- Interactions ----------

modeButtons.incognito.addEventListener('click', () => {
  mode = 'incognito';
  openGroupId = null;
  refresh();
});
modeButtons.tabs.addEventListener('click', () => {
  mode = 'tabs';
  openGroupId = null;
  refresh();
});
modeButtons.groups.addEventListener('click', () => {
  mode = 'groups';
  openGroupId = null;
  refresh();
});

// Dissoudre le groupe affiché, puis revenir à la liste (il n'existe plus).
document.getElementById('detail-ungroup').addEventListener('click', async () => {
  if (openGroupId == null) return;
  await dissolveGroup(openGroupId);
  openGroupId = null;
  refresh();
});

document.getElementById('detail-close').addEventListener('click', () => {
  openGroupId = null;
  refresh();
});

// --- Édition du groupe (nom + couleur) depuis la pilule ---

for (const [colorKey, hex] of Object.entries(GROUP_COLORS)) {
  const swatch = document.createElement('button');
  swatch.className = 'swatch';
  swatch.dataset.color = colorKey;
  swatch.style.background = hex;
  swatch.title = colorKey;
  swatch.addEventListener('click', async () => {
    colorPicker.hidden = true;
    if (openGroupId == null) return;
    try {
      await chrome.tabGroups.update(openGroupId, { color: colorKey });
    } catch {
      // groupe disparu entre-temps : le prochain refresh remettra la liste
    }
    // tabGroups.onUpdated déclenche le refresh qui re-teinte tout
  });
  colorPicker.appendChild(swatch);
}

detailDot.addEventListener('click', (event) => {
  event.stopPropagation();
  colorPicker.hidden = !colorPicker.hidden;
});

// Clic ailleurs : referme la palette.
document.addEventListener('click', (event) => {
  if (!colorPicker.hidden && !colorPicker.contains(event.target)) {
    colorPicker.hidden = true;
  }
});

async function commitGroupName() {
  if (openGroupId == null) return;
  const title = detailName.value.trim();
  if (title === openGroupTitle) return;
  try {
    await chrome.tabGroups.update(openGroupId, { title });
    openGroupTitle = title;
  } catch {
    // groupe disparu entre-temps
  }
}

detailName.addEventListener('focus', () => {
  editingName = true;
});

detailName.addEventListener('blur', async () => {
  editingName = false;
  await commitGroupName();
  scheduleRefresh();
});

detailName.addEventListener('input', () => {
  detailName.style.width = `${Math.max(8, detailName.value.length + 2)}ch`;
});

detailName.addEventListener('keydown', (event) => {
  event.stopPropagation(); // ne pas déclencher le Échap global pendant la saisie
  if (event.key === 'Enter') {
    detailName.blur(); // blur => commit
  } else if (event.key === 'Escape') {
    detailName.value = openGroupTitle; // annule la saisie en cours
    detailName.blur();
  }
});

// --- Recherche d'onglet ---

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value.trim();
  // Taper, c'est chercher : ça prend le pas sur le filtre doublons pour
  // éviter un état ambigu (groupe partiellement affiché par la recherche).
  if (searchQuery && duplicatesOnly) duplicatesOnly = false;
  scheduleRefresh();
});

searchInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    // Ouvre le premier résultat (carte, ou groupe en mode liste).
    const first = grid.querySelector('.card') || groupsList.querySelector('.group-row');
    first?.click();
  } else if (event.key === 'Escape' && searchInput.value) {
    // Échap avec du texte : efface la recherche (sans fermer le switcher).
    event.stopPropagation();
    searchInput.value = '';
    searchQuery = '';
    scheduleRefresh();
  }
});

// --- Onglets en double ---

duplicatesPill.addEventListener('click', () => {
  duplicatesOnly = !duplicatesOnly;
  refresh();
});

duplicatesCloseBtn.addEventListener('click', async (event) => {
  event.stopPropagation();
  await closeDuplicates();
});

// Taper au clavier n'importe où remplit directement la recherche.
document.addEventListener('keydown', (event) => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key.length !== 1) return; // ignore les touches non imprimables
  const active = document.activeElement;
  if (active === searchInput || active === detailName) return;
  // Espace sur une carte survolée au clavier = l'activer (rôle "button"),
  // pas démarrer une recherche par un espace.
  if (event.key === ' ' && active?.closest('.card')) return;
  searchInput.focus(); // le caractère de cet appui ira dans le champ
});

// --- Navigation clavier dans la grille ---

// Repère la carte la plus proche dans la direction demandée, par géométrie
// réelle du DOM : fonctionne quel que soit le nombre de colonnes de la
// grille responsive, et saute naturellement les en-têtes de section (ce ne
// sont pas des .card).
function findCardInDirection(fromCard, direction) {
  const from = fromCard.getBoundingClientRect();
  const fromCenter = { x: from.left + from.width / 2, y: from.top + from.height / 2 };

  let best = null;
  let bestScore = Infinity;
  for (const card of grid.querySelectorAll('.card')) {
    if (card === fromCard) continue;
    const r = card.getBoundingClientRect();
    const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    const dx = center.x - fromCenter.x;
    const dy = center.y - fromCenter.y;
    let primary;
    let perpendicular;
    if (direction === 'right') {
      if (dx <= 4) continue;
      primary = dx;
      perpendicular = dy;
    } else if (direction === 'left') {
      if (dx >= -4) continue;
      primary = -dx;
      perpendicular = dy;
    } else if (direction === 'down') {
      if (dy <= 4) continue;
      primary = dy;
      perpendicular = dx;
    } else {
      if (dy >= -4) continue;
      primary = -dy;
      perpendicular = dx;
    }
    // Favorise l'alignement sur l'axe perpendiculaire, puis la proximité.
    const score = primary + Math.abs(perpendicular) * 2;
    if (score < bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

function focusCard(card) {
  for (const el of grid.querySelectorAll('.card[tabindex="0"]')) el.tabIndex = -1;
  card.tabIndex = 0;
  card.focus();
}

const ARROW_DIRECTIONS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

document.addEventListener('keydown', (event) => {
  const direction = ARROW_DIRECTIONS[event.key];
  if (!direction) return;
  if (document.activeElement === searchInput || document.activeElement === detailName) return;
  const current =
    document.activeElement?.closest('.card') ||
    grid.querySelector('.card[tabindex="0"]') ||
    grid.querySelector('.card');
  if (!current) return;
  const next = findCardInDirection(current, direction);
  if (!next) return;
  event.preventDefault(); // empêche le défilement natif de la page via les flèches
  focusCard(next);
});

// Entrée/Espace active la carte qui a le focus clavier. Géré explicitement
// (plutôt que de compter sur le comportement implicite de role="button")
// pour rester certain du résultat et réutiliser le listener 'click' déjà
// posé sur la carte dans buildCard.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  if (document.activeElement === searchInput || document.activeElement === detailName) return;
  const card = document.activeElement?.closest('.card');
  if (!card) return;
  event.preventDefault(); // la barre d'espace ne doit pas faire défiler la page
  card.click();
});

// Suppr ferme la carte qui a le focus clavier — même action que son bouton
// X (réutilisé pour rester sur un seul chemin de fermeture).
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Delete') return;
  if (document.activeElement === searchInput || document.activeElement === detailName) return;
  const card = document.activeElement?.closest('.card');
  if (!card) return;
  event.preventDefault();
  // La carte fermée n'existera plus au prochain rendu : on désigne sa
  // voisine (suivante, sinon précédente) pour que le focus reste sur place
  // au lieu de sauter loin dans la grille.
  const neighbor =
    (card.nextElementSibling?.classList.contains('card') && card.nextElementSibling) ||
    (card.previousElementSibling?.classList.contains('card') && card.previousElementSibling);
  pendingFocusTabId = neighbor ? neighbor.dataset.tabId : null;
  card.querySelector('.card-close').click();
});

// Échap : sort de la vue détail, sinon ferme le switcher.
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (openGroupId != null) {
    openGroupId = null;
    refresh();
    return;
  }
  closeSwitcher();
});

newTabBtn.addEventListener('click', async () => {
  const me = selfTab || (await chrome.tabs.getCurrent());

  if (mode === 'incognito') {
    // Nouvel onglet dans une fenêtre privée existante, sinon nouvelle fenêtre.
    try {
      const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
      const incogWindow = windows.find((w) => w.incognito);
      if (incogWindow) {
        await chrome.tabs.create({ windowId: incogWindow.id, active: true });
        await chrome.windows.update(incogWindow.id, { focused: true });
      } else {
        await chrome.windows.create({ incognito: true, focused: true });
      }
      chrome.tabs.remove(me.id);
    } catch {
      // accès incognito non autorisé : l'état vide explique la marche à suivre
      refresh();
    }
    return;
  }

  if (mode === 'groups' && openGroupId == null) {
    // Nouveau groupe Chrome : un onglet frais, groupé, sans quitter le switcher.
    const tab = await chrome.tabs.create({ windowId: me.windowId, active: false });
    await chrome.tabs.group({ tabIds: tab.id });
    return;
  }

  if (mode === 'groups') {
    // Ajoute un onglet au groupe ouvert et bascule dessus.
    const group = await chrome.tabGroups.get(openGroupId);
    const tab = await chrome.tabs.create({ windowId: group.windowId, active: true });
    await chrome.tabs.group({ tabIds: tab.id, groupId: openGroupId });
    await chrome.windows.update(group.windowId, { focused: true });
    chrome.tabs.remove(me.id);
    return;
  }

  await chrome.tabs.create({ windowId: me.windowId, active: true });
  chrome.tabs.remove(me.id);
});

// ---------- Mises à jour en temps réel ----------

let refreshTimer = null;
function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, 120);
}

chrome.tabs.onCreated.addListener(scheduleRefresh);
chrome.tabs.onUpdated.addListener(scheduleRefresh);
chrome.tabs.onMoved.addListener(scheduleRefresh);
chrome.tabs.onAttached.addListener(scheduleRefresh);
chrome.tabs.onDetached.addListener(scheduleRefresh);
chrome.tabs.onActivated.addListener(scheduleRefresh);
chrome.tabs.onRemoved.addListener((tabId) => {
  releaseObjectUrl(tabId);
  removeCardWithAnimation(tabId);
});
chrome.tabGroups.onCreated.addListener(scheduleRefresh);
chrome.tabGroups.onUpdated.addListener(scheduleRefresh);
chrome.tabGroups.onRemoved.addListener(scheduleRefresh);
chrome.tabGroups.onMoved.addListener(scheduleRefresh);

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'thumb-updated') scheduleRefresh();
});

// Initialisation : retrouve l'onglet source (surbrillance + retour de focus),
// et démarre sur le mode privé si le switcher a été appelé depuis une
// fenêtre de navigation privée.
(async () => {
  selfTab = await chrome.tabs.getCurrent();
  const { switcherSource } = await chrome.storage.session.get('switcherSource');
  sourceTabId = switcherSource?.tabId ?? null;
  sourceWindowId = switcherSource?.windowId ?? null;
  if (sourceTabId != null) {
    try {
      const source = await chrome.tabs.get(sourceTabId);
      if (source.incognito) mode = 'incognito';
    } catch {
      sourceTabId = null; // onglet source déjà fermé
    }
  }
  refresh();
})();
