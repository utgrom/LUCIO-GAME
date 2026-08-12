(function () {
  "use strict";

  const lucioOrder = ["bronze", "silver", "gold", "ruby", "diamond", "cosmic"];

  const GAME_CONFIG = {
    baseTapValue: 1,
    assets: {
      mystery: "assets/lucios/LucioMistery.png",
      effects: {
        sparkles: "assets/effects/Destello.png",
        diamond: "assets/effects/DiamondOverlay.png",
        cosmic: "assets/effects/CosmicOverlay.png",
        shiny: "assets/effects/ShinyOverlay.png",
      },
    },
    lucioOrder,
    lucios: {
      bronze: {
        label: "Bronce",
        tapBonus: 1,
        color: "#d79255",
        sprite: "assets/lucios/LucioBronze.png",
      },
      silver: {
        label: "Plata",
        tapBonus: 3,
        color: "#c9e6f2",
        sprite: "assets/lucios/LucioSilver.png",
      },
      gold: {
        label: "Oro",
        tapBonus: 5,
        color: "#ffc94f",
        sprite: "assets/lucios/LucioGold.png",
      },
      ruby: {
        label: "Rubí",
        tapBonus: 10,
        color: "#ff4264",
        sprite: "assets/lucios/LucioRuby.png",
      },
      diamond: {
        label: "Diamante",
        tapBonus: 20,
        color: "#82edff",
        sprite: "assets/lucios/LucioDiamond.png",
      },
      cosmic: {
        label: "Cósmico",
        tapBonus: 30,
        color: "#9c7dff",
        sprite: "assets/lucios/LucioCosmic.png",
      },
      mystery: {
        label: "Misterioso",
        tapBonus: 0,
        color: "#ffffff",
        sprite: "assets/lucios/LucioMistery.png",
      },
      bronzeShiny: { label: "Bronce Shiny", tapBonus: 31 },
      silverShiny: { label: "Plata Shiny", tapBonus: 33 },
      goldShiny: { label: "Oro Shiny", tapBonus: 35 },
      rubyShiny: { label: "Rubí Shiny", tapBonus: 40 },
      diamondShiny: { label: "Diamante Shiny", tapBonus: 50 },
      cosmicShiny: { label: "Cósmico Shiny", tapBonus: 60 },
    },
    visualPresets: {
      bronze: {
        glow: { color: "#c8793e", size: 12, blur: 18, opacity: 0.3, intensity: 0.45 },
        sparkles: { color: "#ffd9b0", opacity: 0, scale: 1, speed: 3.8, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      silver: {
        glow: { color: "#cdeeff", size: 17, blur: 22, opacity: 0.42, intensity: 0.58 },
        sparkles: { color: "#e5f8ff", opacity: 0.18, scale: 1, speed: 3.4, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      gold: {
        glow: { color: "#ffb82e", size: 25, blur: 29, opacity: 0.7, intensity: 0.88 },
        sparkles: { color: "#ffd45f", opacity: 0.7, scale: 1.03, speed: 2.7, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      ruby: {
        glow: { color: "#ff274f", size: 28, blur: 32, opacity: 0.72, intensity: 0.94 },
        sparkles: { color: "#ff4264", opacity: 0.78, scale: 1.05, speed: 2.45, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      diamond: {
        glow: { color: "#78eaff", size: 33, blur: 38, opacity: 0.8, intensity: 1.05 },
        sparkles: { color: "#d9fbff", opacity: 0.88, scale: 1.08, speed: 2.1, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      cosmic: {
        glow: { color: "#7654ff", size: 42, blur: 48, opacity: 0.92, intensity: 1.2 },
        sparkles: { color: "#b399ff", opacity: 0.94, scale: 1.12, speed: 1.85, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      mystery: {
        glow: { color: "#ffffff", size: 22, blur: 18, opacity: 0.62, intensity: 0.72 },
        sparkles: { color: "#ffffff", opacity: 0, scale: 1, speed: 3, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      shared: {
        idle: { amplitude: 7, speed: 3.2, rotation: 0.8, scale: 1.015 },
        pulse: { speed: 1.8, intensity: 0.18, scale: 1.018 },
        specialOverlay: { scale: 1, opacity: 0.82, rotation: 0, offsetX: 0, offsetY: 0 },
      },
      shinyModifier: {
        shiny: {
          glowBoost: 0.35,
          brightness: 1.12,
          rimOpacity: 0.86,
          rimSize: 16,
          sparkleColor: "#ffffff",
          overlayOpacity: 0.9,
          overlayScale: 1.04,
          overlaySpeed: 1.75,
          rotation: 0,
          offsetX: 0,
          offsetY: 0,
        },
        shine: { width: 22, speed: 1.35, angle: -18, intensity: 0.85, frequency: 3.8 },
        lightning: { intensity: 0.55, frequency: 2.4, opacity: 0.72 },
        pulse: { speed: 1.35, intensity: 0.32, scale: 1.035 },
      },
    },
    defaultEffects: {
      bronze: { glow: true, sparkles: false, diamond: false, cosmic: false, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: false, idle: true },
      silver: { glow: true, sparkles: false, diamond: false, cosmic: false, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: false, idle: true },
      gold: { glow: true, sparkles: true, diamond: false, cosmic: false, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: false, idle: true },
      ruby: { glow: true, sparkles: true, diamond: false, cosmic: false, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: true, idle: true },
      diamond: { glow: true, sparkles: true, diamond: true, cosmic: false, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: true, idle: true },
      cosmic: { glow: true, sparkles: true, diamond: false, cosmic: true, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: true, idle: true },
      mystery: { glow: true, sparkles: false, diamond: false, cosmic: false, shiny: false, shinySparkles: false, shine: false, lightning: false, pulse: true, idle: true },
    },
    backpacks: {
      normal: {
        label: "Normal",
        price: 50,
        accent: "#78dc88",
        closed: "assets/backpacks/Mochila.png",
        open: "assets/backpacks/MochilaOpen.png",
        shinyChance: 0.02,
        probabilities: { bronze: 55, silver: 25, gold: 12, ruby: 5, diamond: 2.5, cosmic: 0.5 },
      },
      large: {
        label: "Grande",
        price: 1000,
        accent: "#e2c88f",
        closed: "assets/backpacks/MochilaGrande.png",
        open: "assets/backpacks/MochilaGrandeOpen.png",
        shinyChance: 0.05,
        probabilities: { bronze: 35, silver: 30, gold: 18, ruby: 10, diamond: 5.5, cosmic: 1.5 },
      },
      mega: {
        label: "Mega",
        price: 10000,
        accent: "#ffad33",
        closed: "assets/backpacks/MegaMochila.png",
        open: "assets/backpacks/MegaMochilaOpen.png",
        shinyChance: 0.1,
        probabilities: { bronze: 20, silver: 25, gold: 22, ruby: 15, diamond: 12, cosmic: 6 },
      },
    },
    opening: {
      entryDuration: 760,
      shakeStrength: 16,
      shakeDuration: 310,
      shakeRotation: 5,
      impactScale: 1.08,
      flashDuration: 520,
      flashIntensity: 0.86,
      openingDuration: 620,
      lucioDelay: 180,
      riseDuration: 980,
      riseDistance: 118,
      finalBounce: 1.08,
      revealDuration: 1250,
      mysterySwapPoint: 0.68,
      mysteryFadeDuration: 260,
    },
    performance: {
      counts: [1, 10, 20, 50],
      collectionEffectScale: 0.62,
    },
    collection: {
      compactStart: 6,
      minimumSpacing: 12,
      maximumOverlap: 58,
      maxVisibleItems: 18,
      fadeStart: 20,
      fadeLength: 5,
      itemWidth: 78,
      naturalGap: 10,
    },
  };

  window.GAME_CONFIG = GAME_CONFIG;
})();
