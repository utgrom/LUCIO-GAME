(function () {
  "use strict";

  const config = window.GAME_CONFIG;
  const saveStore = window.LucioSave;

  if (!config || !saveStore) {
    throw new Error("game-state.js requiere config.js y save.js, en ese orden.");
  }

  const COLLECTION_IDS = saveStore.collectionIds;
  const MATERIAL_IDS = Object.freeze((config.lucioOrder || []).slice());
  const AUTOSAVE_DELAY = 400;
  const MAX_VALUE = Number.MAX_SAFE_INTEGER;

  function safeAdd(left, right) {
    return Math.min(MAX_VALUE, left + right);
  }

  function readNonNegativeNumber(value, fallback) {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function normalizeReward(reward) {
    let id = typeof reward === "string" ? reward : reward && (reward.id || reward.variant);
    let material = reward && reward.material;
    let shiny = Boolean(reward && reward.shiny);

    if (id && COLLECTION_IDS.includes(id)) {
      shiny = id.endsWith("Shiny");
      material = shiny ? id.slice(0, -"Shiny".length) : id;
    } else if (MATERIAL_IDS.includes(material)) {
      id = `${material}${shiny ? "Shiny" : ""}`;
    }

    if (!COLLECTION_IDS.includes(id) || !MATERIAL_IDS.includes(material)) {
      return null;
    }

    const definition = config.lucios[id];

    if (!definition || !Number.isFinite(definition.tapBonus)) return null;

    return Object.freeze({
      id,
      material,
      shiny,
      label: definition.label,
      tapBonus: definition.tapBonus,
    });
  }

  function createGameState(options) {
    const settings = Object.assign({ autosaveDelay: AUTOSAVE_DELAY }, options);
    const listeners = new Set();
    let state = saveStore.load();
    let dirty = false;
    let saveTimer = null;

    function getSnapshot() {
      return saveStore.clone(state);
    }

    function getTapValue() {
      let total = readNonNegativeNumber(config.baseTapValue, 0);

      COLLECTION_IDS.forEach((id) => {
        const count = state.counts[id];
        const bonus = readNonNegativeNumber(config.lucios[id] && config.lucios[id].tapBonus, 0);
        total = Math.min(MAX_VALUE, total + count * bonus);
      });

      return Math.min(MAX_VALUE, Math.floor(total));
    }

    function emit(type, detail) {
      const event = Object.freeze(Object.assign({
        type,
        state: getSnapshot(),
        tapValue: getTapValue(),
      }, detail));

      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          if (window.console && typeof window.console.error === "function") {
            window.console.error("Error en un listener de GameState:", error);
          }
        }
      });
    }

    function flush() {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
      }

      if (!dirty) return true;

      const persisted = saveStore.save(state);
      dirty = !persisted;
      return persisted;
    }

    function scheduleSave() {
      dirty = true;

      if (saveTimer !== null) return;

      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        flush();
      }, Math.max(0, settings.autosaveDelay));
    }

    function saveImmediately() {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
      }

      dirty = true;
      return flush();
    }

    function tap() {
      const gained = getTapValue();
      state.mantecas = safeAdd(state.mantecas, gained);
      state.stats.totalTaps = safeAdd(state.stats.totalTaps, 1);
      state.stats.totalMantecasEarned = safeAdd(state.stats.totalMantecasEarned, gained);
      scheduleSave();
      emit("tap", { gained });

      return Object.freeze({
        gained,
        mantecas: state.mantecas,
        tapValue: getTapValue(),
      });
    }

    function getBackpack(backpackId) {
      return config.backpacks && config.backpacks[backpackId];
    }

    function canBuy(backpackId) {
      const backpack = getBackpack(backpackId);
      const price = backpack && readNonNegativeNumber(backpack.price, Infinity);
      return Boolean(backpack) && Number.isSafeInteger(price) && state.mantecas >= price;
    }

    function purchaseBackpack(backpackId, predeterminedReward) {
      const backpack = getBackpack(backpackId);
      const reward = normalizeReward(predeterminedReward);

      if (!backpack) {
        return Object.freeze({ ok: false, reason: "unknown-backpack" });
      }

      if (!reward) {
        return Object.freeze({ ok: false, reason: "invalid-reward" });
      }

      const price = readNonNegativeNumber(backpack.price, Infinity);

      if (!Number.isSafeInteger(price)) {
        return Object.freeze({ ok: false, reason: "invalid-price" });
      }

      if (state.mantecas < price) {
        return Object.freeze({
          ok: false,
          reason: "insufficient-mantecas",
          price,
          missing: price - state.mantecas,
        });
      }

      if (state.counts[reward.id] >= MAX_VALUE) {
        return Object.freeze({ ok: false, reason: "count-overflow" });
      }

      const next = saveStore.clone(state);
      next.mantecas -= price;
      next.counts[reward.id] = safeAdd(next.counts[reward.id], 1);
      next.stats.backpacksOpened = safeAdd(next.stats.backpacksOpened, 1);
      next.stats.totalMantecasSpent = safeAdd(next.stats.totalMantecasSpent, price);

      state = next;
      const persisted = saveImmediately();
      emit("purchase", { backpackId, price, reward, persisted });

      return Object.freeze({
        ok: true,
        backpackId,
        price,
        reward,
        persisted,
        state: getSnapshot(),
        tapValue: getTapValue(),
      });
    }

    function purchaseBackpackDebug(backpackId, predeterminedReward) {
      if (new URLSearchParams(window.location.search).get("debug") !== "1") {
        return Object.freeze({ ok: false, reason: "debug-disabled" });
      }
      const backpack = getBackpack(backpackId);
      const reward = normalizeReward(predeterminedReward);
      if (!backpack) return Object.freeze({ ok: false, reason: "unknown-backpack" });
      if (!reward) return Object.freeze({ ok: false, reason: "invalid-reward" });
      if (state.counts[reward.id] >= MAX_VALUE) {
        return Object.freeze({ ok: false, reason: "count-overflow" });
      }

      const next = saveStore.clone(state);
      next.counts[reward.id] = safeAdd(next.counts[reward.id], 1);
      next.stats.backpacksOpened = safeAdd(next.stats.backpacksOpened, 1);
      state = next;
      const persisted = saveImmediately();
      emit("purchase", { backpackId, price: 0, reward, persisted, debug: true });
      return Object.freeze({
        ok: true,
        backpackId,
        price: 0,
        reward,
        persisted,
        state: getSnapshot(),
        tapValue: getTapValue(),
      });
    }

    function reset() {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
      }

      state = saveStore.createDefault();
      dirty = false;
      const persisted = saveStore.remove();
      emit("reset", { persisted });
      return getSnapshot();
    }

    function exportSnapshot(pretty) {
      return saveStore.exportSnapshot(state, pretty);
    }

    function importSnapshot(serialized) {
      const imported = saveStore.importSnapshot(serialized);

      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
      }

      state = saveStore.clone(imported);
      dirty = false;
      emit("import", { persisted: true });
      return getSnapshot();
    }

    function subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("subscribe requiere una funci\u00f3n.");
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return Object.freeze({
      getSnapshot,
      getMantecas: () => state.mantecas,
      getCounts: () => Object.assign({}, state.counts),
      getCount: (id) => COLLECTION_IDS.includes(id) ? state.counts[id] : 0,
      getStats: () => Object.assign({}, state.stats),
      getTapValue,
      tap,
      canBuy,
      purchaseBackpack,
      purchaseBackpackDebug,
      normalizeReward,
      flush,
      reset,
      exportSnapshot,
      importSnapshot,
      subscribe,
    });
  }

  window.createGameState = createGameState;
  window.GameState = createGameState();
})();
