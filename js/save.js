(function () {
  "use strict";

  const config = window.GAME_CONFIG;

  if (!config) {
    throw new Error("save.js requiere que config.js se cargue primero.");
  }

  const SAVE_VERSION = Number.isSafeInteger(config.saveVersion) ? config.saveVersion : 1;
  const SAVE_KEY = config.saveKey || "lucioLootboxClicker.save.v1";
  const COLLECTION_IDS = Object.freeze((config.collectionOrder || []).slice());
  const STAT_KEYS = Object.freeze([
    "totalTaps",
    "backpacksOpened",
    "totalMantecasEarned",
    "totalMantecasSpent",
  ]);
  const MAX_VALUE = Number.MAX_SAFE_INTEGER;

  let lastError = null;

  function isObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function toSafeInteger(value, fallback) {
    const numeric = typeof value === "string" && value.trim() !== "" ? Number(value) : value;

    if (!Number.isFinite(numeric) || numeric < 0) return fallback;
    return Math.min(MAX_VALUE, Math.floor(numeric));
  }

  function createCounts() {
    return Object.fromEntries(COLLECTION_IDS.map((id) => [id, 0]));
  }

  function createStats() {
    return Object.fromEntries(STAT_KEYS.map((key) => [key, 0]));
  }

  function createDefault() {
    return {
      saveVersion: SAVE_VERSION,
      mantecas: 0,
      counts: createCounts(),
      stats: createStats(),
    };
  }

  function readVersion(source) {
    return toSafeInteger(source.saveVersion ?? source.version, 0);
  }

  function migrateLegacy(source) {
    const migrated = Object.assign({}, source);

    migrated.mantecas = source.mantecas ?? source.currency ?? source.butter ?? 0;
    migrated.counts = source.counts ?? source.collection ?? source.lucios ?? source;
    migrated.stats = source.stats ?? {
      totalTaps: source.totalTaps ?? source.taps,
      backpacksOpened: source.backpacksOpened ?? source.opened,
      totalMantecasEarned: source.totalMantecasEarned ?? source.earned,
      totalMantecasSpent: source.totalMantecasSpent ?? source.spent,
    };
    migrated.saveVersion = SAVE_VERSION;

    return migrated;
  }

  function sanitize(snapshot, options) {
    const settings = Object.assign({ rejectFutureVersion: false }, options);
    const source = isObject(snapshot) ? snapshot : {};
    const version = readVersion(source);

    if (version > SAVE_VERSION && settings.rejectFutureVersion) {
      throw new Error(`El save usa una versi\u00f3n futura no compatible (${version}).`);
    }

    const migrated = version < SAVE_VERSION ? migrateLegacy(source) : source;
    const countsSource = isObject(migrated.counts) ? migrated.counts : {};
    const statsSource = isObject(migrated.stats) ? migrated.stats : {};
    const normalized = createDefault();

    normalized.mantecas = toSafeInteger(migrated.mantecas, 0);

    COLLECTION_IDS.forEach((id) => {
      normalized.counts[id] = toSafeInteger(countsSource[id], 0);
    });

    STAT_KEYS.forEach((key) => {
      normalized.stats[key] = toSafeInteger(statsSource[key], 0);
    });

    return normalized;
  }

  function clone(snapshot) {
    return sanitize(snapshot);
  }

  function getStorage() {
    try {
      return window.localStorage || null;
    } catch (error) {
      lastError = error;
      return null;
    }
  }

  function load() {
    const storage = getStorage();

    if (!storage) return createDefault();

    try {
      const serialized = storage.getItem(SAVE_KEY);
      if (!serialized) return createDefault();

      const parsed = JSON.parse(serialized);
      const normalized = sanitize(parsed);
      lastError = null;
      return normalized;
    } catch (error) {
      lastError = error;
      return createDefault();
    }
  }

  function save(snapshot) {
    const storage = getStorage();

    if (!storage) return false;

    try {
      const normalized = sanitize(snapshot, { rejectFutureVersion: true });
      storage.setItem(SAVE_KEY, JSON.stringify(normalized));
      lastError = null;
      return true;
    } catch (error) {
      lastError = error;
      return false;
    }
  }

  function remove() {
    const storage = getStorage();

    if (!storage) return false;

    try {
      storage.removeItem(SAVE_KEY);
      lastError = null;
      return true;
    } catch (error) {
      lastError = error;
      return false;
    }
  }

  function exportSnapshot(snapshot, pretty) {
    return JSON.stringify(sanitize(snapshot), null, pretty === false ? 0 : 2);
  }

  function importSnapshot(serialized) {
    let parsed = serialized;

    if (typeof serialized === "string") {
      parsed = JSON.parse(serialized);
    }

    if (!isObject(parsed)) {
      throw new TypeError("El snapshot importado debe ser un objeto JSON.");
    }

    const normalized = sanitize(parsed, { rejectFutureVersion: true });

    if (!save(normalized)) {
      throw lastError || new Error("No se pudo guardar el snapshot importado.");
    }

    return normalized;
  }

  window.LucioSave = Object.freeze({
    key: SAVE_KEY,
    version: SAVE_VERSION,
    collectionIds: COLLECTION_IDS,
    createDefault,
    sanitize,
    clone,
    load,
    save,
    remove,
    exportSnapshot,
    importSnapshot,
    getLastError: () => lastError,
  });
})();
