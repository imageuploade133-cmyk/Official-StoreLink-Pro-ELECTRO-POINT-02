
export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from localStorage', e);
    }
  },
  clear: (): void => {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.clear();
    } catch (e) {
      console.error('Error clearing localStorage', e);
    }
  }
};

export const safeSessionStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined') return null;
      return window.sessionStorage.getItem(key);
    } catch (e) {
      console.error('Error reading from sessionStorage', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      console.error('Error writing to sessionStorage', e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.removeItem(key);
    } catch (e) {
      console.error('Error removing from sessionStorage', e);
    }
  },
  clear: (): void => {
    try {
      if (typeof window === 'undefined') return;
      window.sessionStorage.clear();
    } catch (e) {
      console.error('Error clearing sessionStorage', e);
    }
  }
};
