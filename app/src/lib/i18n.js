import { I18N } from './i18n-data.js';

export { I18N };

export function translate(lang, key) {
  return (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
}
