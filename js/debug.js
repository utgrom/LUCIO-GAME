(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.get("debug") !== "1") return;

  const MAX_VALUE = Number.MAX_SAFE_INTEGER;

  function start() {
    const config = window.GAME_CONFIG;
    const state = window.GameState;
    const game = window.LucioGame;

    if (!config || !state || !game || !window.LucioSave) {
      console.error("Lucio Debug necesita GAME_CONFIG, GameState, LucioSave y LucioGame.");
      return;
    }

    const variantIds = (config.collectionOrder || []).filter((id) => config.lucios[id]);
    const backpackIds = Object.keys(config.backpacks || {});
    const originalOdds = Object.fromEntries(backpackIds.map((id) => [id, {
      probabilities: Object.assign({}, config.backpacks[id].probabilities),
      shinyChance: config.backpacks[id].shinyChance,
    }]));

    function labelForVariant(id) {
      return config.lucios[id]?.label || id;
    }

    function readAmount(value, fallback = 0) {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) return fallback;
      return Math.min(MAX_VALUE, Math.floor(parsed));
    }

    function safeAdd(left, right) {
      return Math.min(MAX_VALUE, readAmount(left) + readAmount(right));
    }

    function importMutation(mutator) {
      const snapshot = state.getSnapshot();
      mutator(snapshot);
      return state.importSnapshot(JSON.stringify(snapshot));
    }

    const panel = document.createElement("aside");
    panel.className = "lucio-debug";
    panel.setAttribute("aria-label", "Herramientas de debugging");
    panel.innerHTML = `
      <header class="lucio-debug__header">
        <div>
          <span class="lucio-debug__eyebrow">DEBUG · SOLO ?debug=1</span>
          <strong>Banco de pruebas</strong>
        </div>
        <button class="lucio-debug__toggle" type="button" data-debug-toggle aria-expanded="true" aria-controls="lucio-debug-content">
          <span aria-hidden="true">−</span><span class="lucio-debug__toggle-label">Ocultar</span>
        </button>
      </header>
      <div class="lucio-debug__content" id="lucio-debug-content">
        <section class="lucio-debug__section" aria-labelledby="debug-currency-title">
          <h2 id="debug-currency-title">Mantecas</h2>
          <div class="lucio-debug__row lucio-debug__row--amount">
            <label>Importe <input type="number" min="0" step="1" value="10000" data-debug-currency></label>
            <button type="button" data-debug-add-currency>Añadir</button>
            <button type="button" class="lucio-debug__button--danger" data-debug-reset-currency>Dejar en 0</button>
          </div>
          <div class="lucio-debug__presets" aria-label="Importes rápidos">
            <button type="button" data-debug-currency-preset="50">+50</button>
            <button type="button" data-debug-currency-preset="1000">+1.000</button>
            <button type="button" data-debug-currency-preset="10000">+10.000</button>
          </div>
        </section>

        <section class="lucio-debug__section" aria-labelledby="debug-reward-title">
          <h2 id="debug-reward-title">Colección</h2>
          <div class="lucio-debug__grid">
            <label>Variante
              <select data-debug-variant>${variantIds.map((id) => `<option value="${id}">${labelForVariant(id)}</option>`).join("")}</select>
            </label>
            <label>Cantidad <input type="number" min="1" step="1" value="1" data-debug-grant-count></label>
          </div>
          <button type="button" class="lucio-debug__button--wide" data-debug-grant>Conceder variante</button>
          <div class="lucio-debug__row lucio-debug__row--duplicates">
            <label>Duplicados <input type="number" min="1" step="1" value="50" data-debug-duplicate-count></label>
            <button type="button" data-debug-duplicates="selected">A la elegida</button>
            <button type="button" data-debug-duplicates="all">A todas</button>
          </div>
        </section>

        <section class="lucio-debug__section" aria-labelledby="debug-open-title">
          <h2 id="debug-open-title">Apertura gratuita</h2>
          <div class="lucio-debug__grid">
            <label>Mochila
              <select data-debug-backpack>${backpackIds.map((id) => `<option value="${id}">${config.backpacks[id].label}</option>`).join("")}</select>
            </label>
            <label>Drop
              <select data-debug-open-reward>${variantIds.map((id) => `<option value="${id}">${labelForVariant(id)}</option>`).join("")}</select>
            </label>
          </div>
          <button type="button" class="lucio-debug__button--wide lucio-debug__button--accent" data-debug-open>Abrir sin gastar</button>
        </section>

        <details class="lucio-debug__section lucio-debug__odds">
          <summary>Probabilidades temporales</summary>
          <p>Solo afectan esta pestaña y vuelven al recargar.</p>
          <label>Mochila
            <select data-debug-odds-backpack>${backpackIds.map((id) => `<option value="${id}">${config.backpacks[id].label}</option>`).join("")}</select>
          </label>
          <div class="lucio-debug__odds-grid" data-debug-odds-grid></div>
          <div class="lucio-debug__row">
            <button type="button" data-debug-apply-odds>Aplicar</button>
            <button type="button" data-debug-reset-odds>Restaurar</button>
          </div>
        </details>

        <p class="lucio-debug__status" data-debug-status role="status" aria-live="polite">Panel listo.</p>
      </div>`;

    document.body.appendChild(panel);

    const elements = {
      toggle: panel.querySelector("[data-debug-toggle]"),
      toggleIcon: panel.querySelector("[data-debug-toggle] span[aria-hidden]"),
      toggleLabel: panel.querySelector(".lucio-debug__toggle-label"),
      content: panel.querySelector(".lucio-debug__content"),
      status: panel.querySelector("[data-debug-status]"),
      currency: panel.querySelector("[data-debug-currency]"),
      variant: panel.querySelector("[data-debug-variant]"),
      grantCount: panel.querySelector("[data-debug-grant-count]"),
      duplicateCount: panel.querySelector("[data-debug-duplicate-count]"),
      backpack: panel.querySelector("[data-debug-backpack]"),
      openReward: panel.querySelector("[data-debug-open-reward]"),
      oddsBackpack: panel.querySelector("[data-debug-odds-backpack]"),
      oddsGrid: panel.querySelector("[data-debug-odds-grid]"),
    };

    function report(message, tone = "ok") {
      elements.status.textContent = message;
      elements.status.dataset.tone = tone;
    }

    function setCollapsed(collapsed) {
      panel.classList.toggle("is-collapsed", collapsed);
      elements.toggle.setAttribute("aria-expanded", String(!collapsed));
      elements.content.hidden = collapsed;
      elements.toggleIcon.textContent = collapsed ? "+" : "−";
      elements.toggleLabel.textContent = collapsed ? "Mostrar" : "Ocultar";
    }

    function addMantecas(amount) {
      const value = readAmount(amount);
      const result = importMutation((snapshot) => {
        snapshot.mantecas = safeAdd(snapshot.mantecas, value);
      });
      report(`Añadidas ${value.toLocaleString("es-AR")} Mantecas. Saldo: ${result.mantecas.toLocaleString("es-AR")}.`);
      return result;
    }

    function resetMantecas() {
      const result = importMutation((snapshot) => {
        snapshot.mantecas = 0;
      });
      report("Saldo de Mantecas restablecido a 0.");
      return result;
    }

    function grantVariant(id, amount = 1) {
      if (!variantIds.includes(id)) throw new Error("Variante desconocida.");
      const count = Math.max(1, readAmount(amount, 1));
      const result = importMutation((snapshot) => {
        snapshot.counts[id] = safeAdd(snapshot.counts[id], count);
      });
      report(`${labelForVariant(id)}: +${count.toLocaleString("es-AR")} copias.`);
      return result;
    }

    function populateDuplicates(amount = 50, all = false) {
      const count = Math.max(1, readAmount(amount, 50));
      const ids = all ? variantIds : [elements.variant.value];
      const result = importMutation((snapshot) => {
        ids.forEach((id) => {
          snapshot.counts[id] = safeAdd(snapshot.counts[id], count);
        });
      });
      report(all
        ? `Añadidas ${count.toLocaleString("es-AR")} copias a las ${ids.length} variantes.`
        : `${labelForVariant(ids[0])}: +${count.toLocaleString("es-AR")} duplicados.`);
      return result;
    }

    function parseVariant(id) {
      const shiny = id.endsWith("Shiny");
      return { material: shiny ? id.slice(0, -"Shiny".length) : id, shiny };
    }

    function openFree(backpackId, variantId) {
      if (!backpackIds.includes(backpackId)) throw new Error("Mochila desconocida.");
      if (!variantIds.includes(variantId)) throw new Error("Drop desconocido.");
      if (game.purchasedReward || document.querySelector("[data-opening-overlay]")?.hidden === false) {
        throw new Error("Termina la apertura actual antes de iniciar otra.");
      }

      const opened = game.buyBackpackDebug(backpackId, parseVariant(variantId));
      if (!opened) throw new Error("La apertura gratuita no pudo iniciarse.");
      const after = state.getSnapshot();
      report(`Abriendo Mochila ${config.backpacks[backpackId].label}: ${labelForVariant(variantId)}. El saldo no cambió.`);
      return after;
    }

    function renderOddsEditor() {
      const backpack = config.backpacks[elements.oddsBackpack.value];
      elements.oddsGrid.replaceChildren();
      config.lucioOrder.forEach((material) => {
        const label = document.createElement("label");
        label.textContent = config.lucios[material].label;
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.step = "0.1";
        input.value = String(backpack.probabilities[material]);
        input.dataset.debugOddsMaterial = material;
        label.appendChild(input);
        elements.oddsGrid.appendChild(label);
      });
      const shinyLabel = document.createElement("label");
      shinyLabel.textContent = "Shiny %";
      const shinyInput = document.createElement("input");
      shinyInput.type = "number";
      shinyInput.min = "0";
      shinyInput.max = "100";
      shinyInput.step = "0.1";
      shinyInput.value = String(backpack.shinyChance * 100);
      shinyInput.dataset.debugOddsShiny = "";
      shinyLabel.appendChild(shinyInput);
      elements.oddsGrid.appendChild(shinyLabel);
    }

    function applyOdds() {
      const id = elements.oddsBackpack.value;
      const backpack = config.backpacks[id];
      const values = {};
      let total = 0;
      elements.oddsGrid.querySelectorAll("[data-debug-odds-material]").forEach((input) => {
        const value = Math.max(0, Number(input.value) || 0);
        values[input.dataset.debugOddsMaterial] = value;
        total += value;
      });
      if (total <= 0) throw new Error("La suma de probabilidades debe ser mayor que 0.");
      config.lucioOrder.forEach((material) => {
        backpack.probabilities[material] = values[material] * 100 / total;
      });
      const shinyPercent = Math.max(0, Math.min(100, Number(elements.oddsGrid.querySelector("[data-debug-odds-shiny]").value) || 0));
      backpack.shinyChance = shinyPercent / 100;
      renderOddsEditor();
      report(`Probabilidades temporales aplicadas a Mochila ${backpack.label} (normalizadas a 100%).`);
    }

    function resetOdds() {
      const id = elements.oddsBackpack.value;
      Object.assign(config.backpacks[id].probabilities, originalOdds[id].probabilities);
      config.backpacks[id].shinyChance = originalOdds[id].shinyChance;
      renderOddsEditor();
      report(`Probabilidades de Mochila ${config.backpacks[id].label} restauradas.`);
    }

    function safely(action) {
      try {
        action();
      } catch (error) {
        report(error?.message || "La acción de debug falló.", "error");
        console.error("Lucio Debug:", error);
      }
    }

    elements.toggle.addEventListener("click", () => setCollapsed(!panel.classList.contains("is-collapsed")));
    panel.querySelector("[data-debug-add-currency]").addEventListener("click", () => safely(() => addMantecas(elements.currency.value)));
    panel.querySelector("[data-debug-reset-currency]").addEventListener("click", () => safely(resetMantecas));
    panel.querySelectorAll("[data-debug-currency-preset]").forEach((button) => {
      button.addEventListener("click", () => safely(() => addMantecas(button.dataset.debugCurrencyPreset)));
    });
    panel.querySelector("[data-debug-grant]").addEventListener("click", () => safely(() => grantVariant(elements.variant.value, elements.grantCount.value)));
    panel.querySelectorAll("[data-debug-duplicates]").forEach((button) => {
      button.addEventListener("click", () => safely(() => populateDuplicates(elements.duplicateCount.value, button.dataset.debugDuplicates === "all")));
    });
    panel.querySelector("[data-debug-open]").addEventListener("click", () => safely(() => openFree(elements.backpack.value, elements.openReward.value)));
    elements.oddsBackpack.addEventListener("change", renderOddsEditor);
    panel.querySelector("[data-debug-apply-odds]").addEventListener("click", () => safely(applyOdds));
    panel.querySelector("[data-debug-reset-odds]").addEventListener("click", () => safely(resetOdds));
    panel.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.classList.contains("is-collapsed")) {
        setCollapsed(true);
        elements.toggle.focus();
      }
    });

    renderOddsEditor();
    setCollapsed(window.matchMedia("(max-width: 720px)").matches);

    window.LucioDebug = Object.freeze({
      panel,
      addMantecas,
      resetMantecas,
      grantVariant,
      populateDuplicates,
      openFree,
      applyOdds,
      resetOdds,
      setCollapsed,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}());
