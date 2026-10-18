// Cyberpunk Web Audio API Synthesizer
// Generates futuristic cyber sound effects entirely in code without external audio dependencies

class CyberAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.init();
    this.muted = !this.muted;
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Futuristic short cyber blip on hover
  playHover() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(950, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.05);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Cyber activation click
  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const now = this.ctx.currentTime;
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  // Epic Blast Door Opening Sound: Hydraulic release + Quantum energy surge
  playDoorOpen() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;

      // 1. Heavy bass sub-drop (hydraulic release)
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.8);

      subGain.gain.setValueAtTime(0.18, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      subOsc.connect(subGain);
      subGain.connect(this.ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.8);

      // 2. High energy sci-fi beam whoosh
      const surgeOsc = this.ctx.createOscillator();
      const surgeGain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      surgeOsc.type = 'sawtooth';
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.exponentialRampToValueAtTime(3600, now + 0.4);
      filter.frequency.exponentialRampToValueAtTime(500, now + 1.1);
      filter.Q.value = 4.0;

      surgeGain.gain.setValueAtTime(0.09, now);
      surgeGain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

      surgeOsc.connect(filter);
      filter.connect(surgeGain);
      surgeGain.connect(this.ctx.destination);

      surgeOsc.start(now);
      surgeOsc.stop(now + 1.1);

      // 3. Futuristic confirmation chord
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
        const chordOsc = this.ctx.createOscillator();
        const chordGain = this.ctx.createGain();
        chordOsc.type = 'sine';
        chordOsc.frequency.setValueAtTime(freq, now + 0.2 + i * 0.04);

        chordGain.gain.setValueAtTime(0.04, now + 0.2 + i * 0.04);
        chordGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2 + i * 0.04 + 0.5);

        chordOsc.connect(chordGain);
        chordGain.connect(this.ctx.destination);

        chordOsc.start(now + 0.2 + i * 0.04);
        chordOsc.stop(now + 0.2 + i * 0.04 + 0.5);
      });
    } catch (e) {}
  }

  // Holographic modal open sound
  playModal() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [480, 720, 960].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.025);

        gain.gain.setValueAtTime(0.05, now + idx * 0.025);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.025 + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.025);
        osc.stop(now + idx * 0.025 + 0.12);
      });
    } catch (e) {}
  }

  // Success chime for email sent
  playSuccess() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      const now = this.ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.07, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.4);
      });
    } catch (e) {}
  }
}

export const cyberAudio = new CyberAudio();
