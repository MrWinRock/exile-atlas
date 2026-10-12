import { create } from "zustand";
import { z } from "zod";
import { recoverableBrowserStorage } from "./browser-storage";
export type LibraryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};
export const localLibraryStorage: LibraryStorage = {
  getItem: (key) => (typeof window !== "undefined" ? localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (typeof window !== "undefined") localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window !== "undefined") localStorage.removeItem(key);
  },
};
export function createLocalLibrary<T extends { id: string; name: string }>(
  key: string,
  format: string,
  schema: z.ZodType<T>,
  storage: LibraryStorage = localLibraryStorage,
) {
  type State = {
    records: T[];
    warning: string;
    loaded: boolean;
    save: (record: T) => string;
    remove: (id: string) => void;
    duplicate: (id: string) => void;
    importJson: (text: string) => void;
    exportJson: () => string;
    load: () => void;
    clear: () => void;
  };
  const envelope = z
    .object({ format: z.literal(format), version: z.literal(1), records: z.array(schema).max(100) })
    .strict();
  const store = create<State>((set, get) => {
    const safe = recoverableBrowserStorage(storage, (message) => set({ warning: message }));
    const serialize = (records: T[]) => {
      const text = JSON.stringify(envelope.parse({ format, version: 1, records }), null, 2);
      if (new TextEncoder().encode(text).length > 1048576)
        throw new Error("Library data must be at most 1 MiB");
      return text;
    };
    const commit = (records: T[]) => {
      const text = serialize(records);
      set({ records });
      safe.setItem(key, text);
    };
    return {
      records: [],
      warning: "",
      loaded: false,
      save: (record) => {
        const r = schema.parse(record);
        const records = get().records.filter((v) => v.id !== r.id);
        if (records.length >= 100) throw new Error("Library holds at most 100 records");
        commit([r, ...records]);
        return r.id;
      },
      remove: (id) => commit(get().records.filter((r) => r.id !== id)),
      duplicate: (id) => {
        const record = get().records.find((r) => r.id === id);
        if (!record) throw new Error("Record unavailable");
        get().save({
          ...structuredClone(record),
          id: crypto.randomUUID(),
          name: record.name.slice(0, 112) + " (copy)",
        });
      },
      importJson: (text) => {
        if (new TextEncoder().encode(text).length > 1048576)
          throw new Error("Imports must be at most 1 MiB");
        const parsed = envelope.parse(JSON.parse(text));
        if (parsed.records.length + get().records.length > 100)
          throw new Error("Library holds at most 100 records");
        const fresh = parsed.records.map((r) => ({ ...r, id: crypto.randomUUID() }));
        commit([...get().records, ...fresh]);
      },
      exportJson: () => serialize(get().records),
      load: () => {
        if (get().loaded) return;
        try {
          const text = safe.getItem(key);
          if (typeof text === "string") {
            if (new TextEncoder().encode(text).length > 1048576)
              throw new Error("Oversized library");
            set({ records: envelope.parse(JSON.parse(text)).records });
          }
          set({ loaded: true });
        } catch {
          safe.suspend();
          set({
            loaded: true,
            warning:
              "Unreadable saved library preserved. Export current memory before closing; clear only when you want to discard the damaged data.",
          });
        }
      },
      clear: () => {
        safe.removeItem(key);
        set({ records: [], warning: safe.suspended() ? get().warning : "" });
      },
    };
  });
  return store;
}
