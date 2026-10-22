/*
  For Grandma, on her 80th.
  Made with love by Maia.
*/

// Grab the elements we need
const startScene = document.getElementById("scene-start");
const quiltScene = document.getElementById("scene-quilt");
const needleArt = document.getElementById("needle-art");
const threadBtn = document.getElementById("thread-btn");

// Does this phone ask for less motion? (an accessibility setting)
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Small helpers

// Pause for `ms` milliseconds, so timed steps read top to bottom.
function wait(ms) {
  if (reducedMotion) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Fade one scene out and the next one in.
async function goTo(from, to) {
  from.classList.add("leaving");
  await wait(450);
  from.hidden = true;
  from.classList.remove("leaving");
  to.hidden = false;
}

// Thread the needle
let threaded = false;

async function threadTheNeedle() {
  if (threaded) return;           // only once, even if she taps twice
  threaded = true;
  threadBtn.disabled = true;
  needleArt.classList.add("threaded");   // CSS draws the thread through the eye
  threadBtn.textContent = "Threaded!";
  await wait(2300);
  await goTo(startScene, quiltScene);
  buildQuilt();
}

// The picture and the button both work, so any tap near it counts.
needleArt.addEventListener("click", threadTheNeedle);
threadBtn.addEventListener("click", threadTheNeedle);

// The quilt
// A 3 by 3 block: the 8 outside squares are her 8 decades, the middle waits for the end.
const quilt = document.getElementById("quilt");
const quiltTitle = document.getElementById("quilt-title");
const quiltSub = document.getElementById("quilt-sub");
const counter = document.getElementById("quilt-counter");
const hint = document.getElementById("quilt-hint");

const YEARS_PER_SQUARE = 10;
const OUTER_SQUARES = 8;
const AGE = OUTER_SQUARES * YEARS_PER_SQUARE;   // 80

let squaresSewn = 0;
let shownYears = 0;       // the number on screen, which counts up to catch up
let counting = false;
let centerSquare;
let idleTimer;

function buildQuilt() {
  let fabric = 1;
  for (let i = 0; i < 9; i++) {
    if (i === 4) {
      // the middle square, for the finale
      centerSquare = document.createElement("div");
      centerSquare.className = "square center";
      centerSquare.textContent = "80";
      quilt.appendChild(centerSquare);
      continue;
    }
    const square = document.createElement("button");
    square.className = "square";
    square.dataset.fabric = fabric++;
    square.setAttribute("aria-label", "Sew in a square (ten years)");
    square.addEventListener("click", () => sewSquare(square));
    quilt.appendChild(square);
  }
  nudgeNext();
  startIdleHint();
}

// Only one plain square wiggles at a time, so it's clear where to tap.
function nudgeNext() {
  quilt.querySelector(".nudge")?.classList.remove("nudge");
  quilt.querySelector(".square:not(.sewn):not(.center)")?.classList.add("nudge");
}

// If she hasn't tapped for 8 seconds, gently say what to do.
function startIdleHint() {
  clearTimeout(idleTimer);
  hint.hidden = true;
  if (squaresSewn === OUTER_SQUARES) return;
  idleTimer = setTimeout(() => { hint.hidden = false; }, 8000);
}

function sewSquare(square) {
  if (square.classList.contains("sewn")) return;
  square.classList.add("sewn", `fabric-${square.dataset.fabric}`);
  square.disabled = true;
  square.setAttribute("aria-label", "Sewn in");
  squaresSewn++;
  nudgeNext();
  startIdleHint();
  countUp();
}

// Count up a year at a time, like an odometer: 1, 2, 3 ... 10.
async function countUp() {
  if (counting) return;           // one counter at a time; it catches up on fast taps
  counting = true;
  while (shownYears < squaresSewn * YEARS_PER_SQUARE) {
    shownYears++;
    counter.textContent = `years quilted: ${shownYears} / ${AGE}`;
    await wait(40);
  }
  counting = false;
  if (squaresSewn === OUTER_SQUARES) quiltFinished();
}

let finished = false;

async function quiltFinished() {
  if (finished) return;
  finished = true;
  await wait(500);
  centerSquare.textContent = "";
  centerSquare.classList.add("sewn", "fabric-5");
  quiltTitle.textContent = "Eighty years, all sewn together.";
  quiltSub.textContent = "Every one of them worth celebrating.";
  // Next chunk: the middle square reveals the birthday message.
}
