/*
  Sound for Grandma's card, all made with code (no audio files):
  a soft music box playing "Happy Birthday", plus little sewing and card sounds.
  Phones only allow sound after a tap, so it starts when she threads the needle.
*/

const sound = (() => {
  let ctx = null;        // the "audio engine"
  let master = null;     // one volume knob for everything (the music-note button turns it off)
  let musicBus = null;   // the music box goes through here
  let sfxBus = null;     // the sound effects go through here
  let noise = null;      // a second of static, reused for whooshes, ticks and snaps
  let on = true;
  const VOLUME = 1.6;    // overall loudness (phone speakers are small)
  let musicTimer = null;
  let musicPlaying = false;

  // note names to pitches (in hertz)
  const NOTE = {
    G4: 392.0, A4: 440.0, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46,
    G5: 783.99, A5: 880.0, B5: 987.77, C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, C7: 2093.0,
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
    master.connect(limiter).connect(ctx.destination);

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
    out.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    out.connect(bus);
    for (const [multiple, level] of [[1, 1], [2, 0.28], [3.01, 0.08]]) {
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

  function startMusic() {
    if (!ready() || musicPlaying) return;
    musicPlaying = true;
    const loop = () => {
      const length = playMelody(now() + 0.1);
      musicTimer = setTimeout(loop, (length + REST_BETWEEN) * 1000);
    };
    loop();
  }

  // Sound effects
  const SCALE = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"];   // one note per square, going up

  const effects = {
    // thread zipping through the needle, then a tiny chime
    threadPull(at) {
      const t = at ?? now();
      hiss(t, { dur: 0.45, from: 500, to: 3200, vol: 0.12 });
      bell(NOTE.E6, t + 0.42, { vol: 0.1, decay: 1.2 });
    },
    // chk-chk-chk-chk like a sewing machine, then this square's note
    sew(index, at) {
      const t = at ?? now();
      for (let i = 0; i < 4; i++) hiss(t + i * 0.07, { dur: 0.03, type: "highpass", from: 3000, to: 3000, vol: 0.12 });
      bell(NOTE[SCALE[index % SCALE.length]], t + 0.3, { vol: 0.15, decay: 1.3 });
    },
    // a sparkly run up the scale when the quilt is done
    finale(at) {
      const t = at ?? now();
      ["C5", "E5", "G5", "C6", "E6", "G6"].forEach((n, i) => bell(NOTE[n], t + i * 0.11, { vol: 0.13, decay: 1.6 }));
    },
    // a card snapping off the deck, then the whoosh of it flipping
    deal(at) {
      const t = at ?? now();
      hiss(t, { dur: 0.07, from: 2500, to: 2500, vol: 0.32, q: 1.5 });
      hiss(t + 0.18, { dur: 0.35, type: "lowpass", from: 3000, to: 400, vol: 0.22 });
    },
    // little twinkles for the gold shimmer
    shimmer(at) {
      const t = at ?? now();
      ["G6", "C7", "E6", "C7", "G6"].forEach((n, i) => bell(NOTE[n], t + i * 0.09 + Math.random() * 0.03, { vol: 0.06, decay: 0.9 }));
    },
    // the brrrrt of a riffle shuffle, three times
    riffle(at) {
      const t = at ?? now();
      for (let r = 0; r < 3; r++) {
        for (let i = 0; i < 12; i++) hiss(t + r * 0.32 + i * 0.022, { dur: 0.012, type: "highpass", from: 2500, to: 2500, vol: 0.16 });
      }
    },
    // gentle rising chimes as the hearts float away
    wishUp(at) {
      const t = at ?? now();
      ["C5", "E5", "G5", "B5", "D6"].forEach((n, i) => bell(NOTE[n], t + i * 0.22, { vol: 0.11, decay: 1.8 }));
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

  return { start, setup, startMusic, playMelody, toggle, isOn: () => on, ...effects };
})();
