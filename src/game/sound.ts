import type { EngineAudioProfile, WeatherMode } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private nitroGain: GainNode | null = null;
  private nitroFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private weatherMode: WeatherMode = 'sunny';
  private profile: EngineAudioProfile = 'aggressive';
  private muted = false;
  private initialized = false;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.42;
      this.masterGain.connect(this.ctx.destination);

      // Continuous layered engine synthesizer
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 260;
      this.engineFilter.Q.value = 2.4;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.applyOscillatorProfile();

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();

      // Continuous filtered white noise for nitro/wind rush
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      this.nitroFilter = this.ctx.createBiquadFilter();
      this.nitroFilter.type = 'bandpass';
      this.nitroFilter.frequency.value = 600;
      this.nitroFilter.Q.value = 1.2;

      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.value = 0;

      noiseSource.connect(this.nitroFilter);
      this.nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.masterGain);
      noiseSource.start();

      // Continuous rain ambience loop
      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1400;
      rainFilter.Q.value = 0.55;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.value = this.getTargetRainGain();

      noiseSource.connect(rainFilter);
      rainFilter.connect(this.rainGain);
      this.rainGain.connect(this.masterGain);

      this.initialized = true;
    } catch {
      // AudioContext blocked or unavailable
    }
  }

  private getTargetRainGain(): number {
    if (this.weatherMode === 'stormy') return 0.085;
    if (this.weatherMode === 'rainy') return 0.045;
    return 0;
  }

  public setWeather(mode: WeatherMode): void {
    this.weatherMode = mode;
    if (this.rainGain && this.ctx) {
      this.rainGain.gain.setTargetAtTime(this.getTargetRainGain(), this.ctx.currentTime, 0.25);
    }
  }

  private applyOscillatorProfile(): void {
    if (!this.engineOsc1 || !this.engineOsc2 || !this.engineFilter) return;
    if (this.profile === 'aggressive') {
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc2.type = 'sawtooth';
      this.engineFilter.Q.value = 3.2;
    } else if (this.profile === 'silent') {
      this.engineOsc1.type = 'sine';
      this.engineOsc2.type = 'triangle';
      this.engineFilter.Q.value = 0.8;
    } else {
      // muscle
      this.engineOsc1.type = 'square';
      this.engineOsc2.type = 'sawtooth';
      this.engineFilter.Q.value = 2.6;
    }
  }

  public setProfile(profile: EngineAudioProfile, preview = false): void {
    this.profile = profile;
    if (this.initialized) {
      this.applyOscillatorProfile();
      if (preview && !this.muted) {
        this.playProfilePreview();
      }
    }
  }

  public getProfile(): EngineAudioProfile {
    return this.profile;
  }

  private playProfilePreview(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    filter.type = 'lowpass';
    if (this.profile === 'aggressive') {
      osc1.type = 'sawtooth';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(92, now);
      osc1.frequency.exponentialRampToValueAtTime(195, now + 0.14);
      osc1.frequency.exponentialRampToValueAtTime(105, now + 0.34);
      osc2.frequency.setValueAtTime(138, now);
      osc2.frequency.exponentialRampToValueAtTime(292, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(157, now + 0.34);
      filter.frequency.setValueAtTime(780, now);
      filter.Q.value = 3.2;
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    } else if (this.profile === 'silent') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(105, now);
      osc1.frequency.exponentialRampToValueAtTime(165, now + 0.16);
      osc2.frequency.setValueAtTime(210, now);
      osc2.frequency.exponentialRampToValueAtTime(330, now + 0.16);
      filter.frequency.setValueAtTime(340, now);
      filter.Q.value = 0.8;
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.linearRampToValueAtTime(0.055, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    } else {
      // muscle
      osc1.type = 'square';
      osc2.type = 'sawtooth';
      osc1.frequency.setValueAtTime(42, now);
      osc1.frequency.exponentialRampToValueAtTime(78, now + 0.14);
      osc1.frequency.exponentialRampToValueAtTime(44, now + 0.36);
      osc2.frequency.setValueAtTime(63, now);
      osc2.frequency.exponentialRampToValueAtTime(116, now + 0.14);
      osc2.frequency.exponentialRampToValueAtTime(66, now + 0.36);
      filter.frequency.setValueAtTime(360, now);
      filter.Q.value = 2.6;
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    }

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.42, this.ctx.currentTime, 0.04);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public updateEngine(speedRatio: number, rpmRatio: number, isBoosting: boolean, active: boolean): void {
    if (!this.initialized || !this.ctx || !this.engineOsc1 || !this.engineOsc2 || !this.engineFilter || !this.engineGain || !this.nitroGain || !this.nitroFilter) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!active) {
      const idleGain =
        this.profile === 'silent' ? 0.004 : this.profile === 'muscle' ? 0.028 : 0.02;
      const idleFreq =
        this.profile === 'silent' ? 72 : this.profile === 'muscle' ? 34 : 56;
      const idleHarmonic =
        this.profile === 'silent' ? idleFreq * 2 : this.profile === 'muscle' ? idleFreq * 1.498 : idleFreq * 1.5;

      this.engineGain.gain.setTargetAtTime(idleGain, now, 0.08);
      this.nitroGain.gain.setTargetAtTime(0, now, 0.08);
      this.engineOsc1.frequency.setTargetAtTime(idleFreq, now, 0.1);
      this.engineOsc2.frequency.setTargetAtTime(idleHarmonic, now, 0.1);
      return;
    }

    if (this.profile === 'aggressive') {
      const baseFreq = 64 + rpmRatio * 125 + speedRatio * 42 + (isBoosting ? 32 : 0);
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.035);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.5, now, 0.035);
      this.engineFilter.frequency.setTargetAtTime(
        320 + rpmRatio * 960 + (isBoosting ? 520 : 0),
        now,
        0.045
      );
      this.engineGain.gain.setTargetAtTime(0.125 + speedRatio * 0.08, now, 0.05);
    } else if (this.profile === 'silent') {
      const baseFreq = 78 + rpmRatio * 86 + speedRatio * 46 + (isBoosting ? 26 : 0);
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 2.0, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(
        190 + rpmRatio * 240 + (isBoosting ? 120 : 0),
        now,
        0.06
      );
      this.engineGain.gain.setTargetAtTime(0.024 + speedRatio * 0.024, now, 0.06);
    } else {
      // muscle
      const baseFreq = 34 + rpmRatio * 48 + speedRatio * 18 + (isBoosting ? 14 : 0);
      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 1.498, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(
        145 + rpmRatio * 430 + (isBoosting ? 240 : 0),
        now,
        0.05
      );
      this.engineGain.gain.setTargetAtTime(0.135 + speedRatio * 0.075, now, 0.055);
    }

    const windScale = this.profile === 'silent' ? 0.55 : 1.0;
    const windVol = (isBoosting ? 0.14 : Math.max(0, speedRatio - 0.45) * 0.05) * windScale;
    this.nitroGain.gain.setTargetAtTime(windVol, now, 0.06);
    this.nitroFilter.frequency.setTargetAtTime(isBoosting ? 1150 : 520 + speedRatio * 400, now, 0.08);
  }

  public playCountdownBeep(isGo: boolean): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(isGo ? 880 : 440, now);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isGo ? 0.36 : 0.18));
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + (isGo ? 0.38 : 0.2));
  }

  public playNearMiss(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(980, now + 0.12);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPickup(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.045);
      gain.gain.setValueAtTime(0.16, now + idx * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.2);
    });
  }

  public playAchievementUnlock(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.06;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.32);
    });
  }

  public playCrash(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;

    // Low impact punch
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.35);
    oscGain.gain.setValueAtTime(0.36, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);

    // Metallic crunch burst
    const len = Math.floor(this.ctx.sampleRate * 0.28);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.32));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.34, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(now);
  }

  public playThunder(): void {
    if (!this.initialized || !this.ctx || !this.masterGain || this.muted) return;
    const now = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 1.1);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.42));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(210, now);
    filter.frequency.exponentialRampToValueAtTime(65, now + 1.0);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.28, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.05);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  }

  public dispose(): void {
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.initialized = false;
  }
}
