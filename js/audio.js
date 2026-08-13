(function () {
  "use strict";

  const scriptUrl = document.currentScript?.src;
  const audioBase = scriptUrl
    ? new URL("../assets/audio/", scriptUrl)
    : new URL("assets/audio/", document.baseURI);

  const sounds = Object.freeze({
    pop: { file: "popsound.ogg", voices: 8, volume: 0.72 },
    tap: { file: "tapsound.ogg", voices: 6, volume: 0.72 },
    backpackShake: { file: "backpackshake.mp3", voices: 3, volume: 0.82 },
    openBackpack: { file: "openbackpacksound.ogg", voices: 2, volume: 0.9 },
    reveal: { file: "lucioprizerevealsfx.ogg", voices: 2, volume: 0.9 },
    betterReveal: { file: "betterlucioprizerevealsfx.ogg", voices: 2, volume: 0.92 },
    evenBetterReveal: { file: "evenbetterlucioprizerevealsfx.ogg", voices: 2, volume: 0.94 },
    shiny: { file: "shinysfx.mp3", voices: 2, volume: 0.88 },
  });

  const soundUrls = Object.fromEntries(
    Object.entries(sounds).map(([name, sound]) => [name, new URL(sound.file, audioBase).href]),
  );
  const storageKey = "lucio-game-audio-muted";
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const bufferPromises = new Map();
  const decodedBuffers = new Map();
  const activeVoices = new Map();
  const htmlPools = new Map();
  const debugEnabled = new URLSearchParams(window.location.search).get("debug") === "1";
  const debugEvents = debugEnabled ? [] : null;

  let audioContext = null;
  let masterGain = null;
  let unlockPromise = null;
  let isUnlocked = false;
  let isMuted = readStoredMute();

  function readStoredMute() {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch (_error) {
      return false;
    }
  }

  function persistMute() {
    try {
      window.localStorage.setItem(storageKey, isMuted ? "1" : "0");
    } catch (_error) {
      // Audio remains usable when storage is unavailable (for example, in private mode).
    }
  }

  function clamp(value, minimum, maximum, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
  }

  function getAudioContext() {
    if (!AudioContextClass) return null;
    if (audioContext?.state === "closed") {
      audioContext = null;
      masterGain = null;
      bufferPromises.clear();
      decodedBuffers.clear();
      activeVoices.clear();
    }
    if (!audioContext) {
      try {
        audioContext = new AudioContextClass();
        masterGain = audioContext.createGain();
        masterGain.gain.value = isMuted ? 0 : 1;
        masterGain.connect(audioContext.destination);
      } catch (_error) {
        audioContext = null;
        masterGain = null;
      }
    }
    return audioContext;
  }

  function loadBuffer(name) {
    const definition = sounds[name];
    const context = getAudioContext();
    if (!definition || !context) return Promise.resolve(null);
    if (bufferPromises.has(name)) return bufferPromises.get(name);

    const request = fetch(soundUrls[name], { cache: "force-cache" })
      .then((response) => {
        if (!response.ok) throw new Error(`Audio unavailable: ${response.status}`);
        return response.arrayBuffer();
      })
      .then((data) => context.decodeAudioData(data.slice(0)))
      .then((buffer) => {
        if (buffer) decodedBuffers.set(name, buffer);
        return buffer;
      })
      .catch(() => {
        bufferPromises.delete(name);
        return null;
      });

    bufferPromises.set(name, request);
    return request;
  }

  function removeVoice(name, source) {
    const voices = activeVoices.get(name);
    if (!voices) return;
    const index = voices.findIndex((voice) => voice.source === source);
    if (index >= 0) voices.splice(index, 1);
  }

  function playBuffer(name, buffer, options) {
    const context = getAudioContext();
    const definition = sounds[name];
    if (!context || !masterGain || !definition || !buffer || context.state !== "running") return false;

    const voices = activeVoices.get(name) || [];
    while (voices.length >= definition.voices) {
      const oldest = voices.shift();
      try {
        oldest.source.stop();
      } catch (_error) {
        // The voice may have finished between selection and retrigger.
      }
    }

    try {
      const source = context.createBufferSource();
      const gain = context.createGain();
      const volumeScale = typeof options === "number" ? options : options?.volume;
      const playbackRate = typeof options === "object" ? options?.playbackRate : undefined;
      source.buffer = buffer;
      source.playbackRate.value = clamp(playbackRate, 0.25, 4, 1);
      gain.gain.value = definition.volume * clamp(volumeScale, 0, 2, 1);
      source.connect(gain);
      gain.connect(masterGain);
      source.onended = () => removeVoice(name, source);
      voices.push({ source, startedAt: context.currentTime });
      activeVoices.set(name, voices);
      source.start();
      return true;
    } catch (_error) {
      return false;
    }
  }

  function getHtmlPool(name) {
    if (htmlPools.has(name)) return htmlPools.get(name);
    const definition = sounds[name];
    if (!definition || typeof Audio !== "function") return [];

    const pool = Array.from({ length: definition.voices }, () => {
      const voice = new Audio(soundUrls[name]);
      voice.preload = "auto";
      voice.playsInline = true;
      voice.volume = definition.volume;
      voice.muted = isMuted;
      voice._lucioStartedAt = 0;
      return voice;
    });
    htmlPools.set(name, pool);
    return pool;
  }

  async function playHtml(name, options) {
    const definition = sounds[name];
    const pool = getHtmlPool(name);
    if (!definition || !pool.length || isMuted) return false;

    const available = pool.find((voice) => voice.paused || voice.ended);
    const voice = available || pool.reduce((oldest, candidate) => (
      candidate._lucioStartedAt < oldest._lucioStartedAt ? candidate : oldest
    ));

    try {
      voice.pause();
      voice.currentTime = 0;
      voice.muted = false;
      const volumeScale = typeof options === "number" ? options : options?.volume;
      const playbackRate = typeof options === "object" ? options?.playbackRate : undefined;
      voice.volume = definition.volume * clamp(volumeScale, 0, 1 / definition.volume, 1);
      voice.playbackRate = clamp(playbackRate, 0.25, 4, 1);
      voice._lucioStartedAt = performance.now();
      const result = voice.play();
      if (result?.then) await result;
      isUnlocked = true;
      removeGestureListeners();
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function primeHtmlAudio() {
    const voices = Object.keys(sounds).map((name) => getHtmlPool(name)[0]).filter(Boolean);
    if (!voices.length) return false;

    const results = await Promise.all(voices.map(async (voice) => {
      const previousMuted = voice.muted;
      try {
        voice.muted = true;
        voice.currentTime = 0;
        const result = voice.play();
        if (result?.then) await result;
        voice.pause();
        voice.currentTime = 0;
        return true;
      } catch (_error) {
        return false;
      } finally {
        voice.muted = previousMuted || isMuted;
      }
    }));
    return results.some(Boolean);
  }

  async function performUnlock() {
    primeHtmlAudio().catch(() => false);
    const context = getAudioContext();
    if (!context) return primeHtmlAudio();

    try {
      if (context.state === "suspended") await context.resume();
      if (context.state !== "running") return false;

      const silentBuffer = context.createBuffer(1, 1, context.sampleRate);
      const silentSource = context.createBufferSource();
      const silentGain = context.createGain();
      silentGain.gain.value = 0;
      silentSource.buffer = silentBuffer;
      silentSource.connect(silentGain);
      silentGain.connect(masterGain);
      silentSource.start();

      Object.keys(sounds).forEach((name) => {
        loadBuffer(name).catch(() => null);
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  function unlock() {
    const context = getAudioContext();
    if (isUnlocked && (!context || context.state === "running")) return Promise.resolve(true);
    if (unlockPromise) return unlockPromise;

    unlockPromise = performUnlock()
      .then((unlocked) => {
        isUnlocked = unlocked;
        if (unlocked) removeGestureListeners();
        return unlocked;
      })
      .catch(() => false)
      .finally(() => {
        unlockPromise = null;
      });
    return unlockPromise;
  }

  async function play(name, options) {
    if (!sounds[name] || isMuted) return false;
    if (debugEvents) {
      debugEvents.push({ name, time: performance.now() });
    }

    const context = getAudioContext();
    if (!context) return playHtml(name, options);

    try {
      if (context.state === "suspended") await context.resume();
      if (context.state === "running") {
        isUnlocked = true;
        removeGestureListeners();
        const buffer = decodedBuffers.get(name);
        if (buffer && playBuffer(name, buffer, options)) return true;
        loadBuffer(name).catch(() => null);
        return playHtml(name, options);
      }
    } catch (_error) {
      // The HTMLAudio pool below is a safe fallback for decode or context failures.
    }
    return playHtml(name, options);
  }

  function rewardInfo(reward) {
    if (typeof reward === "string") {
      const normalized = reward.trim().toLowerCase();
      return {
        material: normalized.replace(/shiny/g, "").replace(/[^a-z]/g, ""),
        shiny: normalized.includes("shiny"),
      };
    }
    return {
      material: String(reward?.material || "").toLowerCase(),
      shiny: Boolean(reward?.shiny),
    };
  }

  function playReveal(reward, options) {
    const info = rewardInfo(reward);
    if (info.shiny) return play("evenBetterReveal", options);
    if (["ruby", "diamond", "cosmic"].includes(info.material)) {
      return play("betterReveal", options);
    }
    return play("reveal", options);
  }

  function preload() {
    Object.keys(sounds).forEach((name) => {
      getHtmlPool(name).forEach((voice) => voice.load?.());
    });
    if (!audioContext || audioContext.state === "closed") return Promise.resolve(true);
    return Promise.all(Object.keys(sounds).map((name) => loadBuffer(name))).then(() => true);
  }

  function setMuted(muted) {
    isMuted = Boolean(muted);
    if (masterGain) masterGain.gain.value = isMuted ? 0 : 1;
    htmlPools.forEach((pool) => pool.forEach((voice) => {
      voice.muted = isMuted;
    }));
    persistMute();
    return isMuted;
  }

  function toggleMuted() {
    return setMuted(!isMuted);
  }

  function onFirstGesture() {
    unlock().catch(() => false);
  }

  function addGestureListeners() {
    document.addEventListener("pointerdown", onFirstGesture, { capture: true, passive: true });
    document.addEventListener("keydown", onFirstGesture, { capture: true, passive: true });
  }

  function removeGestureListeners() {
    document.removeEventListener("pointerdown", onFirstGesture, true);
    document.removeEventListener("keydown", onFirstGesture, true);
  }

  addGestureListeners();

  window.AudioManager = Object.freeze({
    unlock,
    preload,
    play,
    playReveal,
    setMuted,
    toggleMuted,
    get debugEvents() {
      return debugEvents ? debugEvents.slice() : undefined;
    },
    get muted() {
      return isMuted;
    },
  });
}());
