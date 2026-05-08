/**
 * localStorage：统一使用 kanvas_app_*；
 * 依次从旧键 gold_app_*、gold_web_* 迁移并删除旧键。
 */
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

function safeGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function safeSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode 等 */
  }
}

function safeRemove(k) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** 新键无值时按顺序从旧键迁移；返回应采用的新键值（可能仍为空）。 */
function migrateChain(newKey, ...legacyKeys) {
  let v = safeGet(newKey);
  if (v != null && v !== '') return v;
  for (const k of legacyKeys) {
    const old = safeGet(k);
    if (old != null && old !== '') {
      safeSet(newKey, old);
      safeRemove(k);
      return old;
    }
  }
  return v;
}

const VALID_LANG = new Set(['zh', 'en']);
const VALID_THEME = new Set(['dark', 'light']);
const VALID_PAGE = new Set(['overview', 'backtest', 'spot', 'strategy', 'holdings', 'calc']);
/** 旧版侧边栏页 id → 当前 id（读入时迁移写入 kanvas_app_page） */
const LEGACY_PAGE_MAP = {
  settings: 'strategy',
  saved: 'strategy',
  records: 'strategy',
};

export function readLang(fallback) {
  const v = migrateChain(KEYS.lang, LEGACY_GOLD_APP.lang, LEGACY_WEB.lang);
  const raw = (v != null && v !== '' ? v : null) || fallback;
  return VALID_LANG.has(raw) ? raw : fallback;
}

export function writeLang(value) {
  const v = VALID_LANG.has(value) ? value : 'zh';
  safeSet(KEYS.lang, v);
  safeRemove(LEGACY_GOLD_APP.lang);
  safeRemove(LEGACY_WEB.lang);
}

export function readTheme(fallback) {
  const v = migrateChain(KEYS.theme, LEGACY_GOLD_APP.theme, LEGACY_WEB.theme);
  const raw = (v != null && v !== '' ? v : null) || fallback;
  return VALID_THEME.has(raw) ? raw : fallback;
}

export function writeTheme(value) {
  const v = VALID_THEME.has(value) ? value : 'dark';
  safeSet(KEYS.theme, v);
  safeRemove(LEGACY_GOLD_APP.theme);
  safeRemove(LEGACY_WEB.theme);
}

export function readPage(fallback) {
  const v = migrateChain(KEYS.page, LEGACY_GOLD_APP.page, LEGACY_WEB.page);
  let raw = (v != null && v !== '' ? v : null) || fallback;
  const mapped = LEGACY_PAGE_MAP[raw];
  if (mapped) {
    raw = mapped;
    safeSet(KEYS.page, raw);
  }
  return VALID_PAGE.has(raw) ? raw : fallback;
}

export function writePage(value) {
  const v = VALID_PAGE.has(value) ? value : 'overview';
  safeSet(KEYS.page, v);
  safeRemove(LEGACY_GOLD_APP.page);
  safeRemove(LEGACY_WEB.page);
}
