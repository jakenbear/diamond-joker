/**
 * SoundManager.js - Procedural audio using Web Audio API
 * No audio files needed — all sounds are synthesized oscillator tones.
 */

let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers require user gesture)
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, duration, type = 'square', volume = 0.08, detune = 0) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  if (detune) osc.detune.value = detune;
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

function noise(duration, volume = 0.04) {
  const c = getCtx();
  const bufferSize = c.sampleRate * duration;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource();
  source.buffer = buffer;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  source.connect(gain);
  gain.connect(c.destination);
  source.start();
}

const SoundManager = {
  /** Short click for card select */
  cardSelect() {
    tone(800, 0.06, 'square', 0.06);
  },

  /** Softer click for card deselect */
  cardDeselect() {
    tone(500, 0.05, 'square', 0.04);
  },

  /** Whoosh for playing a hand */
  playHand() {
    tone(400, 0.15, 'sine', 0.06);
    setTimeout(() => tone(600, 0.1, 'sine', 0.05), 50);
  },

  /** Discard sound */
  discard() {
    tone(300, 0.1, 'triangle', 0.05);
  },

  /** Rising tone for a hit */
  hit() {
    tone(440, 0.15, 'sine', 0.07);
    setTimeout(() => tone(660, 0.15, 'sine', 0.06), 80);
  },

  /** Descending tone for an out */
  out() {
    tone(400, 0.2, 'triangle', 0.06);
    setTimeout(() => tone(250, 0.25, 'triangle', 0.05), 100);
  },

  /** Dramatic ascending arpeggio for home run */
  homeRun() {
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => tone(freq, 0.2, 'square', 0.07), i * 80);
    });
    setTimeout(() => tone(1047, 0.4, 'sine', 0.08), 320);
  },

  /** Extra-base hit accent */
  extraBaseHit() {
    tone(523, 0.12, 'sine', 0.06);
    setTimeout(() => tone(784, 0.15, 'sine', 0.07), 70);
  },

  /** Strikeout buzz */
  strikeout() {
    tone(200, 0.15, 'sawtooth', 0.05);
    setTimeout(() => tone(150, 0.2, 'sawtooth', 0.04), 80);
  },

  /** Run scored chime */
  runScored() {
    tone(880, 0.12, 'sine', 0.06);
    setTimeout(() => tone(1100, 0.15, 'sine', 0.07), 100);
  },

  /** Pitch button click */
  pitchSelect() {
    tone(600, 0.08, 'square', 0.05);
    setTimeout(() => tone(800, 0.06, 'square', 0.04), 40);
  },

  /** Walk sound — patient tone */
  walk() {
    tone(440, 0.15, 'sine', 0.05);
    setTimeout(() => tone(550, 0.15, 'sine', 0.05), 120);
    setTimeout(() => tone(440, 0.2, 'sine', 0.04), 240);
  },
};

export default SoundManager;
