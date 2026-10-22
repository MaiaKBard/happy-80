/*
  BDAY-OS v8.0
  Hi Grandpa. Yes, I wrote this for you. Happy 80th. Love, Maia
*/

// ---------- Grab the elements we need ----------
const display = document.getElementById("display");
const terminal = document.getElementById("terminal");
const power = document.getElementById("power");
const powerBtn = document.getElementById("power-btn");
const skipBtn = document.getElementById("skip");

// Does this phone ask for less motion? (an accessibility setting)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Flips to true when "skip" is tapped. The typing code checks it and stops waiting.
let skipping = false;

// ---------- Small helpers ----------

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
      showCursor(line);              // keep the cursor right after the last letter
      await wait(random(18, 45));    // uneven speed, like a real terminal
    }
  }
  showCursor();
  terminal.scrollTop = terminal.scrollHeight;
  return line;
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

// ---------- Boot sequence ----------
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
  showCake();
}

skipBtn.addEventListener("click", () => {
  skipping = true;          // everything still prints, just instantly
  skipBtn.hidden = true;
});

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

// ---------- The cake ----------
const CANDLES = 8;            // 8 candles x 10 years = 80
const YEARS_PER_CANDLE = 10;
const CAKE_WIDTH = 30;        // characters inside the cake's side walls

let candlesLit = CANDLES;
let shownYears = CANDLES * YEARS_PER_CANDLE;   // number currently on screen
let counterLine;              // the "candles: 80/80" line
let rolling = false;          // is the counter animation already running?
let wished = false;           // so the final message prints only once

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

// Create an element with a class in one line.
function make(tag, className, text = "") {
  const el = document.createElement(tag);
  el.className = className;
  el.textContent = text;
  return el;
}

async function showCake() {
  terminal.innerHTML = "";
  await typeLine([["> cake", "dim"]]);
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
  const candleRow = make("div", "candles");
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
}

function updateCounter() {
  counterLine.textContent = `candles: ${shownYears}/80`;
}

// Blow out one candle. Returns false if it was already out.
function blowOut(candle) {
  if (candle.classList.contains("out")) return false;
  candle.classList.add("out");
  candle.disabled = true;
  candlesLit--;
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
// If he taps fast, it just keeps rolling until it catches up.
async function rollCounter() {
  if (rolling) return;
  rolling = true;
  while (shownYears > candlesLit * YEARS_PER_CANDLE) {
    shownYears--;
    updateCounter();
    await wait(45);
  }
  rolling = false;
  if (candlesLit === 0) allOut();
}

async function allOut() {
  if (wished) return;
  wished = true;
  document.querySelector(".hint")?.remove();
  await wait(400);
  await typeLine([["80 = 0b01010000", "ok"]]);
  await typeLine([["still fits in a single byte. make a wish!"]]);
}

// ---------- Power on ----------
async function powerOn() {
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