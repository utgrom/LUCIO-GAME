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
  const AMBU_CONFIG = config.ambu || {};
  const AMBU_DISCOVERY_THRESHOLD = readConfigInteger(AMBU_CONFIG.discoveryThreshold, 50000);
  const AMBU_HATCH_PRICE = readConfigInteger(AMBU_CONFIG.hatchPrice, 250000);
  const AMBU_HATCH_TAPS = readConfigInteger(AMBU_CONFIG.hatchTaps, 15);

  function safeAdd(left, right) {
    return Math.min(MAX_VALUE, left + right);
  }

  function readNonNegativeNumber(value, fallback) {
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  function readConfigInteger(value, fallback) {
    return Number.isSafeInteger(value) && value >= 0 ? value : fallback;
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

    let onlineSubTick = 0;

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

    function getPassiveRate() {
      const stageConfig = (config.ambu && config.ambu.stages && config.ambu.stages[state.ambu.stage]) || null;
      if (!stageConfig || !stageConfig.intervalMs || stageConfig.intervalMs <= 0) {
        return Object.freeze({
          active: false,
          intervalMs: 0,
          pulsesPerSecond: 0,
          ratePerSecond: 0,
          offlineCapHours: 0,
          offlineCapacity: 0,
        });
      }

      const intervalMs = stageConfig.intervalMs;
      const pulsesPerSecond = 1000 / intervalMs;
      const tapValue = getTapValue();
      const ratePerSecond = tapValue * pulsesPerSecond;
      const offlineCapHours = stageConfig.offlineCapHours || 0;
      const offlineCapacity = Math.min(MAX_VALUE, Math.floor(ratePerSecond * offlineCapHours * 3600));

      return Object.freeze({
        active: true,
        intervalMs,
        pulsesPerSecond,
        ratePerSecond,
        offlineCapHours,
        offlineCapacity,
      });
    }

    function getAmbuOfflineStatus() {
      const passive = getPassiveRate();
      return Object.freeze({
        stage: state.ambu.stage,
        active: passive.active,
        offlineStored: state.ambu.offlineStored,
        offlineCapacity: passive.offlineCapacity,
        offlineCapHours: passive.offlineCapHours,
        ratePerSecond: passive.ratePerSecond,
        timeDebtMs: state.ambu.timeDebtMs,
        lastActiveTimestamp: state.ambu.lastActiveTimestamp,
      });
    }

    function emit(type, detail) {
      const event = Object.freeze(Object.assign({
        type,
        state: getSnapshot(),
        tapValue: getTapValue(),
        passiveRate: getPassiveRate(),
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

    function resolveOfflineCatchup(nowTimestamp, options) {
      const settings = Object.assign({ emitEvent: true }, options);
      const now = Number.isFinite(nowTimestamp) && nowTimestamp > 0 ? nowTimestamp : Date.now();
      const passive = getPassiveRate();

      if (!passive.active) {
        state.ambu.lastActiveTimestamp = now;
        return Object.freeze({
          ok: true,
          produced: 0,
          timeDebtMs: state.ambu.timeDebtMs,
          offlineStored: state.ambu.offlineStored,
        });
      }

      const last = state.ambu.lastActiveTimestamp || now;
      const deltaMs = now - last;

      if (deltaMs < 0) {
        const debtIncrement = Math.abs(deltaMs);
        state.ambu.timeDebtMs = safeAdd(state.ambu.timeDebtMs, debtIncrement);
        state.ambu.lastActiveTimestamp = now;
        saveImmediately();
        if (settings.emitEvent) {
          emit("ambu-clock-rollback", { debtIncrement, timeDebtMs: state.ambu.timeDebtMs });
        }
        return Object.freeze({
          ok: true,
          produced: 0,
          rollbackDetected: true,
          timeDebtMs: state.ambu.timeDebtMs,
          offlineStored: state.ambu.offlineStored,
        });
      }

      let effectiveDeltaMs = deltaMs;

      if (state.ambu.timeDebtMs > 0) {
        const payDebt = Math.min(state.ambu.timeDebtMs, effectiveDeltaMs);
        state.ambu.timeDebtMs -= payDebt;
        effectiveDeltaMs -= payDebt;
      }

      let produced = 0;
      if (effectiveDeltaMs > 0 && passive.ratePerSecond > 0) {
        const rawProduced = (effectiveDeltaMs / 1000) * passive.ratePerSecond;
        const maxCanAdd = Math.max(0, passive.offlineCapacity - state.ambu.offlineStored);
        produced = Math.min(maxCanAdd, Math.floor(rawProduced));
        state.ambu.offlineStored = safeAdd(state.ambu.offlineStored, produced);
      }

      state.ambu.lastActiveTimestamp = now;

      if (produced > 0 || deltaMs > 0) {
        saveImmediately();
        if (settings.emitEvent) {
          emit("ambu-offline-accumulated", { produced, offlineStored: state.ambu.offlineStored });
        }
      }

      return Object.freeze({
        ok: true,
        produced,
        effectiveDeltaMs,
        timeDebtMs: state.ambu.timeDebtMs,
        offlineStored: state.ambu.offlineStored,
      });
    }

    function tickOnline(deltaMs, nowTimestamp) {
      const now = Number.isFinite(nowTimestamp) && nowTimestamp > 0 ? nowTimestamp : Date.now();
      const passive = getPassiveRate();

      if (!passive.active || passive.ratePerSecond <= 0) {
        state.ambu.lastActiveTimestamp = now;
        return 0;
      }

      if (now < state.ambu.lastActiveTimestamp) {
        const debt = state.ambu.lastActiveTimestamp - now;
        state.ambu.timeDebtMs = safeAdd(state.ambu.timeDebtMs, debt);
        state.ambu.lastActiveTimestamp = now;
        scheduleSave();
        return 0;
      }

      const dt = Math.max(0, Number.isFinite(deltaMs) ? deltaMs : (now - (state.ambu.lastActiveTimestamp || now)));

      if (state.ambu.timeDebtMs > 0) {
        const payDebt = Math.min(state.ambu.timeDebtMs, dt);
        state.ambu.timeDebtMs -= payDebt;
        state.ambu.lastActiveTimestamp = now;
        return 0;
      }

      onlineSubTick += (dt / 1000) * passive.ratePerSecond;
      const gained = Math.floor(onlineSubTick);

      if (gained > 0) {
        onlineSubTick -= gained;
        state.mantecas = safeAdd(state.mantecas, gained);
        state.stats.totalMantecasEarned = safeAdd(state.stats.totalMantecasEarned, gained);
        if (!discoverAmbu()) scheduleSave();
        emit("ambu-online-produced", { gained });
      }

      state.ambu.lastActiveTimestamp = now;
      return gained;
    }

    function collectOffline() {
      const stored = state.ambu.offlineStored;
      if (stored <= 0) {
        return Object.freeze({ ok: false, reason: "empty-bank", collected: 0 });
      }

      state.mantecas = safeAdd(state.mantecas, stored);
      state.stats.totalMantecasEarned = safeAdd(state.stats.totalMantecasEarned, stored);
      state.ambu.offlineStored = 0;
      state.ambu.lastActiveTimestamp = Date.now();
      discoverAmbu({ emitEvent: true });
      const persisted = saveImmediately();
      emit("ambu-offline-collected", { collected: stored, persisted });

      return Object.freeze({
        ok: true,
        collected: stored,
        mantecas: state.mantecas,
        persisted,
        state: getSnapshot(),
      });
    }

    function discoverAmbu(options) {
      const settings = Object.assign({ emitEvent: true }, options);
      if (state.ambu.stage !== "locked" || state.stats.totalMantecasEarned < AMBU_DISCOVERY_THRESHOLD) return false;

      state.ambu.stage = "egg";
      state.ambu.discoveredAt = Date.now();
      const persisted = saveImmediately();
      if (settings.emitEvent) emit("ambu-discovered", { persisted });
      return true;
    }

    function tap() {
      const gained = getTapValue();
      state.mantecas = safeAdd(state.mantecas, gained);
      state.stats.totalTaps = safeAdd(state.stats.totalTaps, 1);
      state.stats.totalMantecasEarned = safeAdd(state.stats.totalMantecasEarned, gained);
      if (!discoverAmbu()) scheduleSave();
      emit("tap", { gained });

      return Object.freeze({
        gained,
        mantecas: state.mantecas,
        tapValue: getTapValue(),
      });
    }

    function getAmbu() {
      return Object.assign({}, state.ambu);
    }

    function markAmbuNotificationSeen() {
      if (state.ambu.stage === "locked" || state.ambu.notificationSeen) return false;
      state.ambu.notificationSeen = true;
      const persisted = saveImmediately();
      emit("ambu-notification-seen", { persisted });
      return persisted;
    }

    function canPurchaseAmbuEgg() {
      return state.ambu.stage === "egg" && state.mantecas >= AMBU_HATCH_PRICE;
    }

    function purchaseAmbuEgg() {
      if (state.ambu.stage !== "egg") {
        return Object.freeze({ ok: false, reason: "invalid-stage" });
      }
      if (state.mantecas < AMBU_HATCH_PRICE) {
        return Object.freeze({
          ok: false,
          reason: "insufficient-mantecas",
          price: AMBU_HATCH_PRICE,
          missing: AMBU_HATCH_PRICE - state.mantecas,
        });
      }

      state.mantecas -= AMBU_HATCH_PRICE;
      state.stats.totalMantecasSpent = safeAdd(state.stats.totalMantecasSpent, AMBU_HATCH_PRICE);
      state.ambu.stage = "hatching";
      state.ambu.hatchTaps = 0;
      const persisted = saveImmediately();
      emit("ambu-egg-purchased", { price: AMBU_HATCH_PRICE, persisted });
      return Object.freeze({ ok: true, price: AMBU_HATCH_PRICE, persisted, state: getSnapshot() });
    }

    function tapAmbuEgg() {
      if (state.ambu.stage === "egg") {
        return Object.freeze({ ok: false, reason: "payment-required", hatchTaps: 0 });
      }
      if (state.ambu.stage !== "hatching") {
        return Object.freeze({ ok: false, reason: "invalid-stage", hatchTaps: state.ambu.hatchTaps });
      }
      if (state.ambu.hatchTaps >= AMBU_HATCH_TAPS) {
        return Object.freeze({ ok: false, reason: "birth-pending", hatchTaps: AMBU_HATCH_TAPS });
      }

      state.ambu.hatchTaps += 1;
      const persisted = saveImmediately();
      emit("ambu-egg-tap", {
        hatchTaps: state.ambu.hatchTaps,
        complete: state.ambu.hatchTaps >= AMBU_HATCH_TAPS,
        persisted,
      });
      return Object.freeze({
        ok: true,
        hatchTaps: state.ambu.hatchTaps,
        complete: state.ambu.hatchTaps >= AMBU_HATCH_TAPS,
        persisted,
      });
    }

    function completeAmbuHatching() {
      if (state.ambu.stage !== "hatching" || state.ambu.hatchTaps < AMBU_HATCH_TAPS) {
        return Object.freeze({ ok: false, reason: "not-ready" });
      }

      const now = Date.now();
      state.ambu.stage = "baby";
      state.ambu.hatchTaps = AMBU_HATCH_TAPS;
      state.ambu.hatchedAt = now;
      state.ambu.lastActiveTimestamp = now;
      state.ambu.offlineStored = 0;
      state.ambu.timeDebtMs = 0;
      onlineSubTick = 0;
      const persisted = saveImmediately();
      emit("ambu-hatched", { persisted });
      return Object.freeze({ ok: true, persisted, state: getSnapshot() });
    }

    function canPurchaseAmbuEvolution() {
      if (state.ambu.stage !== "baby") return false;
      const price = config.ambu?.stages?.child?.evolutionPrice || 10000000;
      return Number.isSafeInteger(price) && state.mantecas >= price;
    }

    function purchaseAmbuEvolution() {
      if (state.ambu.stage !== "baby") {
        return Object.freeze({ ok: false, reason: "invalid-stage" });
      }

      const price = config.ambu?.stages?.child?.evolutionPrice || 10000000;
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

      state.mantecas -= price;
      state.stats.totalMantecasSpent = safeAdd(state.stats.totalMantecasSpent, price);
      state.ambu.stage = "child";
      state.ambu.evolvedAt = Date.now();
      state.ambu.lastActiveTimestamp = Date.now();
      onlineSubTick = 0;

      const persisted = saveImmediately();
      emit("ambu-evolved", {
        fromStage: "baby",
        toStage: "child",
        price,
        persisted,
      });

      return Object.freeze({
        ok: true,
        fromStage: "baby",
        toStage: "child",
        price,
        persisted,
        state: getSnapshot(),
        passiveRate: getPassiveRate(),
      });
    }

    function purchaseAmbuEvolutionDebug() {
      if (new URLSearchParams(window.location.search).get("debug") !== "1") {
        return Object.freeze({ ok: false, reason: "debug-disabled" });
      }
      state.ambu.stage = "child";
      state.ambu.evolvedAt = Date.now();
      state.ambu.lastActiveTimestamp = Date.now();
      onlineSubTick = 0;
      const persisted = saveImmediately();
      emit("ambu-evolved", { fromStage: "baby", toStage: "child", price: 0, persisted, debug: true });
      return Object.freeze({ ok: true, price: 0, persisted, state: getSnapshot() });
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

      onlineSubTick = 0;
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

      onlineSubTick = 0;
      state = saveStore.clone(imported);
      dirty = false;
      discoverAmbu({ emitEvent: false });
      if (getPassiveRate().active) {
        resolveOfflineCatchup(Date.now(), { emitEvent: false });
      }
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

    discoverAmbu({ emitEvent: false });
    if (getPassiveRate().active) {
      resolveOfflineCatchup(Date.now(), { emitEvent: false });
    }

    return Object.freeze({
      getSnapshot,
      getMantecas: () => state.mantecas,
      getCounts: () => Object.assign({}, state.counts),
      getCount: (id) => COLLECTION_IDS.includes(id) ? state.counts[id] : 0,
      getStats: () => Object.assign({}, state.stats),
      getAmbu,
      getPassiveRate,
      getAmbuOfflineStatus,
      getTapValue,
      tap,
      canPurchaseAmbuEgg,
      purchaseAmbuEgg,
      tapAmbuEgg,
      completeAmbuHatching,
      canPurchaseAmbuEvolution,
      purchaseAmbuEvolution,
      purchaseAmbuEvolutionDebug,
      markAmbuNotificationSeen,
      resolveOfflineCatchup,
      tickOnline,
      collectOffline,
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
