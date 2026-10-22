/*
  BDAY-OS v8.0
  Hi Grandpa. Yes, I wrote this for you. Happy 80th. Love, Maia
*/

// Grab the elements we need
const display = document.getElementById("display");
const terminal = document.getElementById("terminal");
const power = document.getElementById("power");
const powerBtn = document.getElementById("power-btn");

// Does this phone ask for less motion? (an accessibility setting)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Small helpers

// Pause for `ms` milliseconds. Lets us write async code that reads top to bottom.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Put the blinking cursor at the end of the terminal.
function showCursor() {
  removeCursor();
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  cursor.id = "cursor";
  terminal.appendChild(cursor);
}

function removeCursor() {
  const cursor = document.getElementById("cursor");
  if (cursor) cursor.remove();
}

// Power on 
async function powerOn() {
  power.hidden = true;            // hide the power button
  display.classList.add("on");    // starts the CRT turn-on animation
  await wait(reducedMotion ? 0 : 900);
  showCursor();
  // Chunk 2: the boot sequence starts here.
}

powerBtn.addEventListener("click", powerOn, { once: true });

// A little hello for anyone who opens the developer console.
console.log(
  "%cHi Grandpa. I figured you might look under the hood. Happy 80th! Love, Maia",
  "color:#9df5a8;background:#0b130d;padding:6px 10px;font-family:monospace;"
);