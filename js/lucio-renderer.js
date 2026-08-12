(function () {
  "use strict";

  const config = window.GAME_CONFIG;
  let rendererSequence = 0;

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function mergePreset(material, override, isShiny = false) {
    const base = deepClone(config.visualPresets[material]);
    const shared = deepClone(config.visualPresets.shared);
    const shinyModifier = deepClone(config.visualPresets.shinyModifier);
    const merged = Object.assign({}, base, shared, override || {});
    ["glow", "sparkles", "shine", "lightning", "idle", "pulse", "specialOverlay", "shiny"].forEach((key) => {
      const shinyDefault = key === "pulse" && !isShiny ? {} : shinyModifier[key] || {};
      merged[key] = Object.assign({}, base[key] || shared[key] || shinyDefault, override?.[key] || {});
    });
    merged.shiny = Object.assign({}, shinyModifier.shiny, override?.shiny || {});
    merged.shine = Object.assign({}, shinyModifier.shine, override?.shine || {});
    merged.lightning = Object.assign({}, shinyModifier.lightning, override?.lightning || {});
    if (isShiny) merged.pulse = Object.assign({}, shinyModifier.pulse, override?.pulse || {});
    return merged;
  }

  function colorWithAlpha(color, alpha) {
    const safeAlpha = Math.max(0, Math.min(1, Number(alpha) || 0));
    const hex = color.replace("#", "");
    if (/^[0-9a-f]{3}$/i.test(hex)) {
      const [r, g, b] = hex.split("").map((part) => parseInt(part + part, 16));
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
    }
    return color;
  }

  function setVars(element, preset, sprite) {
    const shinyRimScale = 1 + preset.shiny.rimSize / 900;
    const shineSlant = Math.max(-45, Math.min(45, preset.shine.angle * 0.62));
    const glowAlpha = preset.glow.opacity * preset.glow.intensity;
    const vars = {
      "--lucio-sprite": `url(\"${sprite}\")`,
      "--glow-color": preset.glow.color,
      "--glow-color-alpha": colorWithAlpha(preset.glow.color, glowAlpha),
      "--glow-size": `${preset.glow.size}px`,
      "--glow-blur": `${preset.glow.blur}px`,
      "--glow-opacity": preset.glow.opacity,
      "--glow-intensity": preset.glow.intensity,
      "--sparkle-color": preset.sparkles.color,
      "--sparkle-opacity": preset.sparkles.opacity,
      "--sparkle-scale": preset.sparkles.scale,
      "--sparkle-speed": `${preset.sparkles.speed}s`,
      "--sparkle-rotation": `${preset.sparkles.rotation}deg`,
      "--sparkle-x": `${preset.sparkles.offsetX}px`,
      "--sparkle-y": `${preset.sparkles.offsetY}px`,
      "--shine-width": `${preset.shine.width}%`,
      "--shine-speed": `${preset.shine.speed}s`,
      "--shine-angle": `${preset.shine.angle}deg`,
      "--shine-slant": `${shineSlant}%`,
      "--shine-intensity": preset.shine.intensity,
      "--shine-frequency": `${preset.shine.frequency}s`,
      "--lightning-intensity": preset.lightning.intensity,
      "--lightning-frequency": `${preset.lightning.frequency}s`,
      "--lightning-opacity": preset.lightning.opacity,
      "--idle-amplitude": `${preset.idle.amplitude}px`,
      "--idle-speed": `${preset.idle.speed}s`,
      "--idle-rotation": `${preset.idle.rotation}deg`,
      "--idle-scale": preset.idle.scale,
      "--pulse-speed": `${preset.pulse.speed}s`,
      "--pulse-intensity": preset.pulse.intensity,
      "--pulse-scale": preset.pulse.scale,
      "--special-scale": preset.specialOverlay.scale,
      "--special-opacity": preset.specialOverlay.opacity,
      "--special-rotation": `${preset.specialOverlay.rotation}deg`,
      "--special-x": `${preset.specialOverlay.offsetX}px`,
      "--special-y": `${preset.specialOverlay.offsetY}px`,
      "--shiny-brightness": preset.shiny.brightness,
      "--shiny-glow-boost": preset.shiny.glowBoost,
      "--shiny-rim-opacity": preset.shiny.rimOpacity,
      "--shiny-rim-size": `${preset.shiny.rimSize}px`,
      "--shiny-rim-scale": shinyRimScale,
      "--shiny-sparkle-color": preset.shiny.sparkleColor,
      "--shiny-overlay-opacity": preset.shiny.overlayOpacity,
      "--shiny-overlay-scale": preset.shiny.overlayScale,
      "--shiny-overlay-speed": `${preset.shiny.overlaySpeed}s`,
      "--shiny-rotation": `${preset.shiny.rotation}deg`,
      "--shiny-x": `${preset.shiny.offsetX}px`,
      "--shiny-y": `${preset.shiny.offsetY}px`,
    };
    Object.entries(vars).forEach(([key, value]) => element.style.setProperty(key, value));
  }

  class LucioRenderer {
    constructor(options) {
      this.options = Object.assign({
        variant: "bronze",
        context: "reveal",
        shiny: false,
        effects: {},
        preset: {},
        label: true,
      }, options || {});

      rendererSequence += 1;
      this.filterIds = {
        sparkles: `lucio-sparkles-${rendererSequence}`,
        shiny: `lucio-shiny-${rendererSequence}`,
      };
      this.element = document.createElement("figure");
      this.element.className = "lucio-renderer";
      this.element.innerHTML = `
        <svg class="lucio-filter-defs" width="0" height="0" aria-hidden="true" focusable="false">
          <defs>
            <filter id="${this.filterIds.sparkles}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
              <feFlood class="lucio-sparkle-flood" flood-color="#ffffff" result="tint"></feFlood>
              <feComposite in="tint" in2="SourceAlpha" operator="in"></feComposite>
            </filter>
            <filter id="${this.filterIds.shiny}" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">
              <feFlood class="lucio-shiny-flood" flood-color="#ffffff" result="tint"></feFlood>
              <feComposite in="tint" in2="SourceAlpha" operator="in"></feComposite>
            </filter>
          </defs>
        </svg>
        <div class="lucio-paint-canvas">
          <div class="lucio-idle-shell">
            <img class="lucio-shiny-rim" draggable="false" alt="" aria-hidden="true">
            <div class="lucio-art">
              <img class="lucio-sprite" draggable="false" alt="">
              <img class="lucio-overlay lucio-overlay--sparkles" draggable="false" alt="" aria-hidden="true">
              <img class="lucio-overlay lucio-overlay--diamond" draggable="false" alt="" aria-hidden="true">
              <img class="lucio-overlay lucio-overlay--cosmic" draggable="false" alt="" aria-hidden="true">
              <img class="lucio-overlay lucio-overlay--shiny" draggable="false" alt="" aria-hidden="true">
              <div class="lucio-shine" aria-hidden="true"><img draggable="false" alt=""></div>
              <div class="lucio-lightning" aria-hidden="true"><i></i><i></i><i></i></div>
            </div>
          </div>
        </div>
        <figcaption class="sr-only"></figcaption>`;

      this.sprite = this.element.querySelector(".lucio-sprite");
      this.shinyRim = this.element.querySelector(".lucio-shiny-rim");
      this.shineSprite = this.element.querySelector(".lucio-shine img");
      this.sparkles = this.element.querySelector(".lucio-overlay--sparkles");
      this.shinySparkles = this.element.querySelector(".lucio-overlay--shiny");
      this.sparkleFlood = this.element.querySelector(".lucio-sparkle-flood");
      this.shinyFlood = this.element.querySelector(".lucio-shiny-flood");
      this.caption = this.element.querySelector("figcaption");
      this.sparkles.src = config.assets.effects.sparkles;
      this.shinySparkles.src = config.assets.effects.shiny;
      this.sparkles.style.filter = `url("#${this.filterIds.sparkles}") drop-shadow(0 0 7px var(--sparkle-color))`;
      this.shinySparkles.style.filter = `url("#${this.filterIds.shiny}") drop-shadow(0 0 8px var(--shiny-sparkle-color))`;
      this.element.querySelector(".lucio-overlay--diamond").src = config.assets.effects.diamond;
      this.element.querySelector(".lucio-overlay--cosmic").src = config.assets.effects.cosmic;
      this.update(this.options);
    }

    update(nextOptions) {
      this.options = Object.assign({}, this.options, nextOptions || {});
      const material = this.options.variant;
      const lucio = config.lucios[material];
      if (!lucio?.sprite) throw new Error(`Variante de Lucio desconocida: ${material}`);

      const effects = Object.assign({}, config.defaultEffects[material], this.options.effects || {});
      const isShiny = Boolean(this.options.shiny || effects.shiny);
      const preset = mergePreset(material, this.options.preset, isShiny);
      const shinyKey = `${material}Shiny`;
      const label = isShiny ? config.lucios[shinyKey].label : `Lucio ${lucio.label}`;

      this.element.dataset.variant = material;
      this.element.dataset.context = this.options.context;
      this.element.classList.toggle("is-shiny", isShiny);
      this.element.classList.toggle("has-glow", Boolean(effects.glow));
      this.element.classList.toggle("has-sparkles", Boolean(effects.sparkles));
      this.element.classList.toggle("has-diamond", Boolean(effects.diamond));
      this.element.classList.toggle("has-cosmic", Boolean(effects.cosmic));
      this.element.classList.toggle("has-shiny-sparkles", Boolean(effects.shinySparkles));
      this.element.classList.toggle("has-shine", Boolean(effects.shine));
      this.element.classList.toggle("has-lightning", Boolean(effects.lightning));
      this.element.classList.toggle("has-pulse", Boolean(effects.pulse));
      this.element.classList.toggle("has-idle", Boolean(effects.idle));
      this.element.style.setProperty("--instance-delay", `${this.options.delay || 0}s`);
      this.sprite.src = lucio.sprite;
      this.shinyRim.src = lucio.sprite;
      this.shineSprite.src = lucio.sprite;
      this.sparkleFlood.setAttribute("flood-color", preset.sparkles.color);
      this.shinyFlood.setAttribute("flood-color", preset.shiny.sparkleColor);
      this.sprite.alt = label;
      this.caption.textContent = label;
      setVars(this.element, preset, lucio.sprite);

      this.currentPreset = preset;
      this.currentEffects = effects;
      return this;
    }

    mount(target) {
      target.appendChild(this.element);
      return this;
    }

    destroy() {
      this.element.remove();
    }
  }

  function createLucioRenderer(options) {
    return new LucioRenderer(options);
  }

  window.LucioRenderer = LucioRenderer;
  window.createLucioRenderer = createLucioRenderer;
  window.LucioPreset = { merge: mergePreset, clone: deepClone };
})();
