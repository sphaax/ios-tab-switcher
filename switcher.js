// Page switcher : trois modes (onglets / navigation privée / groupes)
// + vue détail d'un groupe, calqués sur Chrome iOS.

import { getAllThumbs } from './lib/thumbs.js';

// Palette officielle des groupes d'onglets Chrome.
const GROUP_COLORS = {
  grey: '#5f6368',
  blue: '#1a73e8',
  red: '#d93025',
  yellow: '#f9ab00',
  green: '#188038',
  pink: '#d01884',
  purple: '#a142f4',
  cyan: '#007b83',
  orange: '#fa903e',
};

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

let mode = 'tabs'; // 'tabs' | 'incognito' | 'groups'
let sourceTabId = null; // l'onglet depuis lequel le switcher a été ouvert
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

// Une seule carte est marquée active : l'onglet depuis lequel le switcher
// a été appelé (mémorisé par le service worker à l'ouverture). En repli,
// le dernier onglet actif de la fenêtre du switcher.
function isTabActive(tab, lastActive) {
  if (sourceTabId != null) return tab.id === sourceTabId;
  return tab.windowId === selfTab.windowId && tab.id === lastActive[selfTab.windowId];
}

function buildCard(tab, { thumbSrc, isActive, groupColor, index, variant }) {
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

  card.querySelector('.card-title').textContent = tab.title || pageUrl || 'Nouvel onglet';

  const preview = card.querySelector('.card-preview');
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
  card.querySelector('.card-close').addEventListener('click', (event) => {
    event.stopPropagation();
    chrome.tabs.remove(tab.id);
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

function renderCards(tabs, { thumbSrcFor, lastActive, groupColorById, variant }) {
  const entries = tabs.map((tab) => ({ tab, isActive: isTabActive(tab, lastActive) }));
  // La cascade d'apparition rayonne depuis la carte active (centrée à
  // l'écran après le scroll initial), pas depuis le coin haut-gauche.
  const activeIndex = Math.max(0, entries.findIndex((e) => e.isActive));

  const fragment = document.createDocumentFragment();
  for (const [index, { tab, isActive }] of entries.entries()) {
    fragment.appendChild(
      buildCard(tab, {
        thumbSrc: thumbSrcFor(tab),
        isActive,
        groupColor:
          groupColorById && tab.groupId !== -1 ? groupColorById.get(tab.groupId) : null,
        index: Math.abs(index - activeIndex),
        variant,
      })
    );
  }
  grid.replaceChildren(fragment);

  knownTabIds.clear();
  for (const tab of tabs) knownTabIds.add(tab.id);

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
  renderCards(normalTabs, {
    thumbSrcFor: (tab) => thumbSrcFromBlob(tab.id, thumbs.get(tab.id)),
    lastActive: session.lastActive || {},
    groupColorById,
  });
}

async function renderIncognito(incognitoTabs, stale) {
  if (!incognitoTabs.length) {
    const allowed = await chrome.extension.isAllowedIncognitoAccess();
    if (stale()) return;
    showEmpty(
      'incognito',
      "Les onglets de navigation privée s'afficheront ici",
      allowed
        ? 'Pour naviguer sur le Web en mode privé, ajoutez un onglet'
        : "Autorisez d'abord l'extension en navigation privée : chrome://extensions → iOS Tab Switcher → Détails → « Autoriser en mode navigation privée »"
    );
    return;
  }
  const store = await chrome.storage.session.get(null);
  if (stale()) return;
  renderCards(incognitoTabs, {
    thumbSrcFor: (tab) => store[`incog-${tab.id}`]?.dataUrl || null,
    lastActive: store.lastActive || {},
    variant: 'incog',
  });
}

async function renderGroupsList(stale) {
  const groups = await chrome.tabGroups.query({});
  if (stale()) return;
  if (!groups.length) {
    showEmpty(
      'groups',
      "Vos groupes d'onglets s'afficheront ici",
      'Regroupez des onglets dans Chrome (clic droit sur un onglet → « Ajouter l’onglet à un nouveau groupe ») ou créez-en un avec le bouton +.'
    );
    return;
  }

  const rows = await Promise.all(
    groups.map(async (group) => {
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
      name.textContent = group.title || 'Groupe sans nom';
      nameRow.append(dot, name);
      const sub = document.createElement('div');
      sub.className = 'group-sub';
      sub.textContent = tabs.length > 1 ? `${tabs.length} onglets` : '1 onglet';
      meta.append(nameRow, sub);

      row.append(mini, meta);
      row.addEventListener('click', () => {
        openGroupId = group.id;
        refresh();
      });
      return row;
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
  renderCards(tabs, {
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
