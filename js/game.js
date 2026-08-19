(function () {
  "use strict";

  const config = window.GAME_CONFIG;
  const state = window.GameState;
  const audio = window.AudioManager;
  const app = document.querySelector("[data-game-app]");

  if (!config || !state || !audio || !app || !window.OpeningSequence || !window.LucioCollection) {
    throw new Error("No se pudieron cargar los módulos principales de Lucio Lootbox Clicker.");
  }

  const elements = {
    views: Array.from(document.querySelectorAll("[data-view]")),
    navItems: Array.from(document.querySelectorAll("[data-nav]")),
    mantecas: document.querySelector("[data-mantecas]"),
    headerMantecas: document.querySelector("[data-header-mantecas]"),
    tapValue: document.querySelector("[data-tap-value]"),
    totalLucios: document.querySelector("[data-total-lucios]"),
    totalBackpacks: document.querySelector("[data-total-backpacks]"),
    tapZone: document.querySelector("[data-tap-zone]"),
    tapFeedback: document.querySelector("[data-tap-feedback]"),
    shopGrid: document.querySelector("[data-shop-grid]"),
    collectionRoot: document.querySelector("[data-collection-root]"),
    collectionEmpty: document.querySelector("[data-collection-empty]"),
    collectionBadge: document.querySelector("[data-collection-badge]"),
    openingOverlay: document.querySelector("[data-opening-overlay]"),
    openingRoot: document.querySelector("[data-opening-root]"),
    settingsDialog: document.querySelector("[data-settings-dialog]"),
    audioStatus: document.querySelector("[data-audio-status]"),
    audioIcon: document.querySelector("[data-audio-icon]"),
    saveVersion: document.querySelector("[data-save-version]"),
    toast: document.querySelector("[data-game-toast]"),
    openAmbu: document.querySelector("[data-open-ambu]"),
    tapAmbuBackdrop: document.querySelector("[data-tap-ambu-backdrop]"),
    passiveRate: document.querySelector("[data-passive-rate]"),
    passivePerSecond: document.querySelector("[data-passive-per-second]"),
    offlineBank: document.querySelector("[data-offline-bank]"),
    collectOffline: document.querySelector("[data-collect-offline]"),
    offlineStored: document.querySelector("[data-offline-stored]"),
    offlineCapacity: document.querySelector("[data-offline-capacity]"),
    offlineProgress: document.querySelector("[data-offline-progress]"),
    offlineHours: document.querySelector("[data-offline-hours]"),
    ambuMantecas: document.querySelector("[data-ambu-mantecas]"),
    ambuStage: document.querySelector("[data-ambu-stage]"),
    ambuKicker: document.querySelector("[data-ambu-kicker]"),
    ambuName: document.querySelector("[data-ambu-name]"),
    ambuInstruction: document.querySelector("[data-ambu-instruction]"),
    ambuCharacter: document.querySelector("[data-ambu-character]"),
    ambuSprite: document.querySelector("[data-ambu-sprite]"),
    openAmbuInfo: document.querySelector("[data-open-ambu-info]"),
    ambuProgress: document.querySelector("[data-ambu-progress]"),
    ambuHits: document.querySelector("[data-ambu-hits]"),
    ambuProgressFill: document.querySelector("[data-ambu-progress-fill]"),
    ambuPurchase: document.querySelector("[data-ambu-purchase]"),
    buyAmbu: document.querySelector("[data-buy-ambu]"),
    ambuPriceHelp: document.querySelector("[data-ambu-price-help]"),
    ambuRateCard: document.querySelector("[data-ambu-rate-card]"),
    ambuRateValue: document.querySelector("[data-ambu-rate-value]"),
    ambuInfoDialog: document.querySelector("[data-ambu-info-dialog]"),
    closeAmbuInfo: document.querySelector("[data-close-ambu-info]"),
  };

  const numberFormatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });
  const backpackOrder = ["normal", "large", "mega"];
  let activeView = "tap";
  let toastTimer = 0;
  let collectionHasUpdate = false;
  let purchasedReward = null;
  let openingReturnFocus = null;
  let ambuBirthTimer = 0;
  let ambuArrivalTimer = 0;

  function formatNumber(value) {
    return numberFormatter.format(Math.max(0, Number(value) || 0));
  }

  function totalCopies(counts) {
    return config.collectionOrder.reduce((sum, id) => sum + (Number(counts[id]) || 0), 0);
  }

  function rewardId(reward) {
    return `${reward.material}${reward.shiny ? "Shiny" : ""}`;
  }

  function showToast(message, tone = "success", duration = 2600) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.dataset.tone = tone;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), duration);
  }

  function navigate(viewName, options = {}) {
    if (viewName === "ambu" && state.getAmbu().stage === "locked") viewName = "tap";
    if (!elements.views.some((view) => view.dataset.view === viewName)) return;
    activeView = viewName;
    elements.views.forEach((view) => {
      const selected = view.dataset.view === viewName;
      view.hidden = !selected;
      view.classList.toggle("view--active", selected);
    });
    const navView = viewName === "ambu" ? "tap" : viewName;
    elements.navItems.forEach((item) => {
      const selected = item.dataset.nav === navView;
      item.classList.toggle("is-active", selected);
      if (selected) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    if (viewName === "collection") {
      collectionHasUpdate = false;
      elements.collectionBadge.hidden = true;
      requestAnimationFrame(() => collection.layout());
    }
    if (options.focus !== false) {
      document.querySelector(`[data-view="${viewName}"]`)?.focus?.({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (options.history !== false) {
      const hash = `#${viewName}`;
      if (window.location.hash !== hash) {
        window.history.pushState({ view: viewName }, "", hash);
      }
    }
  }

  function viewFromLocation() {
    const requested = window.location.hash.slice(1);
    if (requested === "ambu" && state.getAmbu().stage === "locked") return "tap";
    return elements.views.some((view) => view.dataset.view === requested) ? requested : "tap";
  }

  function createTapFeedback(event, gained) {
    const pop = document.createElement("span");
    pop.className = "tap-pop";
    pop.textContent = `+${formatNumber(gained)} 🧈`;
    const zoneRect = elements.tapZone.getBoundingClientRect();
    const hasPointer = Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY) && (event.clientX || event.clientY);
    const x = hasPointer ? event.clientX : zoneRect.left + zoneRect.width / 2;
    const y = hasPointer ? event.clientY : zoneRect.top + zoneRect.height / 2;
    pop.style.left = `${x}px`;
    pop.style.top = `${y}px`;
    pop.style.setProperty("--pop-x", `${Math.round((Math.random() - 0.5) * 42)}px`);
    elements.tapFeedback.appendChild(pop);
    pop.addEventListener("animationend", () => pop.remove(), { once: true });
    window.setTimeout(() => pop.remove(), 900);
  }

  function performTap(event) {
    if (!elements.openingOverlay.hidden) return;
    const result = state.tap();
    audio.play("pop");
    createTapFeedback(event, result.gained);
    elements.tapZone.classList.remove("is-pressed");
    void elements.tapZone.offsetWidth;
    elements.tapZone.classList.add("is-pressed");
    window.setTimeout(() => elements.tapZone.classList.remove("is-pressed"), 90);
  }

  function shopOdds(backpack) {
    const labels = { bronze: "B", silver: "P", gold: "O", ruby: "R", diamond: "D", cosmic: "C" };
    return config.lucioOrder.map((material) => `<li title="${config.lucios[material].label}">${labels[material]} ${String(backpack.probabilities[material]).replace(".", ",")}%</li>`)
      .concat(`<li>✦ ${Math.round(backpack.shinyChance * 100)}%</li>`)
      .join("");
  }

  function renderShopCards() {
    elements.shopGrid.replaceChildren();
    const fragment = document.createDocumentFragment();
    backpackOrder.forEach((id, index) => {
      const backpack = config.backpacks[id];
      const article = document.createElement("article");
      article.className = "backpack-card";
      article.dataset.backpack = id;
      article.style.setProperty("--tier-accent", backpack.accent);
      article.innerHTML = `
        <div class="backpack-card__visual"><img src="${backpack.closed}" alt="Mochila ${backpack.label}" draggable="false"></div>
        <div class="backpack-card__body">
          <span class="backpack-card__tier">TIER 0${index + 1}</span>
          <h2>Mochila ${backpack.label}</h2>
          <ul class="backpack-card__odds" aria-label="Probabilidades">${shopOdds(backpack)}</ul>
          <button class="game-button game-button--primary backpack-card__buy" type="button" data-buy-backpack="${id}">
            Comprar · ${formatNumber(backpack.price)} 🧈
          </button>
        </div>`;
      fragment.appendChild(article);
    });
    elements.shopGrid.appendChild(fragment);
  }

  function updateShopAffordability() {
    const mantecas = state.getMantecas();
    elements.shopGrid.querySelectorAll("[data-buy-backpack]").forEach((button) => {
      const backpack = config.backpacks[button.dataset.buyBackpack];
      const canBuy = mantecas >= backpack.price;
      button.disabled = !canBuy;
      button.innerHTML = canBuy
        ? `Comprar · ${formatNumber(backpack.price)} 🧈`
        : `${formatNumber(backpack.price)} 🧈 <small>Faltan ${formatNumber(backpack.price - mantecas)}</small>`;
      button.setAttribute("aria-label", canBuy
        ? `Comprar Mochila ${backpack.label} por ${formatNumber(backpack.price)} Mantecas`
        : `No alcanza para Mochila ${backpack.label}; faltan ${formatNumber(backpack.price - mantecas)} Mantecas`);
    });
  }

  function renderEconomy() {
    const snapshot = state.getSnapshot();
    const tapValue = state.getTapValue();
    const passive = state.getPassiveRate();
    const ambu = snapshot.ambu;

    elements.mantecas.textContent = formatNumber(snapshot.mantecas);
    elements.headerMantecas.textContent = formatNumber(snapshot.mantecas);
    elements.ambuMantecas.textContent = formatNumber(snapshot.mantecas);
    elements.tapValue.textContent = formatNumber(tapValue);
    elements.totalLucios.textContent = formatNumber(totalCopies(snapshot.counts));
    elements.totalBackpacks.textContent = formatNumber(snapshot.stats.backpacksOpened);

    if (elements.passiveRate && elements.passivePerSecond) {
      elements.passiveRate.hidden = !passive.active;
      elements.passivePerSecond.textContent = formatNumber(passive.ratePerSecond);
    }

    if (elements.ambuRateValue) {
      elements.ambuRateValue.textContent = formatNumber(passive.ratePerSecond);
    }

    if (elements.offlineBank) {
      elements.offlineBank.hidden = !passive.active;
      if (elements.offlineStored) elements.offlineStored.textContent = formatNumber(ambu.offlineStored);
      if (elements.offlineCapacity) elements.offlineCapacity.textContent = formatNumber(passive.offlineCapacity);
      if (elements.offlineHours) elements.offlineHours.textContent = String(passive.offlineCapHours);
      if (elements.offlineProgress) {
        const pct = passive.offlineCapacity > 0 ? Math.min(100, (ambu.offlineStored / passive.offlineCapacity) * 100) : 0;
        elements.offlineProgress.style.width = `${pct}%`;
      }
      if (elements.collectOffline) {
        elements.collectOffline.hidden = ambu.offlineStored < 1;
      }
    }

    updateShopAffordability();
  }

  function ambuSpriteFor(ambu) {
    const sprites = config.ambu.sprites;
    if (ambu.stage === "baby") return sprites.baby;
    if (ambu.hatchTaps >= 15) return sprites.crack3;
    if (ambu.hatchTaps >= 10) return sprites.crack2;
    if (ambu.hatchTaps >= 5) return sprites.crack1;
    return sprites.egg;
  }

  const ambuBlinkState = {
    isBlinking: false,
    eyesClosed: false,
    timerId: null,
    subTimerId: null,
  };

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  function getNextBlinkDelayMs() {
    const roll = Math.random();
    if (roll < 0.70) {
      // 70% -> 2.5s a 4.5s
      return randomRange(2500, 4500);
    }
    if (roll < 0.90) {
      // 20% -> 1.0s a 2.5s
      return randomRange(1000, 2500);
    }
    // 10% -> 4.5s a 8.0s
    return randomRange(4500, 8000);
  }

  function updateAmbuBabyImages(src) {
    if (elements.ambuSprite && state.getAmbu().stage === "baby") {
      elements.ambuSprite.src = src;
    }
    const backdropImg = elements.tapAmbuBackdrop?.querySelector("img");
    if (backdropImg && state.getAmbu().stage === "baby") {
      backdropImg.src = src;
    }
  }

  function setAmbuEyesClosed(closed) {
    ambuBlinkState.eyesClosed = closed;
    const src = closed ? config.ambu.sprites.babyClosed : config.ambu.sprites.baby;
    updateAmbuBabyImages(src);
  }

  function stopAmbuBlinking() {
    if (ambuBlinkState.timerId !== null) {
      window.clearTimeout(ambuBlinkState.timerId);
      ambuBlinkState.timerId = null;
    }
    if (ambuBlinkState.subTimerId !== null) {
      window.clearTimeout(ambuBlinkState.subTimerId);
      ambuBlinkState.subTimerId = null;
    }
    ambuBlinkState.isBlinking = false;
    ambuBlinkState.eyesClosed = false;
    if (state.getAmbu().stage === "baby") {
      updateAmbuBabyImages(config.ambu.sprites.baby);
    }
  }

  function scheduleNextBlink() {
    if (ambuBlinkState.timerId !== null) {
      window.clearTimeout(ambuBlinkState.timerId);
      ambuBlinkState.timerId = null;
    }
    if (state.getAmbu().stage !== "baby") return;

    const delay = getNextBlinkDelayMs();
    ambuBlinkState.timerId = window.setTimeout(() => {
      ambuBlinkState.timerId = null;
      performBlink();
    }, delay);
  }

  function performBlink() {
    if (state.getAmbu().stage !== "baby" || elements.ambuCharacter.classList.contains("is-birthing") || elements.ambuCharacter.classList.contains("is-arriving")) {
      scheduleNextBlink();
      return;
    }

    ambuBlinkState.isBlinking = true;
    const isDoubleBlink = Math.random() < 0.15;
    const closeDuration = randomRange(80, 150);

    setAmbuEyesClosed(true);

    ambuBlinkState.subTimerId = window.setTimeout(() => {
      ambuBlinkState.subTimerId = null;
      if (state.getAmbu().stage !== "baby") return;

      setAmbuEyesClosed(false);

      if (isDoubleBlink) {
        const pauseBetween = randomRange(100, 250);
        ambuBlinkState.subTimerId = window.setTimeout(() => {
          ambuBlinkState.subTimerId = null;
          if (state.getAmbu().stage !== "baby") return;

          setAmbuEyesClosed(true);
          const secondCloseDuration = randomRange(80, 150);

          ambuBlinkState.subTimerId = window.setTimeout(() => {
            ambuBlinkState.subTimerId = null;
            if (state.getAmbu().stage !== "baby") return;

            setAmbuEyesClosed(false);
            ambuBlinkState.isBlinking = false;
            scheduleNextBlink();
          }, secondCloseDuration);
        }, pauseBetween);
      } else {
        ambuBlinkState.isBlinking = false;
        scheduleNextBlink();
      }
    }, closeDuration);
  }

  function startAmbuBlinking() {
    if (state.getAmbu().stage !== "baby") return;
    if (ambuBlinkState.timerId === null && !ambuBlinkState.isBlinking) {
      scheduleNextBlink();
    }
  }

  function scheduleAmbuBirth() {
    if (ambuBirthTimer || state.getAmbu().stage !== "hatching") return;
    elements.ambuCharacter.classList.remove("is-tapped");
    elements.ambuCharacter.classList.add("is-birthing");
    elements.ambuCharacter.disabled = true;
    elements.ambuInstruction.textContent = "El huevo está a punto de abrirse...";

    ambuBirthTimer = window.setTimeout(() => {
      ambuBirthTimer = 0;
      const result = state.completeAmbuHatching();
      elements.ambuCharacter.classList.remove("is-birthing");
      if (!result.ok) return;
      elements.ambuCharacter.classList.add("is-arriving");
      window.clearTimeout(ambuArrivalTimer);
      ambuArrivalTimer = window.setTimeout(() => elements.ambuCharacter.classList.remove("is-arriving"), 760);
      showToast("NUEVO COMPAÑERO: Ambu bebé se ha unido a ti. Parece hambriento, curioso y cargado de una energía extraña.", "discovery", 7000);
    }, config.ambu.hatchDelayMs);
  }

  function renderAmbu() {
    const ambu = state.getAmbu();
    const unlocked = ambu.stage !== "locked";
    const isEgg = ambu.stage === "egg";
    const isHatching = ambu.stage === "hatching";
    const isBaby = ambu.stage === "baby";
    const maxHits = config.ambu.hatchTaps;
    const canBuy = state.canPurchaseAmbuEgg();

    elements.openAmbu.hidden = !unlocked;
    elements.tapAmbuBackdrop.hidden = !isBaby;
    elements.openAmbu.querySelector("img").src = isBaby ? config.ambu.sprites.baby : config.ambu.sprites.egg;
    elements.openAmbu.setAttribute("aria-label", isBaby ? "Visitar a Ambu bebé" : "Visitar el huevo misterioso");

    if (!unlocked) {
      if (activeView === "ambu") navigate("tap", { focus: false });
      window.clearTimeout(ambuBirthTimer);
      ambuBirthTimer = 0;
      stopAmbuBlinking();
      elements.ambuCharacter.classList.remove("is-tapped", "is-birthing", "is-arriving");
      return;
    }

    elements.ambuStage.dataset.stage = ambu.stage;
    if (!isBaby) {
      elements.ambuSprite.src = ambuSpriteFor(ambu);
      elements.ambuSprite.alt = "Huevo misterioso";
      stopAmbuBlinking();
    } else {
      if (!ambuBlinkState.eyesClosed) {
        elements.ambuSprite.src = config.ambu.sprites.baby;
      }
      elements.ambuSprite.alt = "Ambu bebé";
      startAmbuBlinking();
    }

    elements.openAmbuInfo.hidden = !isBaby;
    elements.ambuPurchase.hidden = !isEgg;
    elements.ambuProgress.hidden = !isHatching;
    elements.ambuRateCard.hidden = !isBaby;
    if (isBaby) {
      elements.ambuRateValue.textContent = formatNumber(state.getPassiveRate().ratePerSecond);
    }
    elements.ambuHits.textContent = String(ambu.hatchTaps);
    elements.ambuProgressFill.style.width = `${Math.min(100, ambu.hatchTaps / maxHits * 100)}%`;
    elements.ambuCharacter.disabled = isBaby || (isHatching && ambu.hatchTaps >= maxHits);

    if (isEgg) {
      elements.ambuKicker.textContent = "HALLAZGO MISTERIOSO";
      elements.ambuName.textContent = "HUEVO MISTERIOSO";
      elements.ambuInstruction.textContent = "El cascarón permanece inmóvil... salvo cuando lo tocas.";
      elements.ambuCharacter.setAttribute("aria-label", "Tocar el huevo misterioso");
      elements.buyAmbu.disabled = !canBuy;
      elements.buyAmbu.textContent = `Eclosionar · ${formatNumber(config.ambu.hatchPrice)} 🧈`;
      elements.ambuPriceHelp.textContent = canBuy
        ? "Tienes suficientes Mantecas para despertarlo."
        : `Faltan ${formatNumber(config.ambu.hatchPrice - state.getMantecas())} Mantecas.`;
    } else if (isHatching) {
      elements.ambuKicker.textContent = "ECLOSIÓN";
      elements.ambuName.textContent = "¡ROMPE EL CASCARÓN!";
      elements.ambuInstruction.textContent = ambu.hatchTaps >= maxHits
        ? "El huevo está a punto de abrirse..."
        : `Toca el huevo · faltan ${maxHits - ambu.hatchTaps} golpes`;
      elements.ambuCharacter.setAttribute("aria-label", `Golpear el cascarón; ${ambu.hatchTaps} de ${maxHits}`);
    } else {
      elements.ambuKicker.textContent = "COMPAÑERO INVOCADO";
      elements.ambuName.textContent = "AMBU BEBÉ";
      elements.ambuInstruction.textContent = "Una criatura extraña y poderosa ha despertado.";
      elements.ambuCharacter.setAttribute("aria-label", "Ambu bebé");
    }

    if (isHatching && ambu.hatchTaps >= maxHits) scheduleAmbuBirth();
    else {
      window.clearTimeout(ambuBirthTimer);
      ambuBirthTimer = 0;
      elements.ambuCharacter.classList.remove("is-birthing");
    }
  }

  function announceAmbuDiscovery() {
    const ambu = state.getAmbu();
    if (ambu.stage === "locked" || ambu.notificationSeen) return;
    showToast("Entre las barras de Manteca, distingues un huevo misterioso...", "discovery", 6200);
    state.markAmbuNotificationSeen();
  }

  function animateAmbuTap() {
    elements.ambuCharacter.classList.remove("is-tapped");
    void elements.ambuCharacter.offsetWidth;
    elements.ambuCharacter.classList.add("is-tapped");
    window.setTimeout(() => elements.ambuCharacter.classList.remove("is-tapped"), 450);
  }

  function touchAmbu() {
    const ambu = state.getAmbu();
    if (ambu.stage === "baby" || ambu.hatchTaps >= config.ambu.hatchTaps) return;
    animateAmbuTap();
    const result = state.tapAmbuEgg();
    if (!result.ok && result.reason === "payment-required") {
      showToast("El huevo se agita, pero todavía no tiene fuerza para abrirse.", "warning");
    }
  }

  function buyAmbuEgg() {
    const result = state.purchaseAmbuEgg();
    if (!result.ok) {
      if (result.reason === "insufficient-mantecas") {
        showToast(`Te faltan ${formatNumber(result.missing)} 🧈 para eclosionar el huevo.`, "warning");
      }
      return;
    }
    showToast("El huevo responde. ¡Rompe el cascarón!", "discovery", 3800);
    elements.ambuCharacter.focus({ preventScroll: true });
  }

  function renderCollection() {
    const counts = state.getCounts();
    const hasItems = totalCopies(counts) > 0;
    elements.collectionEmpty.hidden = hasItems;
    elements.collectionRoot.hidden = !hasItems;
    collection.update(counts);
  }

  function buyBackpack(backpackId) {
    if (!elements.openingOverlay.hidden || purchasedReward) return;
    const backpack = config.backpacks[backpackId];
    if (!backpack) return;
    if (!state.canBuy(backpackId)) {
      const missing = Math.max(0, backpack.price - state.getMantecas());
      showToast(`Te faltan ${formatNumber(missing)} 🧈 para esa mochila.`, "warning");
      return;
    }

    const reward = window.rollBackpackReward(backpackId);
    const purchase = state.purchaseBackpack(backpackId, reward);
    if (!purchase.ok) {
      showToast("No se pudo completar la compra.", "error");
      return;
    }

    const focusedBeforeOpening = document.activeElement;
    purchasedReward = purchase.reward;
    openingReturnFocus = focusedBeforeOpening instanceof HTMLElement && focusedBeforeOpening !== document.body
      ? focusedBeforeOpening
      : elements.navItems.find((item) => item.dataset.nav === "shop");
    collectionHasUpdate = true;
    if (activeView !== "collection") elements.collectionBadge.hidden = false;
    openingSequence.setBackpack(backpackId);
    openingSequence.setReward(rewardId(purchasedReward));
    elements.openingOverlay.hidden = false;
    app.inert = true;
    document.body.classList.add("has-opening");
    openingSequence.start();
    elements.openingRoot.querySelector("[data-opening-stage]")?.focus({ preventScroll: true });
  }

  function buyBackpackDebug(backpackId, reward) {
    if (new URLSearchParams(window.location.search).get("debug") !== "1") return false;
    if (!elements.openingOverlay.hidden || purchasedReward) return false;
    const backpack = config.backpacks[backpackId];
    const purchase = state.purchaseBackpackDebug(backpackId, reward);
    if (!backpack || !purchase.ok) return false;

    const focusedBeforeOpening = document.activeElement;
    purchasedReward = purchase.reward;
    openingReturnFocus = focusedBeforeOpening instanceof HTMLElement && focusedBeforeOpening !== document.body
      ? focusedBeforeOpening
      : elements.navItems.find((item) => item.dataset.nav === "shop");
    collectionHasUpdate = true;
    if (activeView !== "collection") elements.collectionBadge.hidden = false;
    openingSequence.setBackpack(backpackId);
    openingSequence.setReward(rewardId(purchasedReward));
    elements.openingOverlay.hidden = false;
    app.inert = true;
    document.body.classList.add("has-opening");
    openingSequence.start();
    elements.openingRoot.querySelector("[data-opening-stage]")?.focus({ preventScroll: true });
    return true;
  }

  function closeOpening(reward) {
    elements.openingOverlay.hidden = true;
    app.inert = false;
    document.body.classList.remove("has-opening");
    const id = rewardId(reward);
    showToast(`Lucio ${config.lucios[id].label} añadido · +${formatNumber(config.lucios[id].tapBonus)} 🧈 por tap.`);
    purchasedReward = null;
    renderCollection();
    renderEconomy();
    const fallbackFocus = elements.navItems.find((item) => item.dataset.nav === activeView)
      || elements.navItems[0];
    const focusTarget = openingReturnFocus && !openingReturnFocus.disabled
      ? openingReturnFocus
      : fallbackFocus;
    openingReturnFocus = null;
    focusTarget?.focus({ preventScroll: true });
  }

  function trapOpeningFocus(event) {
    if (event.key !== "Tab" || elements.openingOverlay.hidden) return;
    const candidates = [
      elements.openingRoot.querySelector("[data-opening-stage]"),
      elements.openingRoot.querySelector("[data-confirm-wrap].is-visible [data-confirm]"),
    ].filter((candidate) => candidate && !candidate.disabled);
    if (!candidates.length) return;
    const currentIndex = candidates.indexOf(document.activeElement);
    const nextIndex = event.shiftKey
      ? (currentIndex <= 0 ? candidates.length - 1 : currentIndex - 1)
      : (currentIndex < 0 || currentIndex === candidates.length - 1 ? 0 : currentIndex + 1);
    event.preventDefault();
    candidates[nextIndex].focus({ preventScroll: true });
  }

  function updateAudioUi() {
    const muted = audio.muted;
    elements.audioStatus.textContent = muted ? "Silenciado" : "Activado";
    elements.audioIcon.textContent = muted ? "🔇" : "🔊";
  }

  function preloadImages() {
    const paths = [
      config.assets.mystery,
      ...(config.assets.ui ? Object.values(config.assets.ui) : []),
      ...Object.values(config.assets.effects),
      ...config.lucioOrder.map((material) => config.lucios[material].sprite),
      ...backpackOrder.flatMap((id) => [config.backpacks[id].closed, config.backpacks[id].open]),
      ...Object.values(config.ambu.sprites),
    ];
    paths.forEach((src) => {
      const image = new Image();
      image.src = src;
      image.decode?.().catch(() => undefined);
    });
  }

  renderShopCards();
  const collection = new window.LucioCollection(elements.collectionRoot, state.getCounts());
  const openingSequence = new window.OpeningSequence(elements.openingRoot, {
    backpack: "normal",
    reward: "bronze",
    timings: config.opening,
    onBackpackTap() {
      audio.play("backpackShake");
    },
    onBackpackOpened() {
      audio.play("openBackpack");
    },
    onMysteryReveal(reward) {
      if (reward.shiny) audio.play("shiny");
    },
    onRewardReveal(reward) {
      audio.playReveal(reward);
    },
    onConfirm(reward) {
      closeOpening(reward);
    },
  });

  function collectOfflineMantecas() {
    const result = state.collectOffline();
    if (result.ok && result.collected > 0) {
      audio.play("pop");
      showToast(`¡Recogiste ${formatNumber(result.collected)} 🧈 de producción offline!`, "success", 3200);
    }
  }

  state.subscribe((event) => {
    renderEconomy();
    renderAmbu();
    if (["purchase", "reset", "import"].includes(event.type)) renderCollection();
    if (event.type === "ambu-discovered") announceAmbuDiscovery();
    if (event.type === "ambu-clock-rollback") {
      showToast("Se detectó un cambio en el reloj del dispositivo. La producción offline se pausó temporalmente.", "warning", 5000);
    }
  });

  elements.tapZone.addEventListener("click", (event) => performTap(event));

  elements.navItems.forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.nav));
  });

  document.querySelectorAll("[data-go-shop]").forEach((button) => button.addEventListener("click", () => navigate("shop")));
  document.querySelectorAll("[data-go-tap]").forEach((button) => button.addEventListener("click", () => navigate("tap")));
  elements.openAmbu.addEventListener("click", () => navigate("ambu"));
  elements.openAmbuInfo?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof elements.ambuInfoDialog?.showModal === "function") elements.ambuInfoDialog.showModal();
    else if (elements.ambuInfoDialog) elements.ambuInfoDialog.setAttribute("open", "");
  });

  elements.ambuInfoDialog?.addEventListener("click", (e) => {
    const closeBtn = e.target.closest("[data-close-ambu-info]");
    if (closeBtn || e.target === elements.ambuInfoDialog) {
      if (typeof elements.ambuInfoDialog.close === "function") elements.ambuInfoDialog.close();
      else elements.ambuInfoDialog.removeAttribute("open");
    }
  });

  elements.ambuCharacter.addEventListener("click", touchAmbu);
  elements.buyAmbu.addEventListener("click", buyAmbuEgg);
  elements.collectOffline?.addEventListener("click", collectOfflineMantecas);

  elements.shopGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-buy-backpack]");
    if (button && !button.disabled) buyBackpack(button.dataset.buyBackpack);
  });

  elements.openingOverlay.addEventListener("keydown", trapOpeningFocus);

  document.querySelector("[data-open-settings]").addEventListener("click", () => {
    if (typeof elements.settingsDialog.showModal === "function") elements.settingsDialog.showModal();
    else elements.settingsDialog.setAttribute("open", "");
  });

  document.querySelector("[data-toggle-audio]").addEventListener("click", () => {
    audio.toggleMuted();
    updateAudioUi();
  });

  document.querySelector("[data-reset-progress]").addEventListener("click", () => {
    const accepted = window.confirm("¿Borrar todas tus Mantecas, Lucios, progreso de Ambu y estadísticas? Esta acción no se puede deshacer.");
    if (!accepted) return;
    state.reset();
    collectionHasUpdate = false;
    elements.collectionBadge.hidden = true;
    renderEconomy();
    renderCollection();
    elements.settingsDialog.close?.();
    navigate("tap", { focus: false });
    showToast("Progreso borrado.");
  });

  document.addEventListener("click", (event) => {
    const control = event.target.closest("button, a[href]");
    if (!control || control === elements.tapZone || control.closest("[data-opening-stage]") && !control.matches("[data-confirm]")) return;
    audio.play("tap");
  });

  let lastFrameTime = performance.now();

  function onlineLoop(currentTime) {
    const deltaMs = Math.min(2000, Math.max(0, currentTime - lastFrameTime));
    lastFrameTime = currentTime;

    if (deltaMs > 0 && state.getPassiveRate().active) {
      state.tickOnline(deltaMs, Date.now());
    }

    requestAnimationFrame(onlineLoop);
  }

  requestAnimationFrame((time) => {
    lastFrameTime = time;
    onlineLoop(time);
  });

  window.addEventListener("pagehide", () => state.flush());
  window.addEventListener("popstate", () => navigate(viewFromLocation(), { focus: false, history: false }));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      state.flush();
      stopAmbuBlinking();
    } else {
      lastFrameTime = performance.now();
      state.resolveOfflineCatchup(Date.now());
      if (state.getAmbu().stage === "baby") startAmbuBlinking();
    }
  });
  window.addEventListener("focus", () => {
    lastFrameTime = performance.now();
    state.resolveOfflineCatchup(Date.now());
  });

  elements.saveVersion.textContent = String(config.saveVersion);
  renderEconomy();
  renderCollection();
  renderAmbu();
  announceAmbuDiscovery();
  updateAudioUi();
  audio.preload?.();
  preloadImages();
  const initialView = viewFromLocation();
  window.history.replaceState({ view: initialView }, "", `#${initialView}`);
  navigate(initialView, { focus: false, history: false });

  window.LucioGame = Object.freeze({
    state,
    collection,
    opening: openingSequence,
    navigate,
    buyBackpack,
    buyBackpackDebug,
    collectOffline: collectOfflineMantecas,
    get activeView() { return activeView; },
    get collectionHasUpdate() { return collectionHasUpdate; },
    get purchasedReward() { return purchasedReward; },
  });
}());
