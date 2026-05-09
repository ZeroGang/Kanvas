import { useEffect, useState } from 'react';
import { readTheme, writeTheme } from '../lib/storage.js';

export function useTheme() {
  const [theme, setTheme] = useState(() => readTheme('dark'));

  useEffect(() => {
    document.body.dataset.theme = theme;
    writeTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  return { theme, toggleTheme };
}
