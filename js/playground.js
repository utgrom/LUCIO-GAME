(function () {
  "use strict";

  const config = window.GAME_CONFIG;

  const lucioControlDefinitions = [
    { title: "Glow", fields: [
      { path: "glow.color", label: "Color", type: "color" },
      { path: "glow.size", label: "Tamaño", min: 0, max: 70, step: 1, unit: "px" },
      { path: "glow.blur", label: "Blur", min: 0, max: 75, step: 1, unit: "px" },
      { path: "glow.opacity", label: "Opacidad", min: 0, max: 1, step: 0.01 },
      { path: "glow.intensity", label: "Intensidad", min: 0, max: 1.5, step: 0.01 },
    ]},
    { title: "Destellos", fields: [
      { path: "sparkles.color", label: "Color", type: "color" },
      { path: "sparkles.opacity", label: "Opacidad", min: 0, max: 1, step: 0.01 },
      { path: "sparkles.scale", label: "Escala", min: 0.7, max: 1.4, step: 0.01 },
      { path: "sparkles.speed", label: "Velocidad", min: 0.4, max: 7, step: 0.05, unit: "s" },
      { path: "sparkles.rotation", label: "Rotación", min: -15, max: 15, step: 0.5, unit: "°" },
      { path: "sparkles.offsetX", label: "Offset X", min: -50, max: 50, step: 1, unit: "px" },
      { path: "sparkles.offsetY", label: "Offset Y", min: -50, max: 50, step: 1, unit: "px" },
    ]},
    { title: "Shiny", fields: [
      { path: "shiny.brightness", label: "Brillo base", min: 1, max: 1.8, step: 0.01 },
      { path: "shiny.glowBoost", label: "Boost del borde", min: 0, max: 0.7, step: 0.01 },
      { path: "shiny.rimOpacity", label: "Opacidad del borde", min: 0, max: 1, step: 0.01 },
      { path: "shiny.rimSize", label: "Tamaño del borde", min: 0, max: 40, step: 1, unit: "px" },
      { path: "shiny.sparkleColor", label: "Color destellos", type: "color" },
      { path: "shiny.overlayOpacity", label: "Opacidad destellos", min: 0, max: 1, step: 0.01 },
      { path: "shiny.overlayScale", label: "Escala destellos", min: 0.7, max: 1.4, step: 0.01 },
      { path: "shiny.overlaySpeed", label: "Velocidad destellos", min: 0.3, max: 6, step: 0.05, unit: "s" },
      { path: "shiny.rotation", label: "Rotación", min: -15, max: 15, step: 0.5, unit: "°" },
      { path: "shiny.offsetX", label: "Offset X", min: -50, max: 50, step: 1, unit: "px" },
      { path: "shiny.offsetY", label: "Offset Y", min: -50, max: 50, step: 1, unit: "px" },
    ]},
    { title: "Shine sweep", fields: [
      { path: "shine.width", label: "Anchura", min: 5, max: 65, step: 1, unit: "%" },
      { path: "shine.speed", label: "Velocidad", min: 0.3, max: 5, step: 0.05, unit: "s" },
      { path: "shine.angle", label: "Ángulo", min: -70, max: 70, step: 1, unit: "°" },
      { path: "shine.intensity", label: "Intensidad", min: 0, max: 1.5, step: 0.01 },
      { path: "shine.frequency", label: "Frecuencia", min: 0.3, max: 8, step: 0.1, unit: "s" },
    ]},
    { title: "Rayos", fields: [
      { path: "lightning.intensity", label: "Intensidad", min: 0, max: 1.5, step: 0.01 },
      { path: "lightning.frequency", label: "Frecuencia", min: 0.4, max: 7, step: 0.1, unit: "s" },
      { path: "lightning.opacity", label: "Opacidad", min: 0, max: 1, step: 0.01 },
    ]},
    { title: "Idle", fields: [
      { path: "idle.amplitude", label: "Amplitud", min: 0, max: 22, step: 1, unit: "px" },
      { path: "idle.speed", label: "Velocidad", min: 0.5, max: 8, step: 0.1, unit: "s" },
      { path: "idle.rotation", label: "Rotación", min: 0, max: 5, step: 0.1, unit: "°" },
      { path: "idle.scale", label: "Escala", min: 1, max: 1.08, step: 0.001 },
    ]},
    { title: "Pulsación", fields: [
      { path: "pulse.speed", label: "Velocidad", min: 0.3, max: 7, step: 0.05, unit: "s" },
      { path: "pulse.intensity", label: "Intensidad", min: 0, max: 0.8, step: 0.01 },
      { path: "pulse.scale", label: "Escala", min: 1, max: 1.12, step: 0.002 },
    ]},
    { title: "Overlays especiales", fields: [
      { path: "specialOverlay.scale", label: "Escala", min: 0.7, max: 1.4, step: 0.01 },
      { path: "specialOverlay.opacity", label: "Opacidad", min: 0, max: 1, step: 0.01 },
      { path: "specialOverlay.rotation", label: "Rotación", min: -15, max: 15, step: 0.5, unit: "°" },
      { path: "specialOverlay.offsetX", label: "Offset X", min: -50, max: 50, step: 1, unit: "px" },
      { path: "specialOverlay.offsetY", label: "Offset Y", min: -50, max: 50, step: 1, unit: "px" },
    ]},
  ];

  const openingControlDefinitions = [
    { path: "entryDuration", label: "Duración de entrada", min: 0, max: 2200, step: 20, unit: "ms" },
    { path: "shakeStrength", label: "Fuerza del shake", min: 0, max: 45, step: 1, unit: "px" },
    { path: "shakeDuration", label: "Duración del shake", min: 80, max: 900, step: 10, unit: "ms" },
    { path: "shakeRotation", label: "Rotación del shake", min: 0, max: 16, step: 0.5, unit: "°" },
    { path: "impactScale", label: "Escala de impacto", min: 1, max: 1.3, step: 0.01 },
    { path: "flashDuration", label: "Duración del flash", min: 80, max: 1500, step: 10, unit: "ms" },
    { path: "flashIntensity", label: "Intensidad del flash", min: 0, max: 1, step: 0.01 },
    { path: "openingDuration", label: "Velocidad de apertura", min: 80, max: 1800, step: 20, unit: "ms" },
    { path: "lucioDelay", label: "Delay antes del Lucio", min: 0, max: 1200, step: 10, unit: "ms" },
    { path: "riseDuration", label: "Velocidad de subida", min: 120, max: 2400, step: 20, unit: "ms" },
    { path: "riseDistance", label: "Distancia de subida", min: 20, max: 260, step: 2, unit: "px" },
    { path: "finalBounce", label: "Bounce final", min: 1, max: 1.35, step: 0.01 },
    { path: "revealDuration", label: "Duración del reveal", min: 120, max: 3000, step: 20, unit: "ms" },
    { path: "mysterySwapPoint", label: "Punto de cambio Mistery", min: 0.15, max: 0.95, step: 0.01 },
    { path: "mysteryFadeDuration", label: "Fade Mistery → drop", min: 0, max: 1200, step: 10, unit: "ms" },
  ];

  const collectionControlDefinitions = [
    { path: "compactStart", label: "Comenzar compactación", min: 2, max: 30, step: 1 },
    { path: "minimumSpacing", label: "Separación mínima", min: 2, max: 50, step: 1, unit: "px" },
    { path: "maximumOverlap", label: "Solapamiento máximo", min: 0, max: 75, step: 1, unit: "px" },
    { path: "maxVisibleItems", label: "Máximo visible", min: 3, max: 50, step: 1 },
    { path: "fadeStart", label: "Comenzar fade", min: 3, max: 50, step: 1 },
    { path: "fadeLength", label: "Longitud del fade", min: 1, max: 12, step: 1 },
    { path: "itemWidth", label: "Ancho por Lucio", min: 44, max: 120, step: 1, unit: "px" },
    { path: "naturalGap", label: "Separación inicial", min: 0, max: 30, step: 1, unit: "px" },
  ];

  function getPath(object, path) {
    return path.split(".").reduce((value, key) => value[key], object);
  }

  function setPath(object, path, value) {
    const keys = path.split(".");
    const last = keys.pop();
    const parent = keys.reduce((value, key) => value[key], object);
    parent[last] = value;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function formatValue(value, unit = "") {
    const numeric = Number(value);
    const display = Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    return `${display}${unit}`;
  }

  function makeControlGroup(definition, values, onInput) {
    const group = document.createElement("div");
    group.className = "control-group";
    const title = document.createElement("h3");
    title.textContent = definition.title;
    group.appendChild(title);

    const columns = document.createElement("div");
    columns.className = definition.fields.length > 3 ? "control-columns" : "";
    definition.fields.forEach((field) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.dataset.path = field.path;
      const current = getPath(values, field.path);

      if (field.type === "color") {
        label.className = "field";
        const text = document.createElement("span");
        text.textContent = field.label;
        input.type = "color";
        input.value = current;
        label.append(text, input);
      } else {
        label.className = "range-field";
        const top = document.createElement("span");
        top.className = "range-top";
        const name = document.createElement("span");
        name.textContent = field.label;
        const output = document.createElement("output");
        output.className = "range-value";
        output.textContent = formatValue(current, field.unit);
        top.append(name, output);
        input.type = "range";
        input.min = field.min;
        input.max = field.max;
        input.step = field.step;
        input.value = current;
        input.addEventListener("input", () => {
          output.textContent = formatValue(input.value, field.unit);
        });
        label.append(top, input);
      }

      input.addEventListener("input", () => {
        onInput(field.path, field.type === "color" ? input.value : Number(input.value));
      });
      columns.appendChild(label);
    });
    group.appendChild(columns);
    return group;
  }

  const toast = document.querySelector("[data-toast]");
  let toastTimer;
  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  // Lucio FX playground
  const materialSelect = document.querySelector("[data-lucio-material]");
  const lucioStage = document.querySelector("[data-lucio-stage]");
  const parameterHost = document.querySelector("[data-lucio-parameter-controls]");
  const effectInputs = Array.from(document.querySelectorAll("[data-effect]"));
  const performanceGrid = document.querySelector("[data-performance-grid]");
  const performanceCopy = document.querySelector("[data-performance-copy]");
  const performanceContextSelect = document.querySelector("[data-performance-context]");
  let material = materialSelect.value;
  let runtimePreset = window.LucioPreset.merge(material);
  let runtimeEffects = clone(config.defaultEffects[material]);
  let performanceCount = 1;
  let performanceRenderers = [];
  let collectionValues = clone(config.collection);
  let collectionLayoutFrame = 0;

  const heroRenderer = window.createLucioRenderer({
    variant: material,
    context: "reveal",
    effects: runtimeEffects,
    preset: runtimePreset,
  }).mount(lucioStage);

  function syncEffectInputs() {
    effectInputs.forEach((input) => { input.checked = Boolean(runtimeEffects[input.dataset.effect]); });
  }

  function renderLucioControls() {
    parameterHost.replaceChildren();
    lucioControlDefinitions.forEach((definition) => {
      parameterHost.appendChild(makeControlGroup(definition, runtimePreset, (path, value) => {
        setPath(runtimePreset, path, value);
        refreshLucios(false);
      }));
    });
  }

  function refreshLucios(rebuildPerformance = true) {
    heroRenderer.update({
      variant: material,
      shiny: runtimeEffects.shiny,
      effects: runtimeEffects,
      preset: runtimePreset,
    });
    if (rebuildPerformance) renderPerformance(performanceCount);
    else performanceRenderers.forEach((renderer) => renderer.update({ preset: runtimePreset, effects: runtimeEffects, shiny: runtimeEffects.shiny }));
  }

  function renderPerformance(count) {
    performanceCount = count;
    performanceRenderers.forEach((renderer) => renderer.destroy());
    performanceRenderers = [];
    performanceGrid.replaceChildren();
    const context = performanceContextSelect.value;
    performanceGrid.dataset.total = count;
    const header = document.createElement("div");
    header.className = "collection-demo-head";
    const rewardName = runtimeEffects.shiny ? `${material}Shiny` : material;
    header.innerHTML = `<strong>LUCIO ${config.lucios[rewardName].label.toUpperCase()}</strong><span>×${count}</span>`;
    const track = document.createElement("div");
    track.className = "collection-demo-track";
    const visibleCount = Math.min(count, collectionValues.maxVisibleItems);
    for (let index = 0; index < visibleCount; index += 1) {
      const renderer = window.createLucioRenderer({
        variant: material,
        shiny: runtimeEffects.shiny,
        context,
        effects: runtimeEffects,
        preset: runtimePreset,
        delay: -(index % 9) * 0.21,
      });
      const copy = document.createElement("div");
      copy.className = "collection-copy";
      copy.dataset.index = index;
      copy.appendChild(renderer.element);
      track.appendChild(copy);
      performanceRenderers.push(renderer);
    }
    const more = document.createElement("span");
    more.className = "collection-more";
    more.textContent = "…";
    more.hidden = count <= visibleCount;
    track.appendChild(more);
    performanceGrid.append(header, track);
    const contextLabel = context === "reveal" ? "FX completos" : "colección optimizada";
    performanceCopy.textContent = `${count} ${count === 1 ? "instancia" : "instancias"} · ${contextLabel}`;
    cancelAnimationFrame(collectionLayoutFrame);
    collectionLayoutFrame = requestAnimationFrame(layoutCollectionDemo);
  }

  function layoutCollectionDemo() {
    const track = performanceGrid.querySelector(".collection-demo-track");
    if (!track) return;
    const copies = Array.from(track.querySelectorAll(".collection-copy"));
    if (!copies.length) return;
    const total = performanceCount;
    const itemWidth = collectionValues.itemWidth;
    const more = track.querySelector(".collection-more");
    const reserve = total > copies.length ? 28 : 0;
    const available = Math.max(itemWidth, track.clientWidth - reserve);
    const naturalStep = itemWidth + collectionValues.naturalGap;
    const fitStep = copies.length > 1 ? (available - itemWidth) / (copies.length - 1) : naturalStep;
    const minimumStep = Math.max(collectionValues.minimumSpacing, itemWidth - collectionValues.maximumOverlap);
    let step = naturalStep;
    if (total > collectionValues.compactStart || naturalStep * copies.length > available) {
      step = Math.min(naturalStep, Math.max(minimumStep, fitStep));
    }
    const fadeActive = total >= collectionValues.fadeStart || total > copies.length;
    const fadeStartIndex = Math.max(0, copies.length - collectionValues.fadeLength);
    copies.forEach((copy, index) => {
      copy.style.width = `${itemWidth}px`;
      copy.style.transform = `translateX(${index * step}px)`;
      copy.style.zIndex = index;
      let opacity = 1;
      if (fadeActive && index >= fadeStartIndex) {
        const progress = (index - fadeStartIndex + 1) / Math.max(1, copies.length - fadeStartIndex);
        opacity = Math.max(0.06, 1 - progress * 0.88);
      }
      copy.style.opacity = opacity;
    });
    track.style.height = `${itemWidth * 1.5 + 8}px`;
    if (more && !more.hidden) {
      const lastX = (copies.length - 1) * step;
      more.style.left = `${Math.min(track.clientWidth - 26, lastX + itemWidth * 0.42)}px`;
    }
  }

  materialSelect.addEventListener("change", () => {
    material = materialSelect.value;
    runtimePreset = window.LucioPreset.merge(material);
    runtimeEffects = clone(config.defaultEffects[material]);
    syncEffectInputs();
    renderLucioControls();
    refreshLucios();
  });

  effectInputs.forEach((input) => {
    input.addEventListener("change", () => {
      runtimeEffects[input.dataset.effect] = input.checked;
      refreshLucios();
    });
  });

  document.querySelector("[data-copy-preset]").addEventListener("click", async () => {
    const exportValue = {
      material,
      effects: runtimeEffects,
      preset: runtimePreset,
    };
    const text = JSON.stringify(exportValue, null, 2);
    let copied = false;
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (_) {
      const fallback = document.createElement("textarea");
      fallback.value = text;
      fallback.style.position = "fixed";
      fallback.style.opacity = "0";
      document.body.appendChild(fallback);
      fallback.select();
      copied = document.execCommand("copy");
      fallback.remove();
    }
    showToast(copied ? `Preset de ${config.lucios[material].label} copiado.` : "No se pudo acceder al portapapeles.");
  });

  document.querySelector("[data-reset-preset]").addEventListener("click", () => {
    runtimePreset = window.LucioPreset.merge(material);
    runtimeEffects = clone(config.defaultEffects[material]);
    syncEffectInputs();
    renderLucioControls();
    refreshLucios();
    showToast("Preset restaurado desde config.js.");
  });

  document.querySelectorAll("[data-count]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-count]").forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
      renderPerformance(Number(button.dataset.count));
    });
  });
  performanceContextSelect.addEventListener("change", () => renderPerformance(performanceCount));
  window.addEventListener("resize", () => {
    cancelAnimationFrame(collectionLayoutFrame);
    collectionLayoutFrame = requestAnimationFrame(layoutCollectionDemo);
  });

  // Lightweight FPS readout for comparative device testing.
  const fpsOutput = document.querySelector("[data-fps]");
  let fpsFrames = 0;
  let fpsStart = performance.now();
  function sampleFps(now) {
    fpsFrames += 1;
    const elapsed = now - fpsStart;
    if (elapsed >= 900) {
      fpsOutput.textContent = `${Math.round((fpsFrames * 1000) / elapsed)} FPS`;
      fpsFrames = 0;
      fpsStart = now;
    }
    requestAnimationFrame(sampleFps);
  }

  // Opening playground
  const openingRoot = document.querySelector("[data-opening-root]");
  const backpackSelect = document.querySelector("[data-backpack-select]");
  const backpackView = document.querySelector("[data-backpack-view]");
  const rewardSelect = document.querySelector("[data-reward-select]");
  const openingParameters = document.querySelector("[data-opening-parameter-controls]");
  let openingValues = clone(config.opening);

  const randomOption = document.createElement("option");
  randomOption.value = "random";
  randomOption.textContent = "Random · probabilidades reales";
  rewardSelect.appendChild(randomOption);
  config.lucioOrder.forEach((variant) => {
    [false, true].forEach((shiny) => {
      const option = document.createElement("option");
      option.value = shiny ? `${variant}Shiny` : variant;
      option.textContent = `Lucio ${config.lucios[shiny ? `${variant}Shiny` : variant].label}`;
      if (variant === "cosmic" && shiny) option.selected = true;
      rewardSelect.appendChild(option);
    });
  });

  const openingSequence = new window.OpeningSequence(openingRoot, {
    backpack: backpackSelect.value,
    reward: rewardSelect.value,
    timings: openingValues,
    onConfirm(reward) {
      backpackView.value = "closed";
      const key = reward.shiny ? `${reward.material}Shiny` : reward.material;
      showToast(`${config.lucios[key].label} confirmado. Secuencia lista para repetir.`);
    },
  });

  function renderOpeningControls() {
    openingParameters.replaceChildren();
    const definition = { title: "Parámetros de apertura", fields: openingControlDefinitions };
    openingParameters.appendChild(makeControlGroup(definition, openingValues, (path, value) => {
      openingValues[path] = value;
      openingSequence.applyTimings(openingValues);
    }));
  }

  function renderCollectionControls() {
    const host = document.querySelector("[data-collection-parameter-controls]");
    host.replaceChildren();
    const definition = { title: "Colección", fields: collectionControlDefinitions };
    host.appendChild(makeControlGroup(definition, collectionValues, (path, value) => {
      collectionValues[path] = value;
      renderPerformance(performanceCount);
    }));
  }

  backpackSelect.addEventListener("change", () => {
    openingSequence.setBackpack(backpackSelect.value);
    if (backpackView.value === "open") openingSequence.showOpenBackpack();
  });
  backpackView.addEventListener("change", () => {
    openingSequence.reset();
    if (backpackView.value === "open") openingSequence.showOpenBackpack();
  });
  rewardSelect.addEventListener("change", () => openingSequence.setReward(rewardSelect.value));
  document.querySelector("[data-start-opening]").addEventListener("click", () => {
    backpackView.value = "closed";
    openingSequence.options.reward = rewardSelect.value;
    openingSequence.start();
  });
  document.querySelector("[data-reset-opening]").addEventListener("click", () => {
    backpackView.value = "closed";
    openingSequence.reset();
  });

  syncEffectInputs();
  renderLucioControls();
  renderPerformance(1);
  renderOpeningControls();
  renderCollectionControls();
  requestAnimationFrame(sampleFps);
})();
