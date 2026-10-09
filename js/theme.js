const THEME_STORAGE_KEY = 'color-scheme';
const DEFAULT_THEME = 'dark';
const THEMES = ['dark', 'light'];

const Theme = {
  get() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      return THEMES.includes(stored) ? stored : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  },

  set(choice) {
    Theme.store(choice);
    Theme.apply(choice);
  },

  store(choice) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
      return true;
    } catch {
      return false;
    }
  },

  apply(choice) {
    document.querySelector('meta[name="color-scheme"]').content = THEMES.includes(choice) ? choice : DEFAULT_THEME;
  },
};

window.addEventListener('storage', (event) => {
  if (event.key === THEME_STORAGE_KEY) {
    Theme.apply(event.newValue);
  }
});
