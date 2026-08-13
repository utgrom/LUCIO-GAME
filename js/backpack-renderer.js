(function () {
  "use strict";

  const config = window.GAME_CONFIG;

  const OPENING_STATES = Object.freeze({
    IDLE: "idle",
    ENTERING: "entering",
    AWAITING_TAPS: "awaiting-taps",
    OPENING: "opening",
    REVEALING: "revealing",
    REWARD_VISIBLE: "reward-visible",
  });

  const STATE_LABELS = {
    [OPENING_STATES.IDLE]: "IDLE",
    [OPENING_STATES.ENTERING]: "ENTERING",
    [OPENING_STATES.AWAITING_TAPS]: "WAITING_FOR_TAPS",
    [OPENING_STATES.OPENING]: "OPENING",
    [OPENING_STATES.REVEALING]: "REVEALING",
    [OPENING_STATES.REWARD_VISIBLE]: "REWARD_VISIBLE",
  };

  function rollReward(backpackId, random = Math.random) {
    const backpack = config.backpacks[backpackId];
    if (!backpack) throw new Error(`Mochila desconocida: ${backpackId}`);

    const materialRoll = random() * 100;
    let cursor = 0;
    let material = config.lucioOrder[config.lucioOrder.length - 1];
    for (const candidate of config.lucioOrder) {
      cursor += backpack.probabilities[candidate];
      if (materialRoll < cursor) {
        material = candidate;
        break;
      }
    }

    return { material, shiny: random() < backpack.shinyChance };
  }

  function parseReward(value, backpackId) {
    if (!value || value === "random") return rollReward(backpackId);
    const shiny = value.endsWith("Shiny");
    const material = shiny ? value.slice(0, -5) : value;
    if (!config.lucios[material]?.sprite) throw new Error(`Reward desconocido: ${value}`);
    return { material, shiny };
  }

  function resolveRewardTimings(baseTimings, reward) {
    const base = Object.assign({}, baseTimings);
    delete base.rewardTimingOverrides;
    if (!reward) return base;
    const groups = baseTimings.rewardTimingOverrides || {};
    const group = reward.shiny ? groups.shiny : groups.normal;
    return Object.assign(base, group?.default || {}, group?.[reward.material] || {});
  }

  class OpeningSequence {
    constructor(root, options = {}) {
      this.root = root;
      this.stage = root.querySelector("[data-opening-stage]");
      this.backpackWrap = root.querySelector("[data-backpack-wrap]");
      this.backpackImage = root.querySelector("[data-backpack-image]");
      this.rewardSlot = root.querySelector("[data-reward-slot]");
      this.flash = root.querySelector("[data-opening-flash]");
      this.instruction = root.querySelector("[data-tap-instruction]");
      this.instructionLabel = root.querySelector("[data-tap-label]");
      this.tapDots = Array.from(root.querySelectorAll("[data-tap-dot]"));
      this.rewardCopy = root.querySelector("[data-reward-copy]");
      this.rewardRarity = root.querySelector("[data-reward-rarity]");
      this.rewardName = root.querySelector("[data-reward-name]");
      this.rewardBonus = root.querySelector("[data-reward-bonus]");
      this.confirmWrap = root.querySelector("[data-confirm-wrap]");
      this.confirmButton = root.querySelector("[data-confirm]");
      this.stateOutput = root.querySelector("[data-state-output]");
      this.options = Object.assign({
        backpack: "normal",
        reward: "random",
        timings: config.opening,
        onStateChange: null,
        onConfirm: null,
      }, options);
      this.timings = Object.assign({}, config.opening, this.options.timings);
      this.state = OPENING_STATES.IDLE;
      this.taps = 0;
      this.timers = new Set();
      this.reward = null;
      this.rewardRenderer = null;
      this.mysteryRenderer = null;
      this.sequenceId = 0;

      this.onStageInput = this.onStageInput.bind(this);
      this.onConfirm = this.onConfirm.bind(this);
      this.stage.addEventListener("pointerdown", this.onStageInput);
      this.stage.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("button")) {
          event.preventDefault();
          this.onStageInput(event);
        }
      });
      this.confirmButton.addEventListener("click", this.onConfirm);
      this.setBackpack(this.options.backpack, false);
      this.applyTimings(this.timings);
      this.transition(OPENING_STATES.IDLE);
    }

    schedule(callback, delay) {
      const sequenceId = this.sequenceId;
      const timer = window.setTimeout(() => {
        this.timers.delete(timer);
        if (sequenceId === this.sequenceId) callback();
      }, Math.max(0, delay));
      this.timers.add(timer);
      return timer;
    }

    clearTimers() {
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers.clear();
    }

    transition(state) {
      this.state = state;
      this.stage.dataset.state = state;
      this.stateOutput.innerHTML = `Estado: <b>${STATE_LABELS[state]}</b>`;
      this.updateInterface();
      if (typeof this.options.onStateChange === "function") this.options.onStateChange(state, this);
    }

    applyTimings(timings) {
      this.timings = Object.assign({}, this.timings, timings);
      const cssVars = {
        "--entry-duration": `${this.timings.entryDuration}ms`,
        "--opening-duration": `${this.timings.openingDuration}ms`,
        "--flash-duration": `${this.timings.flashDuration}ms`,
        "--flash-intensity": this.timings.flashIntensity,
        "--rise-duration": `${this.timings.riseDuration}ms`,
        "--rise-distance": `${this.timings.riseDistance}px`,
        "--final-bounce": this.timings.finalBounce,
        "--impact-scale": this.timings.impactScale,
        "--mystery-fade-duration": `${this.timings.mysteryFadeDuration}ms`,
      };
      Object.entries(cssVars).forEach(([key, value]) => this.stage.style.setProperty(key, value));
    }

    setBackpack(backpackId, shouldReset = true) {
      const backpack = config.backpacks[backpackId];
      if (!backpack) return;
      this.options.backpack = backpackId;
      this.backpackImage.src = backpack.closed;
      this.backpackImage.alt = `Mochila ${backpack.label} cerrada`;
      this.stage.style.setProperty("--backpack-accent", backpack.accent);
      if (shouldReset) this.reset();
    }

    setReward(rewardId) {
      this.options.reward = rewardId;
      if (this.state !== OPENING_STATES.IDLE) this.reset();
    }

    start() {
      if (this.state !== OPENING_STATES.IDLE) this.reset();
      this.sequenceId += 1;
      this.reward = parseReward(this.options.reward, this.options.backpack);
      this.applyTimings(resolveRewardTimings(this.options.timings, this.reward));
      this.taps = 0;
      this.prepareRewardRenderer();
      this.tapDots.forEach((dot) => dot.classList.remove("is-hit"));
      this.backpackImage.src = config.backpacks[this.options.backpack].closed;
      this.backpackImage.alt = `Mochila ${config.backpacks[this.options.backpack].label} cerrada`;
      this.stage.classList.add("is-entering");
      this.transition(OPENING_STATES.ENTERING);
      this.schedule(() => this.finishEntry(), this.timings.entryDuration);
    }

    prepareRewardRenderer() {
      if (this.rewardRenderer) this.rewardRenderer.destroy();
      if (this.mysteryRenderer) this.mysteryRenderer.destroy();
      this.rewardSlot.replaceChildren();
      const mysteryLayer = document.createElement("div");
      mysteryLayer.className = "reward-layer reward-layer--mystery";
      const actualLayer = document.createElement("div");
      actualLayer.className = "reward-layer reward-layer--actual";
      this.rewardSlot.append(mysteryLayer, actualLayer);
      this.mysteryRenderer = window.createLucioRenderer({
        variant: "mystery",
        context: "reveal",
        effects: config.defaultEffects.mystery,
      }).mount(mysteryLayer);
      const effects = Object.assign({}, config.defaultEffects[this.reward.material]);
      if (this.reward.shiny) {
        Object.assign(effects, { shiny: true, shinySparkles: true, shine: true, pulse: true });
      }
      this.rewardRenderer = window.createLucioRenderer({
        variant: this.reward.material,
        shiny: this.reward.shiny,
        context: "reveal",
        effects,
      }).mount(actualLayer);
      const base = config.lucios[this.reward.material];
      const rewardKey = this.reward.shiny ? `${this.reward.material}Shiny` : this.reward.material;
      const rewardConfig = config.lucios[rewardKey];
      this.rewardRarity.textContent = this.reward.shiny ? "Drop excepcional · Shiny" : `${base.label} · Drop confirmado`;
      this.rewardName.textContent = `Lucio ${rewardConfig.label}`;
      this.rewardBonus.textContent = `+${rewardConfig.tapBonus}`;
    }

    finishEntry() {
      if (this.state !== OPENING_STATES.ENTERING) return;
      this.clearTimers();
      this.stage.classList.remove("is-entering");
      this.transition(OPENING_STATES.AWAITING_TAPS);
    }

    registerTap() {
      if (this.state !== OPENING_STATES.AWAITING_TAPS) return;
      this.taps += 1;
      this.tapDots[this.taps - 1]?.classList.add("is-hit");
      this.shake();
      if (this.taps >= 3) this.beginOpening();
      else this.updateInterface();
    }

    shake() {
      this.backpackWrap.getAnimations().filter((animation) => animation.id === "backpack-shake").forEach((animation) => animation.cancel());
      const strength = this.timings.shakeStrength;
      const rotation = this.timings.shakeRotation;
      const scale = this.timings.impactScale;
      const animation = this.backpackWrap.animate([
        { transform: "translateX(0) rotate(0deg) scale(1)" },
        { transform: `translateX(${-strength}px) rotate(${-rotation}deg) scale(${scale})`, offset: 0.22 },
        { transform: `translateX(${strength * 0.82}px) rotate(${rotation}deg) scale(0.985)`, offset: 0.48 },
        { transform: `translateX(${-strength * 0.42}px) rotate(${-rotation * 0.48}deg) scale(1.02)`, offset: 0.72 },
        { transform: "translateX(0) rotate(0deg) scale(1)" },
      ], { duration: this.timings.shakeDuration, easing: "ease-out" });
      animation.id = "backpack-shake";
    }

    beginOpening() {
      this.clearTimers();
      this.backpackWrap.getAnimations().filter((animation) => animation.id === "backpack-shake").forEach((animation) => animation.cancel());
      this.transition(OPENING_STATES.OPENING);
      this.stage.classList.add("is-opening");
      this.activateFlash();
      this.schedule(() => this.showOpenBackpack(), this.timings.openingDuration * 0.38);
      this.schedule(
        () => this.beginReveal(),
        this.timings.openingDuration + this.timings.lucioDelay,
      );
    }

    showOpenBackpack() {
      const backpack = config.backpacks[this.options.backpack];
      this.backpackImage.src = backpack.open;
      this.backpackImage.alt = `Mochila ${backpack.label} abierta`;
    }

    activateFlash() {
      this.flash.classList.remove("is-active");
      void this.flash.offsetWidth;
      this.flash.classList.add("is-active");
    }

    beginReveal() {
      if (![OPENING_STATES.OPENING, OPENING_STATES.REVEALING].includes(this.state)) return;
      this.clearTimers();
      this.showOpenBackpack();
      this.stage.classList.remove("is-opening");
      this.rewardSlot.classList.remove("is-visible", "is-promoted", "is-swapped");
      this.transition(OPENING_STATES.REVEALING);
      requestAnimationFrame(() => this.rewardSlot.classList.add("is-revealing"));
      this.schedule(
        () => this.swapMysteryForReward(),
        this.timings.riseDuration * this.timings.mysterySwapPoint,
      );
      this.schedule(
        () => this.finishReveal(),
        Math.max(this.timings.riseDuration, this.timings.revealDuration),
      );
    }

    finishReveal() {
      if (this.state !== OPENING_STATES.REVEALING) return;
      this.clearTimers();
      this.swapMysteryForReward();
      this.rewardSlot.classList.remove("is-revealing");
      this.rewardSlot.classList.add("is-visible");
      this.transition(OPENING_STATES.REWARD_VISIBLE);
    }

    swapMysteryForReward() {
      if (this.rewardSlot.classList.contains("is-swapped")) return;
      this.rewardSlot.classList.add("is-promoted", "is-swapped");
      this.activateFlash();
    }

    onStageInput(event) {
      if (event.target?.closest?.("button, select, input, label")) return;
      if (event.cancelable) event.preventDefault();
      switch (this.state) {
        case OPENING_STATES.ENTERING:
          this.finishEntry();
          break;
        case OPENING_STATES.AWAITING_TAPS:
          this.registerTap();
          break;
        case OPENING_STATES.OPENING:
          this.beginReveal();
          break;
        case OPENING_STATES.REVEALING:
          this.finishReveal();
          break;
        default:
          break;
      }
    }

    onConfirm(event) {
      event.stopPropagation();
      if (this.state !== OPENING_STATES.REWARD_VISIBLE) return;
      const confirmedReward = Object.assign({}, this.reward);
      if (typeof this.options.onConfirm === "function") this.options.onConfirm(confirmedReward, this);
      this.reset();
    }

    updateInterface() {
      const awaiting = this.state === OPENING_STATES.AWAITING_TAPS;
      const rewardVisible = this.state === OPENING_STATES.REWARD_VISIBLE;
      this.instruction.hidden = !awaiting;
      this.instructionLabel.textContent = awaiting ? `Pulsa para abrir · ${this.taps}/3` : "";
      this.rewardCopy.classList.toggle("is-visible", rewardVisible);
      this.confirmWrap.classList.toggle("is-visible", rewardVisible);
    }

    reset() {
      this.sequenceId += 1;
      this.clearTimers();
      this.backpackWrap.getAnimations().forEach((animation) => animation.cancel());
      this.stage.classList.remove("is-entering", "is-opening");
      this.flash.classList.remove("is-active");
      this.rewardSlot.classList.remove("is-revealing", "is-visible", "is-promoted", "is-swapped");
      this.rewardCopy.classList.remove("is-visible");
      this.confirmWrap.classList.remove("is-visible");
      this.tapDots.forEach((dot) => dot.classList.remove("is-hit"));
      this.taps = 0;
      this.reward = null;
      if (this.rewardRenderer) {
        this.rewardRenderer.destroy();
        this.rewardRenderer = null;
      }
      if (this.mysteryRenderer) {
        this.mysteryRenderer.destroy();
        this.mysteryRenderer = null;
      }
      this.rewardSlot.replaceChildren();
      const backpack = config.backpacks[this.options.backpack];
      this.backpackImage.src = backpack.closed;
      this.backpackImage.alt = `Mochila ${backpack.label} cerrada`;
      this.transition(OPENING_STATES.IDLE);
    }

    destroy() {
      this.reset();
      this.stage.removeEventListener("pointerdown", this.onStageInput);
      this.confirmButton.removeEventListener("click", this.onConfirm);
    }
  }

  window.OPENING_STATES = OPENING_STATES;
  window.OpeningSequence = OpeningSequence;
  window.rollBackpackReward = rollReward;
  window.resolveRewardTimings = resolveRewardTimings;
})();
