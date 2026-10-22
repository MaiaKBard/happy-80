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
async function typeLine(parts) {
  const line = document.createElement("div");
  line.className = "line";
  terminal.appendChild(line);

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
  // Chunk 3: the cake appears here.
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