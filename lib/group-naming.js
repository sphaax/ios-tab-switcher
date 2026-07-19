// Nommage et coloration automatiques d'un nouveau groupe d'onglets.
//
// Tout est local et déterministe : aucune requête réseau, aucune donnée qui
// quitte l'appareil (c'est une garantie centrale de l'extension). La
// classification repose sur le domaine des onglets, comparé à une table de
// sites connus.
//
// Deux stratégies, dans l'ordre :
//   1. Tous les onglets viennent du même site      -> nom du site  (« YouTube »)
//   2. Tous appartiennent à la même catégorie      -> nom de la catégorie (« Work »)
// Sans certitude, on ne propose rien : Chrome laisse le groupe sans titre.

// Suffixes composés courants. Sans liste publique complète (trop lourde pour
// une extension), on couvre les plus fréquents pour extraire correctement le
// domaine enregistrable : bbc.co.uk -> bbc.co.uk, et non co.uk.
const MULTI_PART_TLDS = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'co.jp', 'com.au', 'net.au', 'com.br',
  'co.nz', 'co.in', 'com.mx', 'co.za', 'com.tr', 'com.cn', 'co.kr',
]);

export function registrableDomain(hostname) {
  const parts = hostname.replace(/^www\./, '').toLowerCase().split('.');
  if (parts.length <= 2) return parts.join('.');
  const lastTwo = parts.slice(-2).join('.');
  return MULTI_PART_TLDS.has(lastTwo) ? parts.slice(-3).join('.') : lastTwo;
}

// Casse correcte pour les sites où une simple capitalisation tomberait à côté
// (« YouTube » et non « Youtube », « GitHub » et non « Github »…).
const SITE_NAMES = {
  'youtube.com': 'YouTube', 'github.com': 'GitHub', 'gitlab.com': 'GitLab',
  'stackoverflow.com': 'Stack Overflow', 'linkedin.com': 'LinkedIn',
  'tiktok.com': 'TikTok', 'whatsapp.com': 'WhatsApp', 'paypal.com': 'PayPal',
  'ebay.com': 'eBay', 'aliexpress.com': 'AliExpress', 'wikipedia.org': 'Wikipedia',
  'openai.com': 'OpenAI', 'x.com': 'X', 'bbc.co.uk': 'BBC', 'bbc.com': 'BBC',
  'nytimes.com': 'NY Times', 'lemonde.fr': 'Le Monde', 'leboncoin.fr': 'Le Bon Coin',
  'primevideo.com': 'Prime Video', 'disneyplus.com': 'Disney+',
  'developer.mozilla.org': 'MDN', 'news.ycombinator.com': 'Hacker News',
};

// Catégories : domaines connus -> libellé (clé i18n) + couleur de groupe Chrome.
const CATEGORIES = [
  {
    key: 'work', labelKey: 'groupWork', color: 'blue',
    domains: ['docs.google.com', 'drive.google.com', 'sheets.google.com', 'slides.google.com',
      'calendar.google.com', 'mail.google.com', 'outlook.com', 'office.com', 'sharepoint.com',
      'slack.com', 'notion.so', 'atlassian.net', 'jira.com', 'asana.com', 'trello.com',
      'linear.app', 'monday.com', 'clickup.com', 'zoom.us', 'meet.google.com', 'teams.microsoft.com',
      'dropbox.com', 'airtable.com', 'basecamp.com'],
  },
  {
    key: 'dev', labelKey: 'groupDev', color: 'cyan',
    domains: ['github.com', 'gitlab.com', 'bitbucket.org', 'stackoverflow.com',
      'developer.mozilla.org', 'npmjs.com', 'dev.to', 'codepen.io', 'jsfiddle.net',
      'stackexchange.com', 'readthedocs.io', 'pypi.org', 'rust-lang.org', 'python.org',
      'nodejs.org', 'vercel.com', 'netlify.com', 'cloudflare.com', 'aws.amazon.com'],
  },
  {
    key: 'finance', labelKey: 'groupFinance', color: 'green',
    domains: ['paypal.com', 'stripe.com', 'wise.com', 'revolut.com', 'coinbase.com',
      'binance.com', 'kraken.com', 'tradingview.com', 'morningstar.com', 'boursorama.com',
      'credit-agricole.fr', 'labanquepostale.fr', 'societegenerale.fr', 'bnpparibas',
      'desjardins.com', 'rbcroyalbank.com', 'td.com', 'chase.com', 'americanexpress.com'],
  },
  {
    key: 'shopping', labelKey: 'groupShopping', color: 'orange',
    domains: ['amazon.com', 'amazon.fr', 'amazon.ca', 'amazon.co.uk', 'amazon.de',
      'ebay.com', 'ebay.fr', 'etsy.com', 'aliexpress.com', 'cdiscount.com', 'fnac.com',
      'leboncoin.fr', 'walmart.com', 'bestbuy.com', 'ikea.com', 'zalando.com', 'shein.com'],
  },
  {
    key: 'social', labelKey: 'groupSocial', color: 'pink',
    domains: ['facebook.com', 'messenger.com', 'instagram.com', 'twitter.com', 'x.com',
      'linkedin.com', 'reddit.com', 'tiktok.com', 'discord.com', 'whatsapp.com',
      'bsky.app', 'mastodon.social', 'snapchat.com', 'pinterest.com', 'telegram.org'],
  },
  {
    key: 'video', labelKey: 'groupVideo', color: 'red',
    domains: ['youtube.com', 'netflix.com', 'twitch.tv', 'vimeo.com', 'dailymotion.com',
      'primevideo.com', 'disneyplus.com', 'hulu.com', 'spotify.com', 'deezer.com',
      'soundcloud.com', 'crunchyroll.com', 'canalplus.com', 'arte.tv'],
  },
  {
    key: 'news', labelKey: 'groupNews', color: 'yellow',
    domains: ['bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'theguardian.com',
      'reuters.com', 'apnews.com', 'lemonde.fr', 'lefigaro.fr', 'liberation.fr',
      'franceinfo.fr', 'france24.com', 'lapresse.ca', 'radio-canada.ca',
      'news.ycombinator.com', 'techcrunch.com', 'theverge.com', 'arstechnica.com'],
  },
  {
    key: 'learning', labelKey: 'groupLearning', color: 'purple',
    domains: ['wikipedia.org', 'coursera.org', 'udemy.com', 'khanacademy.org',
      'openclassrooms.com', 'duolingo.com', 'edx.org', 'brilliant.org',
      'scholar.google.com', 'arxiv.org', 'jstor.org'],
  },
];

const CHROME_GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan', 'orange'];

// Domaines « parapluie » : un même domaine enregistrable y héberge des
// produits sans rapport (Gmail, Drive, Maps…). Pour eux, le nom du site ne
// veut rien dire — mieux vaut retomber sur la catégorie déduite des
// sous-domaines.
const UMBRELLA_DOMAINS = new Set(['google.com', 'microsoft.com', 'live.com', 'yahoo.com', 'apple.com']);

// La catégorisation se fait sur le HOSTNAME COMPLET, pas sur le domaine
// enregistrable : c'est le sous-domaine qui porte le sens pour des sites
// comme docs.google.com (travail) vs mail.google.com (travail) — alors que
// leur domaine enregistrable commun, google.com, n'est pas catégorisable.
function categoryForHostname(hostname) {
  return CATEGORIES.find((category) =>
    category.domains.some((known) => hostname === known || hostname.endsWith(`.${known}`))
  );
}

// Couleur stable dérivée du domaine : recréer un groupe pour le même site
// redonne toujours la même couleur (plus reconnaissable qu'un tirage aléatoire).
function colorForDomain(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  return CHROME_GROUP_COLORS[hash % CHROME_GROUP_COLORS.length];
}

function siteName(domain) {
  if (SITE_NAMES[domain]) return SITE_NAMES[domain];
  const label = domain.split('.')[0];
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Propose un titre et une couleur pour un nouveau groupe.
 * @param {Array<{url?: string, pendingUrl?: string}>} tabs
 * @param {(key: string) => string} translate  résolveur i18n pour les catégories
 * @returns {{title: string, color: string} | null}  null si aucune certitude
 */
export function suggestGroupIdentity(tabs, translate) {
  const hostnames = [];
  for (const tab of tabs) {
    const url = tab.url || tab.pendingUrl || '';
    if (!/^https?:\/\//i.test(url)) continue; // ignore chrome://, about:, file:…
    try {
      hostnames.push(new URL(url).hostname.replace(/^www\./, '').toLowerCase());
    } catch {
      // URL non analysable : on l'ignore simplement
    }
  }
  if (!hostnames.length) return null;

  const domains = hostnames.map(registrableDomain);
  const uniqueDomains = [...new Set(domains)];
  const categories = hostnames.map(categoryForHostname);
  const commonCategory =
    categories[0] && categories.every((c) => c && c.key === categories[0].key) ? categories[0] : null;

  // 1) Tous les onglets viennent du même site (hors domaines parapluie, où
  //    le nom du domaine ne dit rien de leur contenu réel).
  const sameSite = uniqueDomains.length === 1;
  if (sameSite && !UMBRELLA_DOMAINS.has(uniqueDomains[0])) {
    const domain = uniqueDomains[0];
    return {
      title: siteName(domain),
      color: commonCategory ? commonCategory.color : colorForDomain(domain),
    };
  }

  // 2) Catégorie commune (sites différents, ou sous-domaines d'un parapluie).
  if (commonCategory) {
    return { title: translate(commonCategory.labelKey), color: commonCategory.color };
  }

  // 3) Même parapluie sans catégorie commune : le nom du site reste le
  //    meilleur repère disponible.
  if (sameSite) {
    return { title: siteName(uniqueDomains[0]), color: colorForDomain(uniqueDomains[0]) };
  }

  return null; // rien de fiable : on laisse Chrome décider
}
