const { chromium } = require("playwright");

const url = process.argv[2] || "http://127.0.0.1:8765/index.html";
const width = Number(process.argv[3]) || 390;
const height = Number(process.argv[4]) || 844;
const screenshot = process.argv[5] || "";
const executablePath = process.env.LUCIO_BROWSER_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

function check(condition, label, detail = "") {
  if (!condition) throw new Error(`${label}${detail ? `: ${detail}` : ""}`);
  console.log(`PASS ${label}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const context = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.LucioGame));
    check(await page.title() === "Lucio Lootbox Clicker", "index carga el juego real");
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "sin overflow horizontal");
    check(await page.evaluate(() => GameState.getTapValue()) === 1, "produccion inicial derivada");

    const files = [
      "popsound.ogg", "tapsound.ogg", "openbackpacksound.ogg", "backpackshake.mp3",
      "lucioprizerevealsfx.ogg", "betterlucioprizerevealsfx.ogg",
      "evenbetterlucioprizerevealsfx.ogg", "shinysfx.mp3",
    ];
    const audioOk = await page.evaluate(async (names) => (
      Promise.all(names.map(async (name) => {
        const response = await fetch(`assets/audio/${name}`);
        return response.ok && (await response.arrayBuffer()).byteLength > 0;
      }))
    ), files);
    check(audioOk.every(Boolean), "ocho audios disponibles");

    const beforeUi = await page.evaluate(() => GameState.getMantecas());
    await page.locator("[data-open-settings]").click();
    await page.locator("[data-settings-dialog]").evaluate((dialog) => dialog.close());
    check(await page.evaluate(() => GameState.getMantecas()) === beforeUi, "controles UI no producen Mantecas");

    await page.locator("[data-tap-zone]").click();
    check(await page.evaluate(() => GameState.getMantecas()) === 1, "tap productivo suma una vez");

    await page.evaluate(() => LucioGame.navigate("collection", { focus: false }));
    await page.goBack();
    check(await page.evaluate(() => LucioGame.activeView) === "tap", "historial vuelve a la vista anterior");

    await page.evaluate(() => {
      const save = LucioSave.createDefault();
      save.mantecas = 100;
      GameState.importSnapshot(save);
      LucioGame.navigate("shop", { focus: false });
    });
    const buy = page.locator('[data-buy-backpack="normal"]');
    await buy.focus();
    await page.evaluate(() => {
      const values = [0.93, 0.01];
      Math.random = () => values.shift() ?? 0.5;
      document.querySelector('[data-buy-backpack="normal"]').click();
      LucioGame.buyBackpack("normal");
    });
    const purchase = await page.evaluate(() => ({
      mantecas: GameState.getMantecas(),
      count: GameState.getCount("rubyShiny"),
      reward: LucioGame.purchasedReward,
      inert: document.querySelector("[data-game-app]").inert,
    }));
    check(purchase.mantecas === 50 && purchase.count === 1, "compra atomica y bloqueo de reentrada");
    check(purchase.reward.material === "ruby" && purchase.reward.shiny, "reward Ruby Shiny determinista");
    check(purchase.inert, "apertura bloquea el juego de fondo");

    const stage = page.locator("[data-opening-stage]");
    await stage.dispatchEvent("pointerdown");
    await stage.dispatchEvent("pointerdown");
    await stage.dispatchEvent("pointerdown");
    await stage.dispatchEvent("pointerdown");
    await stage.dispatchEvent("pointerdown");
    await stage.dispatchEvent("pointerdown");
    await page.waitForTimeout(650);

    const reward = await page.evaluate(() => {
      const copy = document.querySelector("[data-reward-copy]").getBoundingClientRect();
      const confirm = document.querySelector("[data-confirm]").getBoundingClientRect();
      const sprite = document.querySelector(".reward-layer--actual .lucio-sprite");
      return {
        state: LucioGame.opening.state,
        noOverlap: copy.bottom + 4 <= confirm.top && confirm.bottom <= innerHeight,
        ruby: sprite?.src.includes("LucioRuby.png"),
        width: sprite?.naturalWidth,
        count: GameState.getCount("rubyShiny"),
      };
    });
    check(reward.state === "reward-visible", "skip completa el reveal");
    check(reward.ruby && reward.width === 1024, "Ruby carga su sprite real");
    check(reward.noOverlap, `reveal responsive ${width}x${height}`);
    check(reward.count === 1, "reveal no duplica el premio");
    if (screenshot) await page.screenshot({ path: screenshot, fullPage: false });

    await page.locator("[data-confirm]").click();
    const confirmed = await page.evaluate(() => ({
      hidden: document.querySelector("[data-opening-overlay]").hidden,
      count: GameState.getCount("rubyShiny"),
      focus: document.activeElement.matches('[data-buy-backpack], [data-nav="shop"]'),
    }));
    check(confirmed.hidden && confirmed.count === 1, "confirmar cierra sin duplicar");
    check(confirmed.focus, "confirmar restaura el foco");

    await page.evaluate(() => {
      const save = LucioSave.createDefault();
      save.mantecas = 123;
      save.counts.bronze = 25;
      save.counts.cosmic = 1;
      save.counts.silverShiny = 2;
      GameState.importSnapshot(save);
      LucioGame.navigate("collection", { focus: false });
    });
    await page.waitForTimeout(100);
    const collection = await page.evaluate(() => {
      const bronze = document.querySelector('[data-variant="bronze"]');
      const copies = bronze.querySelectorAll(".collection-lucio");
      return {
        order: Array.from(document.querySelectorAll(".collection-category"), (node) => node.dataset.variant).join(","),
        copies: copies.length,
        lastOpacity: Number(copies[copies.length - 1].style.opacity),
        tapValue: GameState.getTapValue(),
      };
    });
    check(collection.order === "bronze,cosmic,silverShiny", "coleccion respeta orden y oculta no descubiertos");
    check(collection.copies === 18 && collection.lastOpacity < 0.2, "coleccion compacta y aplica fade");
    check(collection.tapValue === 122, "duplicados recalculan produccion");

    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => Boolean(window.LucioGame));
    check(await page.evaluate(() => GameState.getMantecas()) === 123, "save persiste tras recarga");
    check(errors.length === 0, "sin excepciones de runtime", errors.join(" | "));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
