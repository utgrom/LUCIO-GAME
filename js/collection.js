(function () {
  "use strict";

  const config = window.GAME_CONFIG;
  const createRenderer = window.createLucioRenderer;
  let collectionSequence = 0;

  const effectDefaults = Object.freeze({
    particleStride: 4,
    shinyParticleStride: 3,
    idleDelayStep: 0.23,
    idleDelayCycle: 3.2,
  });

  function asCount(value) {
    const count = Math.floor(Number(value));
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  function isElement(value) {
    return Boolean(value && value.nodeType === 1 && typeof value.appendChild === "function");
  }

  function splitVariant(key) {
    const shiny = key.endsWith("Shiny");
    return {
      material: shiny ? key.slice(0, -"Shiny".length) : key,
      shiny,
    };
  }

  function normalizeArguments(container, counts, options) {
    if (!isElement(container) && container && typeof container === "object") {
      return {
        container: container.container,
        counts: container.counts,
        options: container.options || container,
      };
    }
    return { container, counts, options: options || {} };
  }

  class LucioCollection {
    constructor(container, counts, options) {
      if (!config || typeof createRenderer !== "function") {
        throw new Error("LucioCollection requiere GAME_CONFIG y createLucioRenderer.");
      }

      const normalized = normalizeArguments(container, counts, options);
      if (!isElement(normalized.container)) {
        throw new TypeError("LucioCollection requiere un elemento contenedor válido.");
      }

      this.container = normalized.container;
      this.options = Object.assign({}, effectDefaults, normalized.options || {});
      this.settings = Object.assign(
        {},
        config.collection || {},
        normalized.options || {},
        normalized.options?.collection || normalized.options?.layout || {}
      );
      this.counts = {};
      this.categories = [];
      this.renderers = [];
      this.destroyed = false;
      this.layoutFrame = 0;

      collectionSequence += 1;
      this.id = collectionSequence;
      this.element = document.createElement("div");
      this.element.className = "lucio-collection";
      this.element.dataset.collectionId = String(this.id);
      this.container.replaceChildren(this.element);

      this.handleResize = () => this.scheduleLayout();
      if (typeof window.ResizeObserver === "function") {
        this.resizeObserver = new window.ResizeObserver(this.handleResize);
        this.resizeObserver.observe(this.container);
      } else {
        window.addEventListener("resize", this.handleResize, { passive: true });
      }

      this.update(normalized.counts || {});
    }

    collectionPreset(material) {
      const scale = Math.max(0, Number(config.performance?.collectionEffectScale) || 0.62);
      const materialPreset = config.visualPresets?.[material] || {};
      const shared = config.visualPresets?.shared || {};
      const sparkle = materialPreset.sparkles || {};
      const idle = shared.idle || {};

      return {
        glow: {
          size: (Number(materialPreset.glow?.size) || 0) * scale,
          blur: (Number(materialPreset.glow?.blur) || 0) * scale,
        },
        sparkles: {
          opacity: (Number(sparkle.opacity) || 0) * scale,
        },
        idle: {
          amplitude: (Number(idle.amplitude) || 0) * scale,
          rotation: (Number(idle.rotation) || 0) * scale,
          scale: 1 + ((Number(idle.scale) || 1) - 1) * scale,
        },
      };
    }

    collectionEffects(material, shiny, index) {
      const base = config.defaultEffects?.[material] || {};
      const particleStride = Math.max(1, Math.floor(Number(this.options.particleStride) || 1));
      const shinyStride = Math.max(1, Math.floor(Number(this.options.shinyParticleStride) || 1));
      const optimized = {
        glow: Boolean(base.glow),
        sparkles: Boolean(base.sparkles && index % particleStride === 0),
        diamond: Boolean(base.diamond),
        cosmic: Boolean(base.cosmic),
        shiny,
        shinySparkles: Boolean(shiny && index % shinyStride === 0),
        shine: false,
        pulse: false,
        idle: true,
      };

      const override = typeof this.options.effects === "function"
        ? this.options.effects({ material, shiny, index, effects: optimized })
        : this.options.effects;
      return Object.assign(optimized, override || {});
    }

    idleDelay(categoryIndex, itemIndex) {
      const step = Number(this.options.idleDelayStep) || effectDefaults.idleDelayStep;
      const cycle = Math.max(step, Number(this.options.idleDelayCycle) || effectDefaults.idleDelayCycle);
      return -(((categoryIndex * 0.41) + (itemIndex * step)) % cycle);
    }

    createCategory(key, count, categoryIndex) {
      const variant = splitVariant(key);
      const descriptor = config.lucios?.[key];
      const materialDescriptor = config.lucios?.[variant.material];
      if (!descriptor || !materialDescriptor?.sprite) return null;

      const section = document.createElement("section");
      section.className = "collection-category";
      section.dataset.variant = key;
      section.dataset.material = variant.material;
      section.dataset.shiny = String(variant.shiny);
      section.dataset.count = String(count);

      const titleId = `lucio-collection-${this.id}-${key}-title`;
      section.setAttribute("aria-labelledby", titleId);

      const header = document.createElement("h3");
      header.className = "collection-category__header";
      header.id = titleId;

      const title = document.createElement("span");
      title.className = "collection-category__title";
      title.textContent = `LUCIO ${descriptor.label.toLocaleUpperCase("es-AR")}`;

      const quantity = document.createElement("span");
      quantity.className = "collection-category__count";
      quantity.textContent = `\u00D7${count.toLocaleString("es-AR")}`;
      header.append(title, quantity);

      const track = document.createElement("div");
      track.className = "collection-category__track";

      const maxVisible = Math.max(1, Math.floor(Number(this.settings.maxVisibleItems) || 1));
      const visibleCount = Math.min(count, maxVisible);
      const copies = [];
      for (let index = 0; index < visibleCount; index += 1) {
        const renderer = createRenderer({
          variant: variant.material,
          shiny: variant.shiny,
          context: "collection",
          effects: this.collectionEffects(variant.material, variant.shiny, index),
          preset: this.collectionPreset(variant.material),
          delay: this.idleDelay(categoryIndex, index),
        });
        const copy = document.createElement("div");
        copy.className = "collection-lucio";
        copy.dataset.index = String(index);
        copy.setAttribute("aria-hidden", "true");
        copy.appendChild(renderer.element);
        track.appendChild(copy);
        copies.push(copy);
        this.renderers.push(renderer);
      }

      const more = document.createElement("span");
      more.className = "collection-category__more";
      more.textContent = "\u2026";
      more.setAttribute("aria-hidden", "true");
      track.appendChild(more);
      section.append(header, track);

      return { key, count, section, track, copies, more };
    }

    update(counts) {
      if (this.destroyed) return this;

      this.renderers.forEach((renderer) => renderer.destroy());
      this.renderers = [];
      this.categories = [];
      this.counts = {};
      this.element.replaceChildren();

      const fragment = document.createDocumentFragment();
      config.collectionOrder.forEach((key) => {
        const count = asCount(counts?.[key]);
        this.counts[key] = count;
        if (count === 0) return;

        const category = this.createCategory(key, count, this.categories.length);
        if (!category) return;
        this.categories.push(category);
        fragment.appendChild(category.section);
      });
      this.element.appendChild(fragment);
      this.element.hidden = this.categories.length === 0;
      this.scheduleLayout();
      return this;
    }

    scheduleLayout() {
      if (this.destroyed || this.layoutFrame) return;
      this.layoutFrame = window.requestAnimationFrame(() => {
        this.layoutFrame = 0;
        this.layout();
      });
    }

    layoutCategory(category) {
      const itemWidth = Math.max(1, Number(this.settings.itemWidth) || 1);
      const naturalGap = Math.max(0, Number(this.settings.naturalGap) || 0);
      const naturalStep = itemWidth + naturalGap;
      const minimumSpacing = Math.max(0, Number(this.settings.minimumSpacing) || 0);
      const maximumOverlap = Math.max(0, Number(this.settings.maximumOverlap) || 0);
      const minimumStep = Math.max(minimumSpacing, itemWidth - maximumOverlap);
      const compactStart = Math.max(1, Math.floor(Number(this.settings.compactStart) || 1));
      const maxVisible = Math.max(1, Math.floor(Number(this.settings.maxVisibleItems) || 1));
      const fadeStart = Math.max(1, Math.floor(Number(this.settings.fadeStart) || maxVisible + 1));
      const fadeLength = Math.max(1, Math.floor(Number(this.settings.fadeLength) || 1));
      const copies = category.copies;
      if (copies.length === 0) return;

      const fadeActive = category.count >= fadeStart || category.count > copies.length;
      const reserve = fadeActive ? 30 : 0;
      const available = Math.max(itemWidth, category.track.clientWidth - reserve);
      const naturalWidth = itemWidth + naturalStep * Math.max(0, copies.length - 1);
      const fitStep = copies.length > 1
        ? (available - itemWidth) / (copies.length - 1)
        : naturalStep;

      const densityCount = Math.min(category.count, maxVisible);
      const densityProgress = maxVisible <= compactStart
        ? Number(category.count > compactStart)
        : Math.max(0, Math.min(1,
          (densityCount - compactStart) / (maxVisible - compactStart)
        ));
      const progressiveStep = naturalStep - (naturalStep - minimumStep) * densityProgress;
      let step = category.count > compactStart ? progressiveStep : naturalStep;
      if (naturalWidth > available) step = Math.min(step, fitStep);
      step = Math.max(minimumStep, Math.min(naturalStep, step));

      const fadeStartIndex = Math.max(0, copies.length - Math.min(fadeLength, copies.length));
      copies.forEach((copy, index) => {
        copy.style.width = `${itemWidth}px`;
        copy.style.transform = `translateX(${index * step}px)`;
        copy.style.zIndex = String(index + 1);
        copy.classList.toggle("is-fading", fadeActive && index >= fadeStartIndex);

        let opacity = 1;
        if (fadeActive && index >= fadeStartIndex) {
          const progress = (index - fadeStartIndex + 1) / Math.max(1, copies.length - fadeStartIndex);
          opacity = Math.max(0.06, 1 - progress * 0.88);
        }
        copy.style.opacity = String(opacity);
      });

      category.section.classList.toggle("is-compacted", step < naturalStep - 0.5);
      category.section.classList.toggle("has-overflow", fadeActive);
      category.track.style.setProperty("--collection-item-width", `${itemWidth}px`);
      category.track.style.setProperty("--collection-item-step", `${step}px`);
      category.track.style.height = `${itemWidth * 1.5 + 8}px`;
      category.more.hidden = !fadeActive;
      if (fadeActive) {
        const finalX = (copies.length - 1) * step;
        category.more.style.left = `${Math.max(0, Math.min(category.track.clientWidth - 26, finalX + itemWidth * 0.42))}px`;
      }
    }

    layout() {
      if (this.destroyed) return this;
      this.categories.forEach((category) => this.layoutCategory(category));
      return this;
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      if (this.layoutFrame) {
        window.cancelAnimationFrame(this.layoutFrame);
        this.layoutFrame = 0;
      }
      if (this.resizeObserver) this.resizeObserver.disconnect();
      else window.removeEventListener("resize", this.handleResize);
      this.renderers.forEach((renderer) => renderer.destroy());
      this.renderers = [];
      this.categories = [];
      this.element.remove();
    }
  }

  window.LucioCollection = LucioCollection;
})();
