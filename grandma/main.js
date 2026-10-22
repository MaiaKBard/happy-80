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
const wishScene = document.getElementById("scene-wish");
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

// Newer browsers can smoothly morph one scene into the next (the "View Transitions" API).
const smoothScenes = Boolean(document.startViewTransition) && !reducedMotion;
if (smoothScenes) document.documentElement.classList.add("smooth-scenes");

// Move from one scene to the next.
async function goTo(from, to) {
  if (smoothScenes) {
    // the browser snapshots the old scene, we swap, and it animates between them
    const transition = document.startViewTransition(() => {
      from.hidden = true;
      to.hidden = false;
    });
    await transition.finished.catch(() => {});
    return;
  }
  // older browsers: a simple fade out, then fade in
  from.classList.add("leaving");
  await wait(450);
  from.hidden = true;
  from.classList.remove("leaving");
  to.hidden = false;
}

// Change some text with a soft fade instead of a sudden swap.
async function swapText(el, text) {
  // keep a button the same width while its words change, so it doesn't twitch
  if (el.tagName === "BUTTON") el.style.minWidth = `${el.offsetWidth}px`;
  if (reducedMotion) { el.textContent = text; return; }
  await el.animate([{ opacity: 1 }, { opacity: 0, translate: "0 -4px" }], { duration: 180, easing: "ease-in" }).finished;
  el.textContent = text;
  el.animate([{ opacity: 0, translate: "0 4px" }, { opacity: 1, translate: "0 0" }], { duration: 320, easing: "ease-out" });
}

// Fade something in or out of its slot. Its space stays reserved, so nothing else moves.
function show(el) { el.classList.remove("off"); }
function hide(el) { el.classList.add("off"); }

// A quick happy bounce
function pop(el, size = 1.15) {
  if (reducedMotion) return;
  el.animate([{ scale: 1 }, { scale: size }, { scale: 1 }], { duration: 320, easing: "ease-out" });
}

// Thread the needle
let threaded = false;

async function threadTheNeedle() {
  if (threaded) return;           // only once, even if she taps twice
  threaded = true;
  threadBtn.disabled = true;
  needleArt.classList.add("threaded");   // CSS draws the thread through the eye
  swapText(threadBtn, "Threaded!");
  fx.buzz();
  await wait(1100);
  // a little sparkle of thread right at the needle's eye
  const [eyeX, eyeY] = fx.centerOf(needleArt.querySelector(".needle-eye"));
  fx.burst(eyeX, eyeY, { count: 12, shapes: ["thread", "heart"], colors: ["#b8646e", "#94434f", "#8fa683"], speed: 3.5 });
  await wait(1300);
  buildQuilt();                   // build it first, so it's already there as the scene slides in
  await goTo(startScene, quiltScene);
  startQuilt();
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

// the main color of each fabric, for the scraps that fly off when it's sewn in
const FABRIC_COLORS = {
  1: ["#b8646e", "#f3dcdc"], 2: ["#8fa683", "#f6f1e6"], 3: ["#e9c98f", "#a77a40"], 4: ["#b8646e", "#8fa683", "#e0b04f"],
  5: ["#b8646e", "#f3dcdc"], 6: ["#8fa683", "#dfe7d8"], 7: ["#d9a54a", "#fff8eb"], 8: ["#8a6a55", "#f4ede1"],
};

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
}

// Once she's looking at it: point at the first square and start the hint timer.
function startQuilt() {
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
  hide(hint);
  if (squaresSewn === OUTER_SQUARES) return;
  idleTimer = setTimeout(() => show(hint), 8000);
}

function sewSquare(square) {
  if (square.classList.contains("sewn")) return;
  square.classList.add("sewn", `fabric-${square.dataset.fabric}`);
  square.disabled = true;
  square.setAttribute("aria-label", "Sewn in");
  squaresSewn++;
  nudgeNext();
  startIdleHint();
  fx.buzz(10);
  // once the fabric has unrolled, a few scraps and threads puff out of it
  setTimeout(() => {
    const [x, y] = fx.centerOf(square);
    fx.burst(x, y, { count: 10, shapes: ["scrap", "thread"], colors: FABRIC_COLORS[square.dataset.fabric], speed: 3.2 });
  }, 380);
  countUp();
}

// Count up a year at a time, like an odometer: 1, 2, 3 ... 10.
async function countUp() {
  if (counting) return;           // one counter at a time; it catches up on fast taps
  counting = true;
  while (shownYears < squaresSewn * YEARS_PER_SQUARE) {
    shownYears++;
    counter.textContent = `years quilted: ${shownYears} / ${AGE}`;
    if (shownYears % YEARS_PER_SQUARE === 0) pop(counter);   // a little bounce every ten years
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
  await wait(400);

  // a ripple runs across the quilt, like it's being shaken out
  if (!reducedMotion) {
    [...quilt.children].forEach((square, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      square.animate(
        [{ translate: "0 0", rotate: "0deg" }, { translate: "0 -9px", rotate: i % 2 ? "2.5deg" : "-2.5deg" }, { translate: "0 0", rotate: "0deg" }],
        { duration: 520, delay: (row + col) * 90, easing: "ease-in-out" }
      );
    });
    await wait(650);
  }

  // the middle square gets sewn in last, with a cake dropping onto it
  centerSquare.innerHTML = CAKE_SVG;
  centerSquare.classList.add("sewn");
  centerSquare.setAttribute("aria-label", "A birthday cake");
  fx.buzz([10, 60, 10]);
  fx.rain(70);
  swapText(quiltTitle, "Happy 80th, Grandma!");
  swapText(quiltSub, "Eighty years, all sewn together.");
  await wait(1600);
  hide(counter);
  show(toCardBtn);               // the way on to the card, in the same spot the counter was
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
  cardTimer = setTimeout(() => { if (!dealt) show(cardHint); }, 8000);
});

playCard.addEventListener("click", () => {
  if (dealt) return;
  dealt = true;
  clearTimeout(cardTimer);
  hide(cardHint);
  playCard.classList.remove("nudge");
  playCard.classList.add("dealt");    // CSS swings it off the deck and flips it over
  playCard.setAttribute("aria-label", `Queen of Hearts card: Happy 80th, Grandma. ${CARD_MESSAGE} ${CARD_SIGN_OFF}`);
  fx.buzz();
  swapText(cardSub, "The queen of the table, all day long.");
  setTimeout(() => {
    playCard.classList.add("flipped", "shimmer");   // a gold shine sweeps across the face
    const [x, y] = fx.centerOf(playCard);
    fx.burst(x, y, { count: 18, shapes: ["heart"], colors: ["#b8646e", "#94434f", "#e0b04f"], speed: 5.5 });
  }, 1050);
  setTimeout(() => show(toWishBtn), 2400);       // give her a moment to read it
});

// Make a wish
// She writes a wish on a blank card and it gets shuffled into the deck.
// It's never saved or sent anywhere: once it's shuffled in, it's gone for good.
const toWishBtn = document.getElementById("to-wish-btn");
const wishCard = document.getElementById("wish-card");
const wishText = document.getElementById("wish-text");
const wishError = document.getElementById("wish-error");
const wishDeck = document.getElementById("wish-deck");
const shuffleBtn = document.getElementById("shuffle-btn");
const againBtn = document.getElementById("again-btn");
const wishTitle = document.getElementById("wish-title");
const wishSub = document.getElementById("wish-sub");

let shuffled = false;

toWishBtn.addEventListener("click", async () => {
  toWishBtn.disabled = true;
  await goTo(cardScene, wishScene);
});

// clear the gentle reminder as soon as she starts writing
wishText.addEventListener("input", () => { wishError.textContent = ""; });

wishCard.addEventListener("submit", async (event) => {
  event.preventDefault();          // stop the page from reloading
  if (shuffled) return;
  if (!wishText.value.trim()) {
    wishError.textContent = "Write a little wish first.";
    wishText.focus();
    return;
  }

  shuffled = true;
  wishText.blur();                 // put the phone keyboard away
  wishText.readOnly = true;
  hide(shuffleBtn);
  wishError.textContent = "";

  wishCard.classList.add("face-down");     // the card turns over
  fx.buzz();
  await wait(900);
  wishText.value = "";                     // the words are gone, for real
  wishCard.classList.add("tucking");       // it slides under the deck
  await wait(950);
  wishCard.classList.add("gone");          // fully tucked away, so no edges peek out
  wishDeck.classList.add("shuffling");     // and the deck gets a shuffle
  fx.buzz([8, 120, 8, 120, 8]);
  await wait(1100);
  wishDeck.classList.remove("shuffling");

  // little hearts float up from the deck, carrying the wish away
  const [x, y] = fx.centerOf(wishDeck);
  fx.floatUp(x, y - 40, 18);
  swapText(wishTitle, "Shuffled in.");
  swapText(wishSub, "Your wish is in the deck now. Only you know which card it is. Happy 80th, Grandma.");
  await wait(1500);
  show(againBtn);
});

// start the whole card over from the needle
againBtn.addEventListener("click", () => location.reload());
