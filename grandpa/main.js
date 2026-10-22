/*
  BDAY-OS v8.0
  Hi Grandpa. Yes, I wrote this for you. Happy 80th. Love, Maia
*/

const WISH_MESSAGE = [
  "Wishing you a day full of",
  "good food, good people,",
  "and a very big slice of cake.",
];
const SIGN_OFF = "Love, Maia";

//Grab the elements we need
const display = document.getElementById("display");
const terminal = document.getElementById("terminal");
const power = document.getElementById("power");
const powerBtn = document.getElementById("power-btn");
const skipBtn = document.getElementById("skip");
const muteBtn = document.getElementById("mute");
const commands = document.getElementById("commands");

// Does this phone ask for less motion? (an accessibility setting)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Flips to true when "skip" is tapped. The typing code checks it and stops waiting.
let skipping = false;

// True while a command is printing, so two commands never type at once.
let busy = false;

// Small helpers

// Pause for `ms` milliseconds. Lets us write async code that reads top to bottom.
function wait(ms) {
  // When skipping (or reduced motion is on), don't wait at all.
  if (skipping || reducedMotion) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A random whole number between min and max. Makes typing feel human.
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Create an element with a class in one line.
function make(tag, className, text = "") {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

// Put the blinking cursor at the end of `where` (the whole terminal by default,
// or the line currently being typed so it sits right after the last letter).
function showCursor(where = terminal) {
  removeCursor();
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.id = "cursor";
  where.appendChild(cursor);
}

function removeCursor() {
  const cursor = document.getElementById("cursor");
  if (cursor) cursor.remove();
}

// Type one line into the terminal.
// `parts` is a list of [text, cssClass, pauseBeforeMs] so one line can mix colors,
// e.g. "Loading wisdom.dll... " then a pause, then a bright "OK".
async function typeLine(parts, container = terminal, lineClass = "") {
  const line = document.createElement("div");
  line.className = `line ${lineClass}`.trim();
  container.appendChild(line);

  for (const [text, cls = "", pause = 0] of parts) {
    await wait(pause);
    const span = document.createElement("span");
    if (cls) span.className = cls;
    line.appendChild(span);

    for (const char of text) {
      span.textContent += char;
      if (char !== " ") sound.click();
      showCursor(line);              // keep the cursor right after the last letter
      await wait(random(18, 45));    // uneven speed, like a real terminal
    }
  }
  showCursor();
  terminal.scrollTop = terminal.scrollHeight;
  return line;
}

// Print a block of text all at once (for ASCII art, where typing looks messy).
function printBlock(text, className = "") {
  const pre = make("pre", `block ${className}`.trim(), text);
  pre.setAttribute("aria-hidden", "true");
  terminal.appendChild(pre);
  return pre;
}

// Draw a text progress bar that fills up: [#########-------] 56%
async function progressBar() {
  const width = 16;
  const line = await typeLine([["", ""]]);
  for (let i = 0; i <= width; i++) {
    const percent = Math.round((i / width) * 100);
    line.textContent = `[${"#".repeat(i)}${"-".repeat(width - i)}] ${percent}%`;
    await wait(random(60, 140));
  }
}

// Sound (made with code, no audio files)
// Browsers only allow sound after a tap, so it starts on the power button.
const sound = {
  ctx: null,
  on: true,
  noise: null,   // a short burst of static we reuse for clicks and whooshes

  start() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const length = this.ctx.sampleRate * 0.5;
      this.noise = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;   // no sound support: the card still works silently
    }
  },

  ready() {
    if (!this.ctx || !this.on || skipping) return false;
    if (this.ctx.state === "suspended") this.ctx.resume();
    return true;
  },

  // the classic computer power-on beep
  beep(freq = 880, seconds = 0.15) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.04, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + seconds);
  },

  // a tiny tick for each typed letter
  click() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = "highpass";
    filter.frequency.value = 2500;
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t, random(0, 40) / 100, 0.03);
  },

  // a soft puff of air for blowing out a candle
  whoosh() {
    if (!this.ready()) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    src.buffer = this.noise;
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(300, t + 0.35);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t, 0, 0.45);
  },
};

muteBtn.addEventListener("click", () => {
  sound.on = !sound.on;
  muteBtn.textContent = sound.on ? "sound on" : "muted";
  muteBtn.setAttribute("aria-pressed", String(!sound.on));
});

// Boot sequence 
async function boot() {
  skipBtn.hidden = false;

  await typeLine([["BDAY-OS v8.0", "title"]]);
  await typeLine([["A very special release.", "dim"]]);
  await typeLine([[""]]);
  await typeLine([["Checking memory... "], ["80 years found", "ok", 500]]);
  await typeLine([["Loading wisdom.dll... "], ["OK", "ok", 400]]);
  await typeLine([["Loading stories.db... "], ["OK", "ok", 400]]);
  await typeLine([["Warning: candle count exceeds safe limits", "warn"]]);
  await wait(600);
  await typeLine([["Proceeding anyway..."]]);
  await progressBar();
  await typeLine([["Boot complete.", "ok", 300]]);

  skipBtn.hidden = true;
  skipping = false;         // back to normal speed for the rest of the card
  showCursor();
  await wait(900);

  busy = true;
  await showCake("cake");
  commands.hidden = false;  // the command buttons appear once the cake is up
  setActive("cake");
  busy = false;
}

skipBtn.addEventListener("click", () => {
  skipping = true;          // everything still prints, just instantly
  skipBtn.hidden = true;
});

// The cake 
const CANDLES = 8;            // 8 candles x 10 years = 80
const YEARS_PER_CANDLE = 10;
const CAKE_WIDTH = 30;        // characters inside the cake's side walls

let candlesLit = CANDLES;
let shownYears = CANDLES * YEARS_PER_CANDLE;   // number currently on screen
let counterLine;              // the "candles: 80/80" line
let candleRow;                // the row of candle buttons
let rolling = null;           // the running counter animation (a Promise), if any
let wished = false;           // so the final message prints only once
let idleTimer;                // for the "candles are still lit" hint

// Center text inside the cake walls: "|      H A P P Y      |"
function cakeRow(text, fill = " ") {
  const space = CAKE_WIDTH - text.length;
  const left = Math.floor(space / 2);
  return "|" + fill.repeat(left) + text + fill.repeat(space - left) + "|";
}

function cakeRows() {
  return [
    "." + "-".repeat(CAKE_WIDTH) + ".",
    cakeRow("", "~"),
    cakeRow("H A P P Y"),
    cakeRow("", "~"),
    cakeRow("8 0"),
    cakeRow("", "_"),
    "(" + "_".repeat(CAKE_WIDTH) + ")",
  ];
}

// Draw the whole cake scene with all 8 candles lit.
// `command` is what shows at the top, like "> cake" or "> blow".
async function showCake(command, introLine = "") {
  // fresh start: relight everything
  candlesLit = CANDLES;
  shownYears = CANDLES * YEARS_PER_CANDLE;
  wished = false;
  clearTimeout(idleTimer);

  terminal.innerHTML = "";
  await typeLine([[`> ${command}`, "dim"]]);
  if (introLine) await typeLine([[introLine, "big"]]);
  await wait(300);

  const scene = make("div", "scene");
  const headline = make("div", "headline");
  const cakeBox = make("div", "cake");
  scene.append(headline, cakeBox);
  terminal.appendChild(scene);

  // Big glowing headline, typed one word at a time
  for (const word of ["HAPPY", "80TH", "GRANDPA"]) {
    await typeLine([[word]], headline);
  }
  removeCursor();

  // Candles: real buttons, so they can be tapped (and reached with a keyboard)
  candleRow = make("div", "candles nudge");   // "nudge" = glow brighter until the first tap
  for (let i = 1; i <= CANDLES; i++) {
    const candle = make("button", "candle");
    candle.setAttribute("aria-label", `Blow out candle ${i} of ${CANDLES}`);
    candle.style.setProperty("--delay", `${random(0, 900)}ms`);   // flames flicker out of sync
    candle.innerHTML = '<span class="flame" aria-hidden="true">(<br>)</span>' +
                       '<span class="wick" aria-hidden="true">|<br>|</span>';
    candle.addEventListener("click", () => blowOut(candle));
    candleRow.appendChild(candle);
  }
  cakeBox.appendChild(candleRow);

  // Build the cake row by row
  const cakeArt = make("pre", "cake-art");
  cakeArt.setAttribute("aria-hidden", "true");
  cakeBox.appendChild(cakeArt);
  for (const row of cakeRows()) {
    cakeArt.textContent += row + "\n";
    await wait(120);
  }

  counterLine = make("div", "counter");
  updateCounter();
  cakeBox.append(counterLine, make("div", "caption dim", "1 candle = 10 years"));
  cakeBox.appendChild(make("div", "caption hint", "tap a candle to blow it out"));
  showCursor();
  startIdleHint();
}

function updateCounter() {
  counterLine.textContent = `candles: ${shownYears}/80`;
}

// If nothing has been tapped after 8 seconds, give a gentle terminal-style hint.
function startIdleHint() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    if (busy || !counterLine.isConnected || candlesLit < CANDLES) return;
    await typeLine([["> hint: ", "dim"], ["candles are still lit", "warn"]]);
  }, 8000);
}

// Blow out one candle. Returns false if it was already out.
function blowOut(candle) {
  if (candle.classList.contains("out")) return false;
  candle.classList.add("out");
  candle.disabled = true;
  candleRow.classList.remove("nudge");
  clearTimeout(idleTimer);
  candlesLit--;
  sound.whoosh();
  puffSmoke(candle);
  rollCounter();
  return true;
}

// Ten little wisps of smoke, one for each year in that candle
function puffSmoke(candle) {
  for (let i = 0; i < YEARS_PER_CANDLE; i++) {
    const wisp = make("span", "wisp", "~");
    wisp.style.setProperty("--dx", `${random(-22, 22)}px`);
    wisp.style.setProperty("--rise", `${random(30, 60)}px`);
    wisp.style.animationDelay = `${i * 40}ms`;
    candle.appendChild(wisp);
    setTimeout(() => wisp.remove(), 1600);
  }
}

// Count the number down like an odometer: 80, 79, 78 ... 70.
// If he taps fast, the one running roll keeps going until it catches up.
// We keep its Promise so commands can wait for it (and the finale) to finish.
function rollCounter() {
  if (!rolling) {
    rolling = (async () => {
      while (shownYears > candlesLit * YEARS_PER_CANDLE) {
        shownYears--;
        updateCounter();
        await wait(45);
      }
      if (candlesLit === 0) await allOut();
      rolling = null;
    })();
  }
  return rolling;
}

async function allOut() {
  // only once, and only if this cake is still the one on screen
  if (wished || !counterLine.isConnected) return;
  wished = true;
  document.querySelector(".hint")?.remove();
  await wait(400);
  await typeLine([["80 = 0b01010000", "ok"]]);
  await typeLine([["still fits in a single byte. make a wish!"]]);
}

// Commands 
const HEART = [
  " .:::.   .:::. ",
  ":::::::.:::::::",
  ":::::::::::::::",
  "':::::::::::::'",
  "  ':::::::::'  ",
  "    ':::::'    ",
  "      ':'      ",
].join("\n");

const COMMANDS = {
  async cake() {
    await showCake("cake");
  },

  async blow() {
    await showCake("blow", "One big breath.");
    clearTimeout(idleTimer);
    await wait(500);
    // blow out every candle that's still lit, one by one
    for (const candle of candleRow.querySelectorAll(".candle:not(.out)")) {
      blowOut(candle);
      await wait(350);
    }
    await rolling;            // let the countdown and "make a wish!" finish
  },

  async wish() {
    terminal.innerHTML = "";
    await typeLine([["> wish", "dim"]]);
    await wait(200);
    printBlock(HEART, "heart");
    await wait(400);
    await typeLine([["Happy 80th, Grandpa.", "big"]]);
    await typeLine([[""]]);
    for (const line of WISH_MESSAGE) await typeLine([[line]]);
    await typeLine([[""]]);
    await typeLine([[SIGN_OFF, "dim"]]);
  },

  async about() {
    terminal.innerHTML = "";
    await typeLine([["> about", "dim"]]);
    await typeLine([[""]]);
    await typeLine([["A little code.", "big"]]);
    await typeLine([["A lot of love.", "big"]]);
    await typeLine([[""]]);
    await typeLine([["Built by Maia, from scratch, for you."]]);
    await typeLine([["For your 80th, Grandpa."]]);
    await typeLine([[""]]);
    await typeLine([["developers: 1   frameworks: 0", "dim"]]);
    await typeLine([["plain HTML, CSS and JavaScript", "dim"]]);
  },

  async help() {
    terminal.innerHTML = "";
    await typeLine([["> help", "dim"]]);
    await typeLine([[""]]);
    await typeLine([["wish   ", "ok"], ["a message from Maia"]]);
    await typeLine([["blow   ", "ok"], ["blow out the candles"]]);
    await typeLine([["cake   ", "ok"], ["bring the cake back"]]);
    await typeLine([["about  ", "ok"], ["who made this"]]);
    await typeLine([["help   ", "ok"], ["show this list"]]);
  },
};

function setActive(name) {
  for (const btn of commands.querySelectorAll("button")) {
    btn.classList.toggle("active", btn.dataset.cmd === name);
  }
}

let queued = null;            // a command tapped while another was still printing

async function runCommand(name) {
  setActive(name);
  if (busy) {
    // Something is still typing: finish it instantly, then run the new one.
    queued = name;
    skipping = true;
    return;
  }
  busy = true;
  sound.click();
  try {
    await rolling;            // if the countdown is mid-roll, let it finish first
    await COMMANDS[name]();
  } finally {
    busy = false;             // always unlock, even if something goes wrong
    skipping = false;
  }
  if (queued) {
    const next = queued;
    queued = null;
    runCommand(next);
  }
}

commands.addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-cmd]");
  if (btn) runCommand(btn.dataset.cmd);
});

// Power on 
async function powerOn() {
  sound.start();                  // the tap gives the browser permission to play sound
  sound.beep();
  power.hidden = true;            // hide the power button
  display.classList.add("on");    // starts the CRT turn-on animation
  await wait(900);
  boot();
}

powerBtn.addEventListener("click", powerOn, { once: true });

// A little hello for anyone who opens the developer console.
console.log(
  "%cHi Grandpa. I figured you might look under the hood. Happy 80th! Love, Maia",
  "color:#9df5a8;background:#0b130d;padding:6px 10px;font-family:monospace;"
);