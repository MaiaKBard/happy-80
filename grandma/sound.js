/*
  Sound for Grandma's card, all made with code (no audio files):
  soft chimes and gentle fabric and paper sounds, and a music box that plays
  "Happy Birthday" once, when the cake appears.
  Phones only allow sound after a tap, so it starts when she threads the needle.
*/

const sound = (() => {
  let ctx = null;        // the "audio engine"
  let master = null;     // one volume knob for everything (the music-note button turns it off)
  let musicBus = null;   // the music box goes through here
  let sfxBus = null;     // the sound effects go through here
  let noise = null;      // a second of static, reused for whooshes, ticks and snaps
  let on = true;
  const VOLUME = 2.6;    // overall loudness (phone speakers are small; the limiter keeps it clean)

  // note names to pitches (in hertz)
  const NOTE = {
    G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
    G5: 783.99, A5: 880.0, B5: 987.77, C6: 1046.5,
  };

  // Build the sound setup. Works with a real speaker or an offline recording (used for testing).
  function setup(context) {
    ctx = context;
    master = ctx.createGain();
    master.gain.value = on ? VOLUME : 0;

    // a limiter: if several sounds pile up at once, it gently squashes the peak
    // so the speaker never crackles
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 6;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;
    // a "warmth" filter on everything: it rolls off the sharp, tinny top end
    const warmth = ctx.createBiquadFilter();
    warmth.type = "lowpass";
    warmth.frequency.value = 3200;
    warmth.Q.value = 0.5;
    master.connect(warmth).connect(limiter).connect(ctx.destination);

    // a soft echo, so the music box sounds like it's in a cozy room
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.21;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 2400;
    echo.connect(warm).connect(feedback).connect(echo);
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    warm.connect(wet).connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);
    musicBus.connect(echo);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    sfxBus.connect(echo);

    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  // Call this from a tap. Creates the audio engine the first time.
  function start() {
    if (ctx) {
      if (ctx.state === "suspended") ctx.resume();
      return;
    }
    try {
      // let it play like a video does, even if the phone's ring switch is on silent (newer iPhones)
      if (navigator.audioSession) navigator.audioSession.type = "playback";
      setup(new (window.AudioContext || window.webkitAudioContext)());
    } catch {
      ctx = null;          // no sound support: the card works fine silently
    }
  }

  const ready = () => ctx && ctx.state !== "closed";
  const now = () => ctx.currentTime;

  // One music-box note: a bright ping that rings out and fades.
  // It's three sine waves stacked (the note plus two softer overtones), like a tiny metal tine.
  function bell(freq, at, { vol = 0.18, decay = 1.4, bus = sfxBus } = {}) {
    if (!ready()) return;
    const t = at ?? now();
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.015);    // a soft start, not a hard ping
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    out.connect(bus);
    for (const [multiple, level] of [[1, 1], [2, 0.12]]) {     // mostly the pure note, a hint of shimmer
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * multiple;
      const g = ctx.createGain();
      g.gain.value = level;
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }

  // A puff of filtered static: whooshes, sewing-machine ticks, and card snaps are all this.
  function hiss(at, { dur = 0.2, type = "bandpass", from = 1200, to = 1200, vol = 0.15, q = 0.8 } = {}) {
    if (!ready()) return;
    const t = at ?? now();
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(sfxBus);
    src.start(t, Math.random() * (1 - dur), dur);
  }

  // "Happy Birthday" (public domain), as [note, beats]
  const MELODY = [
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", 0.75], ["G4", 0.25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
    ["F5", 0.75], ["F5", 0.25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 3],
  ];
  const BEAT = 0.46;           // seconds per beat: slow and gentle
  const REST_BETWEEN = 7;      // seconds of quiet before it plays again

  // Schedule the whole melody once. Returns how long it lasts.
  function playMelody(at) {
    let t = at;
    for (const [note, beats] of MELODY) {
      bell(NOTE[note], t, { vol: 0.16, decay: 1.6, bus: musicBus });
      t += beats * BEAT;
    }
    return t - at;
  }

  // The music box plays "Happy Birthday" once
  function birthdaySong(at) {
    if (!ready()) return 0;
    return playMelody(at ?? now() + 0.1);
  }

  // Sound effects (all soft and low, nothing sharp)
  const SCALE = ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6"];   // do re mi... up to the high do

  const effects = {
    // a soft swish of thread pulling through, then a gentle chime
    threadPull(at) {
      const t = at ?? now();
      hiss(t, { dur: 0.5, type: "lowpass", from: 300, to: 1400, vol: 0.12 });
      bell(NOTE.C6, t + 0.45, { vol: 0.09, decay: 1.4 });
    },
    // a little tug of thread, then this square's note
    sew(index, at) {
      const t = at ?? now();
      hiss(t, { dur: 0.22, type: "lowpass", from: 1200, to: 500, vol: 0.1 });
      bell(NOTE[SCALE[index % SCALE.length]], t + 0.18, { vol: 0.14, decay: 1.4 });
    },
    // the music box plays the birthday song as the cake drops in
    finale(at) {
      birthdaySong(at);
    },
    // a soft paper "fwip" of a card sliding off the deck and turning over
    deal(at) {
      const t = at ?? now();
      hiss(t, { dur: 0.28, type: "lowpass", from: 1800, to: 450, vol: 0.13 });
    },
    // a couple of quiet, low chimes for the gold shine
    shimmer(at) {
      const t = at ?? now();
      ["E5", "G5", "C6"].forEach((n, i) => bell(NOTE[n], t + i * 0.16, { vol: 0.06, decay: 1.4 }));
    },
    // a muffled, papery riffle, three times
    riffle(at) {
      const t = at ?? now();
      for (let r = 0; r < 3; r++) {
        hiss(t + r * 0.32, { dur: 0.26, type: "lowpass", from: 1400, to: 700, vol: 0.09, q: 0.4 });
      }
    },
    // gentle rising chimes as the hearts float away
    wishUp(at) {
      const t = at ?? now();
      ["C5", "E5", "G5", "C6"].forEach((n, i) => bell(NOTE[n], t + i * 0.28, { vol: 0.1, decay: 2 }));
    },
  };

  // Turn everything on or off (a quick fade so it never clicks)
  function toggle() {
    on = !on;
    if (master) master.gain.setTargetAtTime(on ? VOLUME : 0, now(), 0.05);
    return on;
  }

  // Pause when she switches away from the page, and pick back up when she returns
  document.addEventListener("visibilitychange", () => {
    if (!ctx || ctx.state === "closed") return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  return { start, setup, playMelody, toggle, isOn: () => on, ...effects };
})();
