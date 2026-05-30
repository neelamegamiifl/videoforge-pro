// Web Audio API engine
// Real-time audio mixing, EQ, fade automation, waveform analysis

import type { AudioTrack } from '@/store/editor';

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources: Map<string, { source: AudioBufferSourceNode; gain: GainNode; eq: { low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode } }> = new Map();
  private buffers: Map<string, AudioBuffer> = new Map();
  private analyser: AnalyserNode | null = null;

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async loadTrack(track: AudioTrack): Promise<void> {
    if (!this.ctx || !track.url || this.buffers.has(track.id)) return;
    try {
      const res = await fetch(track.url);
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr);
      this.buffers.set(track.id, buf);
    } catch (e) {
      console.warn('Could not load audio:', track.name);
    }
  }

  playTrack(track: AudioTrack, offset: number, masterVolume: number) {
    if (!this.ctx || !this.masterGain) return;
    this.stopTrack(track.id);
    const buf = this.buffers.get(track.id);
    if (!buf) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.loop = track.loop;
    source.playbackRate.value = 1;

    // Gain node
    const gain = this.ctx.createGain();
    const vol = (track.volume / 100) * (masterVolume / 100);
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    if (track.fadeIn > 0) {
      gain.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + track.fadeIn);
    } else {
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    }
    if (track.fadeOut > 0) {
      const fadeStart = Math.max(this.ctx.currentTime, this.ctx.currentTime + (buf.duration - offset - track.fadeOut));
      gain.gain.setValueAtTime(vol, fadeStart);
      gain.gain.linearRampToValueAtTime(0, fadeStart + track.fadeOut);
    }

    // 3-band EQ
    const low = this.ctx.createBiquadFilter();
    low.type = 'lowshelf'; low.frequency.value = 200; low.gain.value = track.eq.low;

    const mid = this.ctx.createBiquadFilter();
    mid.type = 'peaking'; mid.frequency.value = 1000; mid.gain.value = track.eq.mid;

    const high = this.ctx.createBiquadFilter();
    high.type = 'highshelf'; high.frequency.value = 8000; high.gain.value = track.eq.high;

    // Pan
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = track.pan || 0;
      source.connect(low); low.connect(mid); mid.connect(high);
      high.connect(gain); gain.connect(panner); panner.connect(this.masterGain!);
    } else {
      source.connect(low); low.connect(mid); mid.connect(high);
      high.connect(gain); gain.connect(this.masterGain!);
    }

    const trackOffset = Math.max(0, offset - track.start);
    source.start(0, trackOffset);
    if (track.muted) gain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.sources.set(track.id, { source, gain, eq: { low, mid, high } });
  }

  stopTrack(id: string) {
    const t = this.sources.get(id);
    if (t) { try { t.source.stop(); } catch {} this.sources.delete(id); }
  }

  stopAll() { this.sources.forEach((_, id) => this.stopTrack(id)); }

  setMasterVolume(vol: number) {
    if (this.masterGain) this.masterGain.gain.setValueAtTime(vol / 100, this.ctx!.currentTime);
  }

  updateTrackVolume(id: string, vol: number) {
    const t = this.sources.get(id);
    if (t) t.gain.gain.setValueAtTime(vol / 100, this.ctx!.currentTime);
  }

  getAnalyserData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  getWaveformData(): Uint8Array {
    if (!this.analyser) return new Uint8Array(128);
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(data);
    return data;
  }

  resume() { this.ctx?.resume(); }
  suspend() { this.ctx?.suspend(); }
  get isRunning() { return this.ctx?.state === 'running'; }
}

export const audioEngine = new AudioEngine();

// Waveform painter for canvas
export function paintWaveform(canvas: HTMLCanvasElement, data: number[], color: string, bg = 'transparent') {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  const step = w / data.length;
  ctx.fillStyle = color;
  data.forEach((v, i) => {
    const barH = Math.max(2, v * h);
    ctx.fillRect(i * step, (h - barH) / 2, Math.max(1, step - 1), barH);
  });
}

// Extract waveform peaks from audio buffer
export async function extractWaveformPeaks(url: string, samples = 300): Promise<number[]> {
  try {
    const ctx = new AudioContext();
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(arr);
    const ch = buf.getChannelData(0);
    const step = Math.floor(ch.length / samples);
    const peaks: number[] = [];
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) max = Math.max(max, Math.abs(ch[i * step + j] || 0));
      peaks.push(max);
    }
    ctx.close();
    return peaks;
  } catch {
    return Array.from({ length: samples }, (_, i) => Math.sin(i / 5) * 0.4 + 0.3 + Math.random() * 0.2);
  }
}
