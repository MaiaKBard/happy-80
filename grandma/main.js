/*
  For Grandma, on her 80th.
  Made with love by Maia.
*/

// Your words on the card (edit these)
const CARD_MESSAGE = "Wishing you a wonderful birthday, good company, and a winning hand.";
const CARD_SIGN_OFF = "Love, Maia";

// Grab the elements we need
const startScene = document.getElementById("scene-start");
const quiltScene = document.getElementById("scene-quilt");
const cardScene = document.getElementById("scene-card");
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

// The little cake that gets sewn into the middle square
const CAKE_SVG = `
  <svg viewBox="0 0 60 60" aria-hidden="true" filter="url(#wobble)">
    <rect class="cake-candle" x="28" y="10" width="4" height="14" rx="1" />
    <path class="cake-flame" d="M30 2c3 4 3 7 0 8-3-1-3-4 0-8z" />
    <rect class="cake-body" x="12" y="24" width="36" height="22" rx="3" />
    <path class="cake-frosting" d="M12 27c0-2 2-3 4-3h28c2 0 4 1 4 3 0 3-3 3-4 1-1 3-4 3-5 0-1 3-4 3-5 0-1 3-4 3-5 0-1 3-4 3-5 0-1 3-4 3-5 0-2 3-5 2-5-1z" />
    <rect class="cake-plate" x="6" y="46" width="48" height="5" rx="2.5" />
  </svg>`;

async function quiltFinished() {
  if (finished) return;
  finished = true;
  await wait(500);
  // the middle square gets sewn in last, with a cake on it
  centerSquare.innerHTML = CAKE_SVG;
  centerSquare.classList.add("sewn");
  centerSquare.setAttribute("aria-label", "A birthday cake");
  quiltTitle.textContent = "Happy 80th, Grandma!";
  quiltSub.textContent = "Eighty years, all sewn together.";
  await wait(1200);
  counter.hidden = true;
  toCardBtn.hidden = false;      // the way on to the card
}

// The card
const toCardBtn = document.getElementById("to-card-btn");
const playCard = document.getElementById("play-card");
const cardSub = document.getElementById("card-sub");
const cardHint = document.getElementById("card-hint");
document.getElementById("card-message").textContent = CARD_MESSAGE;
document.getElementById("card-sign").textContent = CARD_SIGN_OFF;

let cardTimer;
let dealt = false;

toCardBtn.addEventListener("click", async () => {
  toCardBtn.disabled = true;
  await goTo(quiltScene, cardScene);
  playCard.classList.add("nudge");
  // after 8 quiet seconds, gently say what to do
  cardTimer = setTimeout(() => { if (!dealt) cardHint.hidden = false; }, 8000);
});

playCard.addEventListener("click", () => {
  if (dealt) return;
  dealt = true;
  clearTimeout(cardTimer);
  cardHint.hidden = true;
  playCard.classList.remove("nudge");
  playCard.classList.add("dealt");    // CSS lifts it off the deck and flips it over
  playCard.setAttribute("aria-label", `Queen of Hearts card: Happy 80th, Grandma. ${CARD_MESSAGE} ${CARD_SIGN_OFF}`);
  cardSub.textContent = "The queen of the table, all day long.";
  setTimeout(() => playCard.classList.add("flipped"), 950);   // after the flip finishes
  // Next chunk: making a wish.
});
