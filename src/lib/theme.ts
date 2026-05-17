export type Theme = 'indigo' | 'emerald' | 'rose' | 'amber';

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('app-theme', theme);
}

export function getTheme(): Theme {
  const saved = localStorage.getItem('app-theme') as Theme;
  if (saved && ['indigo', 'emerald', 'rose', 'amber'].includes(saved)) {
    return saved;
  }
  return 'indigo';
}

export function initTheme() {
  setTheme(getTheme());
}
