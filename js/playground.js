(function () {
  "use strict";

  const config = window.GAME_CONFIG;

  const materialControlDefinitions = [
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
    { title: "Idle", fields: [
      { path: "idle.amplitude", label: "Amplitud", min: 0, max: 22, step: 1, unit: "px" },
      { path: "idle.speed", label: "Velocidad", min: 0.5, max: 8, step: 0.1, unit: "s" },
      { path: "idle.rotation", label: "Rotación", min: 0, max: 5, step: 0.1, unit: "°" },
      { path: "idle.scale", label: "Escala", min: 1, max: 1.08, step: 0.001 },
    ]},
    { title: "Pulsación base", fields: [
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

  const shinyControlDefinitions = [
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
    { title: "Override de pulsación", fields: [
      { path: "pulse.speed", label: "Velocidad", min: 0.3, max: 7, step: 0.05, unit: "s" },
      { path: "pulse.intensity", label: "Intensidad", min: 0, max: 0.8, step: 0.01 },
      { path: "pulse.scale", label: "Escala", min: 1, max: 1.12, step: 0.002 },
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

  function makeControlGroup(definition, values, onInput, onReset) {
    const group = document.createElement("div");
    group.className = "control-group";
    const title = document.createElement("h3");
    title.textContent = definition.title;
    if (onReset) {
      const heading = document.createElement("div");
      heading.className = "control-group-heading";
      const reset = document.createElement("button");
      reset.className = "layer-reset";
      reset.type = "button";
      reset.textContent = "Reset capa";
      reset.addEventListener("click", onReset);
      heading.append(title, reset);
      group.appendChild(heading);
    } else {
      group.appendChild(title);
    }

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
  const shinyParameterHost = document.querySelector("[data-shiny-parameter-controls]");
  const shinyModifierInput = document.querySelector("[data-shiny-modifier]");
  const effectInputs = Array.from(document.querySelectorAll("[data-effect]"));
  const performanceGrid = document.querySelector("[data-performance-grid]");
  const performanceCopy = document.querySelector("[data-performance-copy]");
  const performanceContextSelect = document.querySelector("[data-performance-context]");
  const materialEditorTitle = document.querySelector("[data-material-editor-title]");
  const libraryScope = document.querySelector("[data-library-scope]");
  const libraryScopeSelect = document.querySelector("[data-library-scope-select]");
  const libraryStatus = document.querySelector("[data-library-status]");
  const versionSelect = document.querySelector("[data-preset-version-select]");
  const loadVersionButton = document.querySelector("[data-load-version]");
  const deleteVersionButton = document.querySelector("[data-delete-version]");
  const importFile = document.querySelector("[data-import-file]");
  const STORAGE_KEY = "lucioFxPresetLibrary.v1";
  const MATERIAL_EFFECT_KEYS = ["glow", "sparkles", "diamond", "cosmic", "pulse", "idle"];
  let material = materialSelect.value;
  let materialDrafts = Object.fromEntries(config.lucioOrder.map((key) => [key, createMaterialDefault(key)]));
  let materialEffectDrafts = Object.fromEntries(config.lucioOrder.map((key) => [key, pickMaterialEffects(config.defaultEffects[key])]));
  let shinyDraft = createShinyDefault();
  let shinyEnabled = false;
  let runtimePreset = composeRuntimePreset(material);
  let runtimeEffects = composeRuntimeEffects();
  let activeLibraryScope = material;
  let presetLibrary = loadPresetLibrary();
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

  function createMaterialDefault(materialKey) {
    const merged = window.LucioPreset.merge(materialKey, {}, false);
    return Object.fromEntries(["glow", "sparkles", "idle", "pulse", "specialOverlay"].map((key) => [key, clone(merged[key])]));
  }

  function createShinyDefault() {
    return clone(config.visualPresets.shinyModifier);
  }

  function composeRuntimePreset(materialKey = material) {
    const composed = Object.assign({}, clone(materialDrafts[materialKey]), clone(shinyDraft));
    composed.pulse = clone(shinyEnabled ? shinyDraft.pulse : materialDrafts[materialKey].pulse);
    return composed;
  }

  function pickMaterialEffects(effects) {
    return Object.fromEntries(MATERIAL_EFFECT_KEYS.map((key) => [key, Boolean(effects[key])]));
  }

  function composeRuntimeEffects() {
    return Object.assign({}, clone(materialEffectDrafts[material]), {
      shiny: shinyEnabled,
      shinySparkles: shinyEnabled,
      shine: shinyEnabled,
      pulse: shinyEnabled ? true : Boolean(materialEffectDrafts[material].pulse),
    });
  }

  function applyShinyEffects() {
    runtimeEffects = composeRuntimeEffects();
    runtimePreset = composeRuntimePreset();
  }

  function loadPresetLibrary() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return parsed?.schemaVersion === 1 && parsed.materials && Array.isArray(parsed.shinyModifier) ? parsed : emptyPresetLibrary();
    } catch (_) {
      return emptyPresetLibrary();
    }
  }

  function emptyPresetLibrary() {
    return { schemaVersion: 1, materials: Object.fromEntries(config.lucioOrder.map((key) => [key, []])), shinyModifier: [] };
  }

  function persistPresetLibrary() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presetLibrary));
  }

  function currentVersions() {
    return activeLibraryScope === "shinyModifier" ? presetLibrary.shinyModifier : presetLibrary.materials[activeLibraryScope];
  }

  function syncEffectInputs() {
    effectInputs.forEach((input) => { input.checked = Boolean(materialEffectDrafts[material][input.dataset.effect]); });
    shinyModifierInput.checked = shinyEnabled;
  }

  function renderLucioControls() {
    parameterHost.replaceChildren();
    materialControlDefinitions.forEach((definition) => {
      const layerKey = definition.fields[0].path.split(".")[0];
      parameterHost.appendChild(makeControlGroup(definition, materialDrafts[material], (path, value) => {
        setPath(materialDrafts[material], path, value);
        runtimePreset = composeRuntimePreset();
        refreshLucios(false);
      }, () => {
        materialDrafts[material][layerKey] = createMaterialDefault(material)[layerKey];
        runtimePreset = composeRuntimePreset();
        renderLucioControls();
        refreshLucios(false);
        showToast(`${definition.title} restaurado para ${config.lucios[material].label}.`);
      }));
    });
    materialEditorTitle.textContent = config.lucios[material].label;
  }

  function renderShinyControls() {
    shinyParameterHost.replaceChildren();
    shinyControlDefinitions.forEach((definition) => {
      const layerKey = definition.fields[0].path.split(".")[0];
      shinyParameterHost.appendChild(makeControlGroup(definition, shinyDraft, (path, value) => {
        setPath(shinyDraft, path, value);
        runtimePreset = composeRuntimePreset();
        refreshLucios(false);
      }, () => {
        shinyDraft[layerKey] = createShinyDefault()[layerKey];
        runtimePreset = composeRuntimePreset();
        renderShinyControls();
        refreshLucios(false);
        showToast(`${definition.title} restaurado en Shiny.`);
      }));
    });
  }

  function refreshLucios(rebuildPerformance = true) {
    heroRenderer.update({
      variant: material,
      shiny: shinyEnabled,
      effects: runtimeEffects,
      preset: runtimePreset,
    });
    if (rebuildPerformance) renderPerformance(performanceCount);
    else performanceRenderers.forEach((renderer) => renderer.update({ preset: runtimePreset, effects: runtimeEffects, shiny: shinyEnabled }));
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
    const rewardName = shinyEnabled ? `${material}Shiny` : material;
    header.innerHTML = `<strong>LUCIO ${config.lucios[rewardName].label.toUpperCase()}</strong><span>×${count}</span>`;
    const track = document.createElement("div");
    track.className = "collection-demo-track";
    const visibleCount = Math.min(count, collectionValues.maxVisibleItems);
    for (let index = 0; index < visibleCount; index += 1) {
      const renderer = window.createLucioRenderer({
        variant: material,
        shiny: shinyEnabled,
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
    applyShinyEffects();
    syncEffectInputs();
    renderLucioControls();
    if (activeLibraryScope !== "shinyModifier") activeLibraryScope = material;
    renderVersionList();
    refreshLucios();
  });

  effectInputs.forEach((input) => {
    input.addEventListener("change", () => {
      materialEffectDrafts[material][input.dataset.effect] = input.checked;
      applyShinyEffects();
      refreshLucios();
    });
  });

  shinyModifierInput.addEventListener("change", () => {
    shinyEnabled = shinyModifierInput.checked;
    applyShinyEffects();
    refreshLucios();
  });

  document.querySelector("[data-copy-preset]").addEventListener("click", async () => {
    const exportValue = {
      material,
      materialPreset: materialDrafts[material],
      materialEffects: materialEffectDrafts[material],
      shinyEnabled,
      shinyModifier: shinyDraft,
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

  document.querySelector("[data-reset-material]").addEventListener("click", () => {
    materialDrafts[material] = createMaterialDefault(material);
    materialEffectDrafts[material] = pickMaterialEffects(config.defaultEffects[material]);
    applyShinyEffects();
    syncEffectInputs();
    renderLucioControls();
    refreshLucios();
    showToast(`${config.lucios[material].label} restaurado desde config.js.`);
  });

  document.querySelector("[data-reset-shiny]").addEventListener("click", () => {
    shinyDraft = createShinyDefault();
    runtimePreset = composeRuntimePreset();
    renderShinyControls();
    refreshLucios();
    showToast("Modificador Shiny restaurado desde config.js.");
  });

  function renderVersionList(preferredId = "") {
    const versions = currentVersions();
    versionSelect.replaceChildren();
    if (!versions.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Sin versiones guardadas";
      versionSelect.appendChild(option);
    } else {
      versions.slice().reverse().forEach((version) => {
        const option = document.createElement("option");
        option.value = version.id;
        option.textContent = `${version.name} · ${new Date(version.savedAt).toLocaleString("es")}`;
        versionSelect.appendChild(option);
      });
      versionSelect.value = preferredId && versions.some((version) => version.id === preferredId) ? preferredId : versions[versions.length - 1].id;
    }
    const shinyScope = activeLibraryScope === "shinyModifier";
    libraryScopeSelect.value = shinyScope ? "shinyModifier" : "material";
    libraryScope.textContent = shinyScope ? "Versiones del Shiny genérico" : `Versiones de ${config.lucios[activeLibraryScope].label}`;
    libraryStatus.textContent = versions.length ? `${versions.length} ${versions.length === 1 ? "versión" : "versiones"}` : "Sin versiones";
    loadVersionButton.disabled = !versions.length;
    deleteVersionButton.disabled = !versions.length;
  }

  document.querySelector("[data-save-version]").addEventListener("click", () => {
    const requestedName = window.prompt("Nombre de esta versión:", activeLibraryScope === "shinyModifier" ? "Shiny" : config.lucios[activeLibraryScope].label);
    if (requestedName === null) return;
    const shinyScope = activeLibraryScope === "shinyModifier";
    const versions = currentVersions();
    const nextNumber = versions.length + 1;
    const version = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: requestedName.trim() || (shinyScope ? `Shiny v${nextNumber}` : `${config.lucios[activeLibraryScope].label} v${nextNumber}`),
      savedAt: new Date().toISOString(),
      data: clone(shinyScope ? shinyDraft : { preset: materialDrafts[activeLibraryScope], effects: materialEffectDrafts[activeLibraryScope] }),
    };
    versions.push(version);
    persistPresetLibrary();
    renderVersionList(version.id);
    showToast(`${version.name} guardada.`);
  });

  loadVersionButton.addEventListener("click", () => {
    const version = currentVersions().find((candidate) => candidate.id === versionSelect.value);
    if (!version) return;
    if (activeLibraryScope === "shinyModifier") {
      shinyDraft = clone(version.data);
      renderShinyControls();
    } else {
      materialDrafts[activeLibraryScope] = clone(version.data.preset);
      materialEffectDrafts[activeLibraryScope] = Object.assign(pickMaterialEffects(config.defaultEffects[activeLibraryScope]), clone(version.data.effects || {}));
      if (activeLibraryScope === material) {
        applyShinyEffects();
        renderLucioControls();
        syncEffectInputs();
      }
    }
    runtimePreset = composeRuntimePreset();
    refreshLucios();
    showToast(`${version.name} cargada.`);
  });

  deleteVersionButton.addEventListener("click", () => {
    const versions = currentVersions();
    const index = versions.findIndex((candidate) => candidate.id === versionSelect.value);
    if (index < 0) return;
    const [removed] = versions.splice(index, 1);
    persistPresetLibrary();
    renderVersionList();
    showToast(`${removed.name} eliminada.`);
  });

  document.querySelector("[data-export-library]").addEventListener("click", () => {
    const documentValue = {
      documentType: "lucio-fx-preset-library",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      drafts: { materials: materialDrafts, materialEffects: materialEffectDrafts, shinyModifier: shinyDraft },
      versions: presetLibrary,
    };
    const blob = new Blob([JSON.stringify(documentValue, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lucio-fx-presets.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Biblioteca exportada como lucio-fx-presets.json.");
  });

  document.querySelector("[data-import-library]").addEventListener("click", () => importFile.click());
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    if (!file) return;
    try {
      const documentValue = JSON.parse(await file.text());
      if (documentValue.documentType !== "lucio-fx-preset-library" || documentValue.schemaVersion !== 1) throw new Error("Formato incompatible");
      presetLibrary = documentValue.versions;
      if (documentValue.drafts?.materials) materialDrafts = clone(documentValue.drafts.materials);
      if (documentValue.drafts?.materialEffects) materialEffectDrafts = clone(documentValue.drafts.materialEffects);
      if (documentValue.drafts?.shinyModifier) shinyDraft = clone(documentValue.drafts.shinyModifier);
      persistPresetLibrary();
      runtimePreset = composeRuntimePreset();
      renderLucioControls();
      renderShinyControls();
      renderVersionList();
      refreshLucios();
      showToast("Biblioteca importada.");
    } catch (error) {
      showToast(`No se pudo importar: ${error.message}`);
    } finally {
      importFile.value = "";
    }
  });

  document.querySelector("[data-reset-all]").addEventListener("click", () => {
    if (!window.confirm("¿Restaurar todos los materiales y el modificador Shiny a config.js? Las versiones guardadas se conservarán.")) return;
    materialDrafts = Object.fromEntries(config.lucioOrder.map((key) => [key, createMaterialDefault(key)]));
    materialEffectDrafts = Object.fromEntries(config.lucioOrder.map((key) => [key, pickMaterialEffects(config.defaultEffects[key])]));
    shinyDraft = createShinyDefault();
    shinyEnabled = false;
    applyShinyEffects();
    syncEffectInputs();
    renderLucioControls();
    renderShinyControls();
    refreshLucios();
    showToast("Todos los borradores fueron restaurados. Las versiones siguen guardadas.");
  });

  libraryScopeSelect.addEventListener("change", () => {
    activeLibraryScope = libraryScopeSelect.value === "shinyModifier" ? "shinyModifier" : material;
    renderVersionList();
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
    onBackpackTap() {
      window.AudioManager?.play("backpackShake");
    },
    onBackpackOpened() {
      window.AudioManager?.play("openBackpack");
    },
    onMysteryReveal(reward) {
      if (reward.shiny) window.AudioManager?.play("shiny");
    },
    onRewardReveal(reward) {
      window.AudioManager?.playReveal(reward);
    },
    onConfirm(reward) {
      window.AudioManager?.play("tap");
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
      openingSequence.options.timings = openingValues;
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

  // -------------------------------------------------------------
  // Section 03: Ambu Bebé Visuals & Blinking Playground
  // -------------------------------------------------------------
  const ambuPlaygroundRoot = document.querySelector("[data-ambu-playground-root]");
  let ambuPlayground = null;

  if (ambuPlaygroundRoot && window.AmbuRenderer) {
    const ambuHost = ambuPlaygroundRoot.querySelector("[data-ambu-stage-host]");
    const ambuCharacter = ambuPlaygroundRoot.querySelector("[data-ambu-character]");
    const ambuSprite = ambuPlaygroundRoot.querySelector("[data-ambu-sprite]");
    const ambuBackdropLayer = ambuPlaygroundRoot.querySelector("[data-ambu-backdrop-layer]");
    const ambuBackdropImg = ambuBackdropLayer?.querySelector("img");

    const ambuLiveDot = ambuPlaygroundRoot.querySelector("[data-ambu-live-dot]");
    const ambuStatusReadout = ambuPlaygroundRoot.querySelector("[data-ambu-status-readout]");
    const ambuBlinkCounter = ambuPlaygroundRoot.querySelector("[data-ambu-blink-counter]");
    const ambuLastType = ambuPlaygroundRoot.querySelector("[data-ambu-last-type]");
    const ambuNextCountdown = ambuPlaygroundRoot.querySelector("[data-ambu-next-countdown]");
    const ambuBreatheStatus = ambuPlaygroundRoot.querySelector("[data-ambu-breathe-status]");

    const ambuStageSelect = ambuPlaygroundRoot.querySelector("[data-ambu-stage-select]");
    const ambuBgSelect = ambuPlaygroundRoot.querySelector("[data-ambu-bg-select]");
    const ambuBreatheToggle = ambuPlaygroundRoot.querySelector("[data-ambu-breathe-toggle]");
    const ambuBreatheSpeed = ambuPlaygroundRoot.querySelector("[data-ambu-breathe-speed]");
    const ambuBreatheVal = ambuPlaygroundRoot.querySelector("[data-ambu-breathe-val]");

    const ambuAutoBlinkToggle = ambuPlaygroundRoot.querySelector("[data-ambu-auto-blink-toggle]");
    const ambuCloseDuration = ambuPlaygroundRoot.querySelector("[data-ambu-close-duration]");
    const ambuClosedVal = ambuPlaygroundRoot.querySelector("[data-ambu-closed-val]");
    const ambuDoubleChance = ambuPlaygroundRoot.querySelector("[data-ambu-double-chance]");
    const ambuDoubleVal = ambuPlaygroundRoot.querySelector("[data-ambu-double-val]");
    const ambuFreqBase = ambuPlaygroundRoot.querySelector("[data-ambu-freq-base]");
    const ambuFreqVal = ambuPlaygroundRoot.querySelector("[data-ambu-freq-val]");

    const btnTriggerBlink = ambuPlaygroundRoot.querySelector("[data-ambu-trigger-blink]");
    const btnTriggerDouble = ambuPlaygroundRoot.querySelector("[data-ambu-trigger-double]");
    const btnHoldToggle = ambuPlaygroundRoot.querySelector("[data-ambu-hold-toggle]");
    const btnTapAnim = ambuPlaygroundRoot.querySelector("[data-ambu-tap-anim]");
    const btnBirthAnim = ambuPlaygroundRoot.querySelector("[data-ambu-birth-anim]");
    const btnResetDefaults = ambuPlaygroundRoot.querySelector("[data-ambu-reset-defaults]");

    ambuPlayground = new window.AmbuRenderer({
      character: ambuCharacter,
      sprite: ambuSprite,
      backdropImg: ambuBackdropImg,
      stageWrap: ambuHost,
    }, {
      stage: "baby",
      breathingEnabled: true,
      breathingDuration: 4.0,
    });

    ambuPlayground.on((event) => {
      if (event.type === "eyes-closed") {
        ambuStatusReadout.textContent = event.isDoubleBlinking ? "Doble parpadeo (Cerrado)" : "Ojos cerrados";
        ambuLiveDot.classList.add("status-dot--blink");
      } else if (event.type === "eyes-opened") {
        ambuStatusReadout.textContent = event.isDoubleBlinking ? "Doble parpadeo (Pausa)" : "Ojos abiertos";
        ambuLiveDot.classList.remove("status-dot--blink");
      } else if (event.type === "blink-action-start") {
        ambuBlinkCounter.textContent = String(event.blinkCount);
        ambuLastType.textContent = event.isDouble ? "Doble" : "Simple";
      } else if (event.type === "blink-action-end") {
        ambuStatusReadout.textContent = "Ojos abiertos";
        ambuLiveDot.classList.remove("status-dot--blink");
      }
    });

    setInterval(() => {
      const state = ambuPlayground.getState();
      if (state.manualHoldClosed) {
        ambuNextCountdown.textContent = "Pausado (Hold)";
      } else if (!ambuPlayground.blinkConfig.enabled || state.stage !== "baby") {
        ambuNextCountdown.textContent = "Desactivado";
      } else if (state.isBlinking) {
        ambuNextCountdown.textContent = "¡Parpadeando!";
      } else {
        const ms = state.nextBlinkDelayMs;
        ambuNextCountdown.textContent = `${(ms / 1000).toFixed(1)}s`;
      }
    }, 100);

    btnTriggerBlink?.addEventListener("click", () => ambuPlayground.triggerBlink(false));
    btnTriggerDouble?.addEventListener("click", () => ambuPlayground.triggerDoubleBlink());
    btnHoldToggle?.addEventListener("click", () => {
      const current = ambuPlayground.getState().manualHoldClosed;
      ambuPlayground.setManualHoldClosed(!current);
      btnHoldToggle.classList.toggle("button--primary", !current);
      showToast(!current ? "Ojos fijados en CERRADOS" : "Ojos liberados");
    });
    btnTapAnim?.addEventListener("click", () => ambuPlayground.triggerTap());
    btnBirthAnim?.addEventListener("click", () => {
      ambuStageSelect.value = "crack3";
      ambuPlayground.setStage("crack3");
      ambuPlayground.triggerBirth(() => {
        ambuStageSelect.value = "baby";
        showToast("¡Eclosión completada!");
      });
    });

    ambuCharacter?.addEventListener("click", () => ambuPlayground.triggerTap());

    ambuStageSelect?.addEventListener("change", () => {
      ambuPlayground.setStage(ambuStageSelect.value);
    });

    ambuBgSelect?.addEventListener("change", () => {
      const mode = ambuBgSelect.value;
      ambuHost.dataset.bgMode = mode;
      if (ambuBackdropLayer) {
        ambuBackdropLayer.hidden = mode !== "tap-backdrop";
      }
    });

    ambuBreatheToggle?.addEventListener("change", () => {
      const enabled = ambuBreatheToggle.checked;
      const speed = parseFloat(ambuBreatheSpeed.value) || 4.0;
      ambuPlayground.setBreathing(enabled, speed);
      ambuBreatheStatus.textContent = enabled ? `Activa (${speed.toFixed(1)}s)` : "Inactiva";
    });

    ambuBreatheSpeed?.addEventListener("input", () => {
      const speed = parseFloat(ambuBreatheSpeed.value) || 4.0;
      ambuBreatheVal.textContent = `${speed.toFixed(1)}s`;
      ambuPlayground.setBreathing(ambuBreatheToggle.checked, speed);
      ambuBreatheStatus.textContent = ambuBreatheToggle.checked ? `Activa (${speed.toFixed(1)}s)` : "Inactiva";
    });

    ambuAutoBlinkToggle?.addEventListener("change", () => {
      if (ambuAutoBlinkToggle.checked) {
        ambuPlayground.startBlinking();
      } else {
        ambuPlayground.stopBlinking();
      }
    });

    ambuCloseDuration?.addEventListener("input", () => {
      const max = parseInt(ambuCloseDuration.value, 10);
      const min = Math.max(50, Math.round(max * 0.6));
      ambuClosedVal.textContent = `${min} - ${max} ms`;
      ambuPlayground.updateConfig({ closeDurationMin: min, closeDurationMax: max });
    });

    ambuDoubleChance?.addEventListener("input", () => {
      const chance = parseInt(ambuDoubleChance.value, 10);
      ambuDoubleVal.textContent = `${chance}%`;
      ambuPlayground.updateConfig({ doubleBlinkChance: chance / 100 });
    });

    ambuFreqBase?.addEventListener("input", () => {
      const base = parseFloat(ambuFreqBase.value);
      const min = Math.max(0.8, base - 1.0);
      const max = base + 1.0;
      ambuFreqVal.textContent = `${min.toFixed(1)}s - ${max.toFixed(1)}s`;
      ambuPlayground.updateConfig({
        commonMin: min * 1000,
        commonMax: max * 1000,
        fastMin: Math.max(500, (min - 1.5) * 1000),
        fastMax: min * 1000,
        longMin: max * 1000,
        longMax: (max + 3.5) * 1000,
      });
    });

    btnResetDefaults?.addEventListener("click", () => {
      ambuBreatheToggle.checked = true;
      ambuBreatheSpeed.value = "4.0";
      ambuBreatheVal.textContent = "4.0s";
      ambuAutoBlinkToggle.checked = true;
      ambuCloseDuration.value = "150";
      ambuClosedVal.textContent = "80 - 150 ms";
      ambuDoubleChance.value = "15";
      ambuDoubleVal.textContent = "15%";
      ambuFreqBase.value = "3.5";
      ambuFreqVal.textContent = "2.5s - 4.5s";
      ambuPlayground.updateConfig({
        commonMin: 2500,
        commonMax: 4500,
        fastMin: 1000,
        fastMax: 2500,
        longMin: 4500,
        longMax: 8000,
        closeDurationMin: 80,
        closeDurationMax: 150,
        doubleBlinkChance: 0.15,
        doubleBlinkPauseMin: 100,
        doubleBlinkPauseMax: 250,
      });
      ambuPlayground.setBreathing(true, 4.0);
      ambuPlayground.setStage("baby");
      ambuStageSelect.value = "baby";
      showToast("Valores de Ambu restablecidos a los valores por defecto");
    });
  }

  syncEffectInputs();
  renderLucioControls();
  renderShinyControls();
  renderVersionList();
  renderPerformance(1);
  renderOpeningControls();
  renderCollectionControls();
  requestAnimationFrame(sampleFps);
})();
