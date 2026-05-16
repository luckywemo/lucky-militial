// Safe localStorage wrapper to prevent crashes in iframes (like MiniPay Site Tester)
// when third-party cookies/storage are blocked by the browser.

export const storage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
    } catch (e) {
      console.warn('[Storage] Access denied to localStorage (iframe/incognito)', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn('[Storage] Failed to save to localStorage', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn('[Storage] Failed to remove from localStorage', e);
    }
  }
};
