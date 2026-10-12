import type { StateStorage } from "zustand/middleware";
/** Preserve unreadable records until a successful read or explicit clear. */
export function recoverableBrowserStorage(
  storage: StateStorage,
  report: (message: string) => void,
) {
  let suspended = false;
  return {
    suspended: () => suspended,
    suspend: () => {
      suspended = true;
    },
    getItem: (name: string) => {
      try {
        const value = storage.getItem(name);
        suspended = false;
        return value;
      } catch {
        suspended = true;
        report(
          "Browser storage could not be read. Changes remain in this page; export a backup before closing.",
        );
        return null;
      }
    },
    setItem: (name: string, value: string) => {
      if (suspended) return;
      try {
        storage.setItem(name, value);
      } catch {
        report("Browser storage could not be saved. Export a backup before closing this page.");
      }
    },
    removeItem: (name: string) => {
      try {
        storage.removeItem(name);
        suspended = false;
      } catch {
        suspended = true;
        report("Browser storage could not be cleared.");
      }
    },
  };
}
