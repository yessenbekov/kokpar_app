import { DEFAULT_PLAYER_PROFILE, sanitizePlayerProfile } from "./playerProfile.js";

export const PROFILE_STORAGE_KEY = "kokpar.playerProfile.v1";

function browserStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createLocalProfileStore({ storageKey = PROFILE_STORAGE_KEY } = {}) {
  const store = {
    kind: "local",

    read() {
      const storage = browserStorage();
      if (!storage) return sanitizePlayerProfile(DEFAULT_PLAYER_PROFILE);

      try {
        const storedProfile = storage.getItem(storageKey);
        return sanitizePlayerProfile(storedProfile ? JSON.parse(storedProfile) : DEFAULT_PLAYER_PROFILE);
      } catch {
        return sanitizePlayerProfile(DEFAULT_PLAYER_PROFILE);
      }
    },

    save(profile) {
      const nextProfile = sanitizePlayerProfile(profile);
      const storage = browserStorage();

      try {
        storage?.setItem(storageKey, JSON.stringify(nextProfile));
      } catch {
        // Safari private mode can reject localStorage writes; the in-memory profile still works.
      }

      return nextProfile;
    },

    update(updater) {
      const currentProfile = store.read();
      const nextProfile = typeof updater === "function" ? updater(currentProfile) : updater;
      return store.save(nextProfile);
    }
  };

  return store;
}

export const playerProfileStore = createLocalProfileStore();
