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
}

// The picture and the button both work, so any tap near it counts.
needleArt.addEventListener("click", threadTheNeedle);
threadBtn.addEventListener("click", threadTheNeedle);
