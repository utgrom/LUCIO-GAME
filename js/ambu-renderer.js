(function () {
  "use strict";

  const config = window.GAME_CONFIG || {};

  function randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  const DEFAULT_BLINK_CONFIG = Object.freeze({
    enabled: true,
    commonMin: 2500,
    commonMax: 4500,
    fastMin: 1000,
    fastMax: 2500,
    longMin: 4500,
    longMax: 8000,
    closeDuration: 160,
    doubleBlinkChance: 0.15,
    doubleBlinkPauseMin: 100,
    doubleBlinkPauseMax: 250,
  });

  class AmbuRenderer {
    constructor(elements = {}, options = {}) {
      this.elements = {
        character: elements.character || null,
        sprite: elements.sprite || null,
        backdropImg: elements.backdropImg || null,
        stageWrap: elements.stageWrap || null,
      };

      this.sprites = Object.assign({
        egg: "assets/invocados/Ambu_1.png",
        crack1: "assets/invocados/Ambu_1_1.png",
        crack2: "assets/invocados/Ambu_1_2.png",
        crack3: "assets/invocados/Ambu_1_3.png",
        baby: "assets/invocados/Ambu_2.png",
        babyClosed: "assets/invocados/Ambu_2_closedEyes.png",
      }, config.ambu?.sprites || {}, options.sprites || {});

      this.blinkConfig = Object.assign({}, DEFAULT_BLINK_CONFIG, options.blinkConfig || {});
      this.stage = options.stage || "baby";
      this.breathingEnabled = options.breathingEnabled !== false;
      this.breathingDuration = options.breathingDuration || 4.0;

      this.state = {
        eyesClosed: false,
        isBlinking: false,
        isDoubleBlinking: false,
        blinkCount: 0,
        lastBlinkTime: 0,
        nextBlinkTimestamp: 0,
        manualHoldClosed: false,
      };

      this.timers = {
        blink: null,
        sub: null,
        animation: null,
      };

      this.listeners = new Set();
      this.setStage(this.stage);
      this.applyBreathing();

      if (this.blinkConfig.enabled && this.stage === "baby") {
        this.startBlinking();
      }
    }

    on(callback) {
      if (typeof callback === "function") {
        this.listeners.add(callback);
      }
      return () => this.listeners.delete(callback);
    }

    emit(type, detail = {}) {
      const payload = Object.assign({ type, renderer: this }, this.getState(), detail);
      this.listeners.forEach((listener) => {
        try {
          listener(payload);
        } catch (error) {
          if (window.console && typeof window.console.error === "function") {
            window.console.error("Error en listener de AmbuRenderer:", error);
          }
        }
      });
    }

    getState() {
      return {
        stage: this.stage,
        eyesClosed: this.state.eyesClosed,
        isBlinking: this.state.isBlinking,
        isDoubleBlinking: this.state.isDoubleBlinking,
        blinkCount: this.state.blinkCount,
        nextBlinkDelayMs: Math.max(0, this.state.nextBlinkTimestamp - Date.now()),
        breathingEnabled: this.breathingEnabled,
        breathingDuration: this.breathingDuration,
        manualHoldClosed: this.state.manualHoldClosed,
      };
    }

    getNextBlinkDelayMs() {
      const roll = Math.random();
      if (roll < 0.70) {
        return randomRange(this.blinkConfig.commonMin, this.blinkConfig.commonMax);
      }
      if (roll < 0.90) {
        return randomRange(this.blinkConfig.fastMin, this.blinkConfig.fastMax);
      }
      return randomRange(this.blinkConfig.longMin, this.blinkConfig.longMax);
    }

    setupOverlays() {
      if (this.elements.character && !this.elements.closedSprite) {
        let closed = this.elements.character.querySelector("[data-ambu-sprite-closed]");
        if (!closed) {
          closed = document.createElement("img");
          closed.dataset.ambuSpriteClosed = "";
          closed.alt = "";
          closed.draggable = false;
          closed.style.position = "absolute";
          closed.style.inset = "0";
          closed.style.width = "100%";
          closed.style.height = "100%";
          closed.style.objectFit = "contain";
          closed.style.pointerEvents = "none";
          closed.style.opacity = "0";
          closed.style.zIndex = "3";
          closed.style.transition = "none";
          this.elements.character.appendChild(closed);
        }
        closed.src = this.sprites.babyClosed;
        this.elements.closedSprite = closed;
      }

      if (this.elements.backdropImg && !this.elements.backdropClosedImg) {
        const parent = this.elements.backdropImg.parentElement;
        if (parent) {
          let backdropClosed = parent.querySelector("[data-tap-ambu-backdrop-closed]");
          if (!backdropClosed) {
            backdropClosed = document.createElement("img");
            backdropClosed.dataset.tapAmbuBackdropClosed = "";
            backdropClosed.alt = "";
            backdropClosed.draggable = false;
            backdropClosed.style.position = "absolute";
            backdropClosed.style.inset = "0";
            backdropClosed.style.width = "100%";
            backdropClosed.style.height = "100%";
            backdropClosed.style.objectFit = "contain";
            backdropClosed.style.pointerEvents = "none";
            backdropClosed.style.opacity = "0";
            backdropClosed.style.zIndex = "2";
            backdropClosed.style.transition = "none";
            if (window.getComputedStyle(parent).position === "static") {
              parent.style.position = "relative";
            }
            parent.appendChild(backdropClosed);
          }
          backdropClosed.src = this.sprites.babyClosed;
          this.elements.backdropClosedImg = backdropClosed;
        }
      }
    }

    setStage(stage) {
      this.stage = stage;
      if (this.elements.stageWrap) {
        this.elements.stageWrap.dataset.stage = stage;
      }
      this.updateSpriteImages();

      if (stage === "baby") {
        if (this.blinkConfig.enabled && !this.timers.blink && !this.state.isBlinking) {
          this.scheduleNextBlink();
        }
      } else {
        this.stopBlinking();
      }

      this.emit("stage-change", { stage });
    }

    spriteForCurrentStage() {
      if (this.stage === "baby") return this.sprites.baby;
      if (this.stage === "crack3") return this.sprites.crack3;
      if (this.stage === "crack2") return this.sprites.crack2;
      if (this.stage === "crack1") return this.sprites.crack1;
      return this.sprites.egg;
    }

    updateSpriteImages() {
      this.setupOverlays();

      const isClosed = (this.state.eyesClosed || this.state.manualHoldClosed) && this.stage === "baby";

      if (this.elements.sprite) {
        const baseSrc = this.spriteForCurrentStage();
        if (this.elements.sprite.getAttribute("src") !== baseSrc) {
          this.elements.sprite.src = baseSrc;
        }
        this.elements.sprite.alt = this.stage === "baby" ? "Ambu bebé" : "Huevo misterioso";
      }

      if (this.elements.closedSprite) {
        if (this.elements.closedSprite.getAttribute("src") !== this.sprites.babyClosed) {
          this.elements.closedSprite.src = this.sprites.babyClosed;
        }
        const targetOpacity = (isClosed && this.stage === "baby") ? "1" : "0";
        if (this.elements.closedSprite.style.opacity !== targetOpacity) {
          this.elements.closedSprite.style.opacity = targetOpacity;
        }
        this.elements.closedSprite.style.display = (this.stage === "baby") ? "block" : "none";
      }

      if (this.elements.backdropImg) {
        const backdropSrc = this.stage === "baby" ? this.sprites.baby : this.sprites.egg;
        if (this.elements.backdropImg.getAttribute("src") !== backdropSrc) {
          this.elements.backdropImg.src = backdropSrc;
        }
      }

      if (this.elements.backdropClosedImg) {
        if (this.elements.backdropClosedImg.getAttribute("src") !== this.sprites.babyClosed) {
          this.elements.backdropClosedImg.src = this.sprites.babyClosed;
        }
        const targetBackdropOpacity = (isClosed && this.stage === "baby") ? "1" : "0";
        if (this.elements.backdropClosedImg.style.opacity !== targetBackdropOpacity) {
          this.elements.backdropClosedImg.style.opacity = targetBackdropOpacity;
        }
        this.elements.backdropClosedImg.style.display = (this.stage === "baby") ? "block" : "none";
      }
    }

    setEyesClosed(closed) {
      this.state.eyesClosed = Boolean(closed);
      this.updateSpriteImages();
      this.emit(closed ? "eyes-closed" : "eyes-opened");
    }

    setManualHoldClosed(hold) {
      this.state.manualHoldClosed = Boolean(hold);
      this.updateSpriteImages();
      this.emit("manual-hold-change", { hold: this.state.manualHoldClosed });
    }

    startBlinking() {
      this.blinkConfig.enabled = true;
      if (this.stage !== "baby") return;
      if (!this.timers.blink && !this.state.isBlinking) {
        this.scheduleNextBlink();
      }
      this.emit("blink-start-loop");
    }

    stopBlinking() {
      if (this.timers.blink !== null) {
        window.clearTimeout(this.timers.blink);
        this.timers.blink = null;
      }
      if (this.timers.sub !== null) {
        window.clearTimeout(this.timers.sub);
        this.timers.sub = null;
      }
      this.state.isBlinking = false;
      this.state.isDoubleBlinking = false;
      if (!this.state.manualHoldClosed) {
        this.setEyesClosed(false);
      }
      this.emit("blink-stop-loop");
    }

    scheduleNextBlink(customDelayMs) {
      if (this.timers.blink !== null) {
        window.clearTimeout(this.timers.blink);
        this.timers.blink = null;
      }
      if (this.stage !== "baby" || !this.blinkConfig.enabled) return;

      const delay = Number.isFinite(customDelayMs) ? customDelayMs : this.getNextBlinkDelayMs();
      this.state.nextBlinkTimestamp = Date.now() + delay;

      this.timers.blink = window.setTimeout(() => {
        this.timers.blink = null;
        this.performBlink();
      }, delay);

      this.emit("blink-scheduled", { delayMs: delay });
    }

    triggerBlink(isDouble = false) {
      if (this.stage !== "baby") return;
      if (this.timers.blink !== null) {
        window.clearTimeout(this.timers.blink);
        this.timers.blink = null;
      }
      if (this.timers.sub !== null) {
        window.clearTimeout(this.timers.sub);
        this.timers.sub = null;
      }
      this.performBlink(Boolean(isDouble));
    }

    triggerDoubleBlink() {
      this.triggerBlink(true);
    }

    performBlink(forcedDouble) {
      if (this.stage !== "baby") return;

      const isDouble = typeof forcedDouble === "boolean"
        ? forcedDouble
        : (Math.random() < this.blinkConfig.doubleBlinkChance);

      const closeDuration = this.blinkConfig.closeDuration || 160;

      this.state.isBlinking = true;
      this.state.isDoubleBlinking = isDouble;
      this.state.blinkCount += 1;
      this.state.lastBlinkTime = Date.now();

      this.emit("blink-action-start", { isDouble, closeDuration });

      this.setEyesClosed(true);

      this.timers.sub = window.setTimeout(() => {
        this.timers.sub = null;
        if (this.stage !== "baby") return;

        this.setEyesClosed(false);

        if (isDouble) {
          const pauseBetween = randomRange(this.blinkConfig.doubleBlinkPauseMin, this.blinkConfig.doubleBlinkPauseMax);
          this.timers.sub = window.setTimeout(() => {
            this.timers.sub = null;
            if (this.stage !== "baby") return;

            this.setEyesClosed(true);

            this.timers.sub = window.setTimeout(() => {
              this.timers.sub = null;
              if (this.stage !== "baby") return;

              this.setEyesClosed(false);
              this.state.isBlinking = false;
              this.state.isDoubleBlinking = false;
              this.emit("blink-action-end", { double: true });
              if (this.blinkConfig.enabled) this.scheduleNextBlink();
            }, closeDuration);
          }, pauseBetween);
        } else {
          this.state.isBlinking = false;
          this.state.isDoubleBlinking = false;
          this.emit("blink-action-end", { double: false });
          if (this.blinkConfig.enabled) this.scheduleNextBlink();
        }
      }, closeDuration);
    }

    setBreathing(enabled, durationSeconds) {
      this.breathingEnabled = Boolean(enabled);
      if (Number.isFinite(durationSeconds) && durationSeconds > 0) {
        this.breathingDuration = durationSeconds;
      }
      this.applyBreathing();
      this.emit("breathing-change", { enabled: this.breathingEnabled, duration: this.breathingDuration });
    }

    applyBreathing() {
      if (!this.elements.character) return;
      const img = this.elements.character.querySelector("img") || this.elements.sprite;
      if (!img) return;

      if (this.breathingEnabled && this.stage === "baby") {
        img.style.animationName = "ambu-baby-breathe";
        img.style.animationDuration = `${this.breathingDuration}s`;
        img.style.animationTimingFunction = "ease-in-out";
        img.style.animationIterationCount = "infinite";
      } else {
        img.style.animationName = "none";
      }
    }

    triggerTap() {
      if (!this.elements.character) return;
      this.elements.character.classList.remove("is-tapped");
      void this.elements.character.offsetWidth;
      this.elements.character.classList.add("is-tapped");

      window.clearTimeout(this.timers.animation);
      this.timers.animation = window.setTimeout(() => {
        this.elements.character?.classList.remove("is-tapped");
      }, 430);
    }

    triggerBirth(onComplete) {
      if (!this.elements.character) {
        if (typeof onComplete === "function") onComplete();
        return;
      }
      this.elements.character.classList.remove("is-tapped", "is-arriving");
      this.elements.character.classList.add("is-birthing");

      window.clearTimeout(this.timers.animation);
      this.timers.animation = window.setTimeout(() => {
        this.elements.character?.classList.remove("is-birthing");
        this.setStage("baby");
        this.elements.character?.classList.add("is-arriving");

        if (typeof onComplete === "function") {
          onComplete();
        }

        this.timers.animation = window.setTimeout(() => {
          this.elements.character?.classList.remove("is-arriving");
          this.applyBreathing();
        }, 760);
      }, config.ambu?.hatchDelayMs || 1450);
    }

    updateConfig(newBlinkConfig = {}) {
      Object.assign(this.blinkConfig, newBlinkConfig);
      if (this.stage === "baby" && this.blinkConfig.enabled) {
        this.scheduleNextBlink();
      } else {
        this.stopBlinking();
      }
      this.emit("config-update", { config: this.blinkConfig });
    }

    destroy() {
      this.stopBlinking();
      if (this.timers.animation !== null) {
        window.clearTimeout(this.timers.animation);
        this.timers.animation = null;
      }
      this.listeners.clear();
    }
  }

  window.AmbuRenderer = AmbuRenderer;
})();
