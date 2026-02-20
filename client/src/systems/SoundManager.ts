// Simple Web Audio API sound manager — no external files needed
// Generates retro-style synth sounds procedurally

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!audioCtx) {
    try { audioCtx = new AudioContext(); } catch { return null; }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slide = 0) {
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (slide) osc.frequency.linearRampToValueAtTime(freq + slide, ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

export function sfxCrystal() {
  playTone(880, 0.08, 'square', 0.1);
  setTimeout(() => playTone(1320, 0.1, 'square', 0.08), 50);
}

export function sfxBoost() {
  playTone(440, 0.15, 'sawtooth', 0.1, 600);
}

export function sfxShieldBlock() {
  playTone(300, 0.12, 'triangle', 0.15);
  setTimeout(() => playTone(500, 0.1, 'triangle', 0.1), 80);
}

export function sfxDeath() {
  playTone(400, 0.3, 'sawtooth', 0.15, -300);
  setTimeout(() => playTone(150, 0.4, 'square', 0.1), 150);
}

export function sfxJump() {
  playTone(300, 0.1, 'triangle', 0.08, 400);
}

export function sfxSlide() {
  playTone(200, 0.08, 'sawtooth', 0.06, -100);
}

export function sfxCombo() {
  playTone(660, 0.08, 'square', 0.1);
  setTimeout(() => playTone(880, 0.08, 'square', 0.08), 60);
  setTimeout(() => playTone(1100, 0.1, 'square', 0.06), 120);
}

export function sfxNearMiss() {
  playTone(600, 0.06, 'triangle', 0.06, 200);
}

export function sfxBuy() {
  playTone(523, 0.08, 'square', 0.1);
  setTimeout(() => playTone(659, 0.08, 'square', 0.08), 70);
  setTimeout(() => playTone(784, 0.12, 'square', 0.06), 140);
}

export function sfxError() {
  playTone(200, 0.15, 'square', 0.1);
  setTimeout(() => playTone(150, 0.2, 'square', 0.08), 100);
}
