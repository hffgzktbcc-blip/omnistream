import { AmbientSoundType } from '../types/ebook';

class AmbientAudioService {
  private ctx: AudioContext | null = null;
  private currentType: AmbientSoundType = 'off';
  private gainNode: GainNode | null = null;
  private noiseNode: AudioNode | null = null;
  private intervalId: any = null;
  private volume: number = 0.35;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public play(type: AmbientSoundType, volume?: number) {
    if (volume !== undefined) this.volume = volume;
    if (type === 'off') {
      this.stop();
      return;
    }

    this.initCtx();
    if (!this.ctx) return;

    this.stop();
    this.currentType = type;

    // Master Gain
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.gainNode.connect(this.ctx.destination);

    if (type === 'rain') {
      this.startRain();
    } else if (type === 'fireplace') {
      this.startFireplace();
    } else if (type === 'forest') {
      this.startForest();
    } else if (type === 'cafe') {
      this.startCafe();
    } else if (type === 'whitenoise') {
      this.startBrownNoise();
    }
  }

  public stop() {
    this.currentType = 'off';
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as any).stop?.();
        this.noiseNode.disconnect();
      } catch {}
      this.noiseNode = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {}
      this.gainNode = null;
    }
  }

  public getCurrentType(): AmbientSoundType {
    return this.currentType;
  }

  // 1. Rain Generator (Filtered Pink Noise + Droplets)
  private startRain() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.11;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start(0);
    this.noiseNode = whiteNoise;
  }

  // 2. Fireplace Generator (Low Rumble + Random Crackles)
  private startFireplace() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const brownNoise = this.ctx.createBufferSource();
    brownNoise.buffer = noiseBuffer;
    brownNoise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    brownNoise.connect(filter);
    filter.connect(this.gainNode);
    brownNoise.start(0);
    this.noiseNode = brownNoise;

    // Random crackles
    this.intervalId = setInterval(() => {
      if (!this.ctx || !this.gainNode || this.currentType !== 'fireplace') return;
      if (Math.random() > 0.4) {
        const crackle = this.ctx.createOscillator();
        const crackleGain = this.ctx.createGain();
        crackle.type = 'triangle';
        crackle.frequency.setValueAtTime(300 + Math.random() * 800, this.ctx.currentTime);
        crackleGain.gain.setValueAtTime(this.volume * 0.8, this.ctx.currentTime);
        crackleGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
        crackle.connect(crackleGain);
        crackleGain.connect(this.gainNode);
        crackle.start();
        crackle.stop(this.ctx.currentTime + 0.05);
      }
    }, 120);
  }

  // 3. Forest Wind (Soft Oscillating Swells)
  private startForest() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + white * 0.05;
      b1 = 0.985 * b1 + white * 0.08;
      output[i] = (b0 + b1) * 0.15;
    }

    const wind = this.ctx.createBufferSource();
    wind.buffer = noiseBuffer;
    wind.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.Q.setValueAtTime(2.0, this.ctx.currentTime);

    wind.connect(filter);
    filter.connect(this.gainNode);
    wind.start(0);
    this.noiseNode = wind;
  }

  // 4. Cafe Murmur (Warm Ambient Multiband)
  private startCafe() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const cafe = this.ctx.createBufferSource();
    cafe.buffer = noiseBuffer;
    cafe.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(700, this.ctx.currentTime);
    filter.Q.setValueAtTime(0.8, this.ctx.currentTime);

    cafe.connect(filter);
    filter.connect(this.gainNode);
    cafe.start(0);
    this.noiseNode = cafe;
  }

  // 5. Brown Noise (Deep Calming White/Pink/Brown)
  private startBrownNoise() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(this.gainNode);
    noise.start(0);
    this.noiseNode = noise;
  }
}

export const ambientAudio = new AmbientAudioService();
