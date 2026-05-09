const LEGACY_GOLD_APP = {
  lang: 'gold_app_lang',
  theme: 'gold_app_theme',
  page: 'gold_app_page',
};

const LEGACY_WEB = {
  lang: 'gold_web_lang',
  theme: 'gold_web_theme',
  page: 'gold_web_page',
};

const KEYS = {
  lang: 'kanvas_app_lang',
  theme: 'kanvas_app_theme',
  page: 'kanvas_app_page',
};

const VALID_LANG = new Set(['zh', 'en']);
const VALID_THEME = new Set(['dark', 'light']);
const VALID_PAGE = new Set(['overview', 'backtest', 'spot', 'strategy', 'holdings']);
const LEGACY_PAGE_MAP = {
  calc: 'overview',
  settings: 'strategy',
  saved: 'strategy',
  records: 'strategy',
};

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function migrateChain(newKey, ...legacyKeys) {
  const value = safeGet(newKey);
  if (value != null && value !== '') return value;

  for (const legacyKey of legacyKeys) {
    const oldValue = safeGet(legacyKey);
    if (oldValue != null && oldValue !== '') {
      safeSet(newKey, oldValue);
      safeRemove(legacyKey);
      return oldValue;
    }
  }

  return value;
}

export function readLang(fallback = 'zh') {
  const value = migrateChain(KEYS.lang, LEGACY_GOLD_APP.lang, LEGACY_WEB.lang);
  const raw = (value != null && value !== '' ? value : null) || fallback;
  return VALID_LANG.has(raw) ? raw : fallback;
}

export function writeLang(value) {
  const next = VALID_LANG.has(value) ? value : 'zh';
  safeSet(KEYS.lang, next);
  safeRemove(LEGACY_GOLD_APP.lang);
  safeRemove(LEGACY_WEB.lang);
}

export function readTheme(fallback = 'dark') {
  const value = migrateChain(KEYS.theme, LEGACY_GOLD_APP.theme, LEGACY_WEB.theme);
  const raw = (value != null && value !== '' ? value : null) || fallback;
  return VALID_THEME.has(raw) ? raw : fallback;
}

export function writeTheme(value) {
  const next = VALID_THEME.has(value) ? value : 'dark';
  safeSet(KEYS.theme, next);
  safeRemove(LEGACY_GOLD_APP.theme);
  safeRemove(LEGACY_WEB.theme);
}

export function readPage(fallback = 'overview') {
  const value = migrateChain(KEYS.page, LEGACY_GOLD_APP.page, LEGACY_WEB.page);
  let raw = (value != null && value !== '' ? value : null) || fallback;
  raw = LEGACY_PAGE_MAP[raw] || raw;
  if (VALID_PAGE.has(raw)) {
    safeSet(KEYS.page, raw);
    return raw;
  }
  return fallback;
}

export function writePage(value) {
  const mapped = LEGACY_PAGE_MAP[value] || value;
  const next = VALID_PAGE.has(mapped) ? mapped : 'overview';
  safeSet(KEYS.page, next);
  safeRemove(LEGACY_GOLD_APP.page);
  safeRemove(LEGACY_WEB.page);
}
