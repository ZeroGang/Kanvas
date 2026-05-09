import { useMemo, useState } from 'react';
import { readLang, writeLang } from '../lib/storage.js';
import { translate } from '../lib/i18n.js';

export function useI18n() {
  const defaultLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
  const [lang, setLang] = useState(() => readLang(defaultLang));

  function toggleLang() {
    setLang((current) => {
      const next = current === 'zh' ? 'en' : 'zh';
      writeLang(next);
      return next;
    });
  }

  const t = useMemo(() => (key) => translate(lang, key), [lang]);

  return { lang, toggleLang, t };
}
