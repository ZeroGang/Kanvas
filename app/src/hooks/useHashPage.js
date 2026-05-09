import { useEffect, useState } from 'react';
import { readPage, writePage } from '../lib/storage.js';

const VALID_PAGES = new Set(['overview', 'spot', 'holdings', 'strategy', 'backtest']);
const LEGACY_PAGE_MAP = {
  calc: 'overview',
  settings: 'strategy',
  saved: 'strategy',
  records: 'strategy',
};

function normalizePage(value) {
  const raw = String(value || '').replace(/^#?\/?/, '') || readPage('overview');
  const mapped = LEGACY_PAGE_MAP[raw] || raw;
  return VALID_PAGES.has(mapped) ? mapped : 'overview';
}

function readHashPage() {
  return normalizePage(window.location.hash || readPage('overview'));
}

export function useHashPage() {
  const [page, setPageState] = useState(readHashPage);

  useEffect(() => {
    function handleHashChange() {
      setPageState(readHashPage());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function setPage(nextPage) {
    const normalized = normalizePage(nextPage);
    writePage(normalized);
    const nextHash = `#/${normalized}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
    setPageState(normalized);
  }

  useEffect(() => {
    writePage(page);
    const expectedHash = `#/${page}`;
    if (window.location.hash !== expectedHash) {
      window.history.replaceState(null, '', expectedHash);
    }
  }, [page]);

  return { page, setPage };
}
