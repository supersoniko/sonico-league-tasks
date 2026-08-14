export function createTtlCache(ttlMs) {
  let entry = null;

  return {
    get() {
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        entry = null;
        return null;
      }
      return entry.value;
    },
    set(value) {
      entry = { value, expiresAt: Date.now() + ttlMs };
      return value;
    },
    clear() {
      entry = null;
    },
    ageMs() {
      if (!entry) return null;
      return Date.now() - (entry.expiresAt - ttlMs);
    },
  };
}
