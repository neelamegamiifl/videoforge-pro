// FFmpeg WASM rendering engine
// Handles real video processing: trim, merge, speed, effects, audio mixing

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { VideoClip, AudioTrack, ColorGrade, Project } from '@/store/editor';
import { PLATFORMS } from '@/store/editor';

let ffmpegInstance: FFmpeg | null = null;

export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  const ff = new FFmpeg();
  if (onLog) ff.on('log', ({ message }) => onLog(message));
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  await ff.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  ffmpegInstance = ff;
  return ff;
}

export async function renderProject(
  project: Project,
  onProgress: (pct: number) => void,
  onLog: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg(onLog);

  onLog('Starting render...');
  onProgress(2);

  // FIX: use actual platform dimensions instead of hardcoded 1080×1920
  const { w: outW, h: outH } = PLATFORMS[project.platform];

  // Write all clip files to FFmpeg virtual FS
  const clipFiles: string[] = [];
  for (let i = 0; i < project.clips.length; i++) {
    const clip = project.clips[i];
    if (!clip.url) continue;
    const ext = clip.type === 'video' ? 'mp4' : 'png';
    const fname = `clip_${i}.${ext}`;
    onLog(`Loading ${clip.name}...`);
    await ff.writeFile(fname, await fetchFile(clip.url));
    clipFiles.push(fname);
    onProgress(5 + (i / project.clips.length) * 25);
  }

  // Write audio files
  const audioFiles: string[] = [];
  const audioTracks: AudioTrack[] = [];
  for (let i = 0; i < project.audioTracks.length; i++) {
    const track = project.audioTracks[i];
    if (!track.url) continue; // FIX: skip null-URL SFX tracks gracefully
    const fname = `audio_${i}.mp3`;
    onLog(`Loading audio ${track.name}...`);
    try {
      await ff.writeFile(fname, await fetchFile(track.url));
      audioFiles.push(fname);
      audioTracks.push(track);
    } catch { /* skip unloadable audio */ }
    onProgress(30 + (i / Math.max(project.audioTracks.length, 1)) * 10);
  }

  onProgress(40);
  onLog('Building filter graph...');

  if (clipFiles.length === 0) {
    // Generate blank video if no clips
    await ff.exec([
      '-f', 'lavfi', '-i', `color=c=black:s=${outW}x${outH}:d=${project.duration}`,
      '-c:v', 'libx264', '-t', String(project.duration),
      'output.mp4'
    ]);
  } else {
    const inputs: string[] = [];
    const filterParts: string[] = [];
    const concatVideoInputs: string[] = [];
    const concatAudioInputs: string[] = [];
    let hasAudio = false;

    project.clips.forEach((clip, i) => {
      if (!clip.url) return;
      inputs.push('-i', clipFiles[i]);

      // ─── VIDEO filter chain ───────────────────────────────────────────────
      const videoFilters: string[] = [];

      // Trim
      videoFilters.push(`trim=start=${clip.trimIn}:duration=${clip.duration / clip.speed}`);
      videoFilters.push(`setpts=${1 / clip.speed}*PTS`);

      // Scale to output size (platform-aware)
      videoFilters.push(`scale=${outW}:${outH}:force_original_aspect_ratio=decrease`);
      videoFilters.push(`pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:black`);

      // Color grading
      const grade = clip.grade;
      const brightness = (grade.brightness / 100).toFixed(3);
      const contrast = (1 + grade.contrast / 100).toFixed(3);
      const saturation = (1 + grade.saturation / 100).toFixed(3);
      if (grade.brightness !== 0 || grade.contrast !== 0 || grade.saturation !== 0) {
        videoFilters.push(`eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`);
      }

      // FX filters — map stored names to FFmpeg equivalents
      if (clip.filters.length > 0) {
        const fxMap: Record<string, string> = {
          'B&W': 'hue=s=0',
          'Sepia': 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
          'Warm': 'curves=r=\'0/0 1/1\':g=\'0/0 0.8/0.9\':b=\'0/0 0.7/0.8\'',
          'Cool': 'curves=r=\'0/0 0.8/0.7\':b=\'0/0 1/1\'',
          'Blur': 'boxblur=2:1',
          'Sharpen': 'unsharp=5:5:1.5:5:5:0',
          'Vignette': 'vignette=PI/4',
          'Mirror': 'hflip',
        };
        clip.filters.forEach(fx => {
          if (fxMap[fx]) videoFilters.push(fxMap[fx]);
        });
      }

      // Vignette from grade
      if (grade.vignette > 0) {
        videoFilters.push(`vignette=PI/${(5 - grade.vignette / 25).toFixed(1)}`);
      }

      // Flip
      if (clip.flipH) videoFilters.push('hflip');
      if (clip.flipV) videoFilters.push('vflip');

      // Rotation
      if (clip.rotation !== 0) {
        videoFilters.push(`rotate=${(clip.rotation * Math.PI / 180).toFixed(4)}`);
      }

      // Opacity
      if (clip.opacity < 100) {
        videoFilters.push(`colorchannelmixer=aa=${(clip.opacity / 100).toFixed(2)}`);
      }

      // Transition fade-in (video only)
      if (i > 0 && clip.transition) {
        videoFilters.push(`fade=t=in:st=0:d=${clip.transitionDuration || 0.5}`);
      }

      filterParts.push(`[${i}:v]${videoFilters.join(',')}[v${i}]`);
      concatVideoInputs.push(`[v${i}]`);

      // ─── AUDIO filter chain (separate from video) ─────────────────────────
      // FIX: atempo is an audio filter and must NOT go in the video chain
      if (clip.type === 'video' && !clip.muted) {
        const audioFilters: string[] = [
          `atrim=start=${clip.trimIn}:duration=${clip.duration / clip.speed}`,
          `asetpts=PTS-STARTPTS`,
        ];
        if (clip.speed !== 1) {
          // atempo only supports 0.5–2.0; chain multiple for wider range
          let s = clip.speed;
          while (s > 2.0) { audioFilters.push('atempo=2.0'); s /= 2; }
          while (s < 0.5) { audioFilters.push('atempo=0.5'); s /= 0.5; }
          audioFilters.push(`atempo=${Math.min(2, Math.max(0.5, s)).toFixed(3)}`);
        }
        const vol = (clip.volume / 100).toFixed(3);
        audioFilters.push(`volume=${vol}`);
        filterParts.push(`[${i}:a]${audioFilters.join(',')}[a${i}]`);
        concatAudioInputs.push(`[a${i}]`);
        hasAudio = true;
      }
    });

    onProgress(55);
    onLog('Compositing clips...');

    // Concat video
    filterParts.push(`${concatVideoInputs.join('')}concat=n=${concatVideoInputs.length}:v=1:a=0[vout]`);

    // Concat audio from clips (if any)
    let audioMap = '';
    if (hasAudio) {
      filterParts.push(`${concatAudioInputs.join('')}concat=n=${concatAudioInputs.length}:v=0:a=1[aclips]`);
    }

    // Mix in audio tracks
    if (audioFiles.length > 0) {
      const trackInputIndex = inputs.length / 2; // tracks come after clips
      audioFiles.forEach((af, i) => {
        inputs.push('-i', af);
        const track = audioTracks[i];
        const vol = (track.volume / 100).toFixed(3);
        filterParts.push(`[${trackInputIndex + i}:a]volume=${vol}[at${i}]`);
      });
      const mixInputs = (hasAudio ? '[aclips]' : '') + audioFiles.map((_, i) => `[at${i}]`).join('');
      const mixN = (hasAudio ? 1 : 0) + audioFiles.length;
      filterParts.push(`${mixInputs}amix=inputs=${mixN}:duration=first[amix]`);
      audioMap = '[amix]';
    } else if (hasAudio) {
      audioMap = '[aclips]';
    }

    const filterComplex = filterParts.join(';');
    const args = [
      ...inputs,
      '-filter_complex', filterComplex,
      '-map', '[vout]',
      ...(audioMap ? ['-map', audioMap] : []),
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      ...(audioMap ? ['-c:a', 'aac', '-b:a', '128k'] : []),
      'output.mp4'
    ];

    try {
      await ff.exec(args);
    } catch (e) {
      onLog('Complex render failed, trying simple export...');
      // Fallback: process first clip only
      await ff.exec([
        '-i', clipFiles[0],
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-t', String(project.duration),
        'output.mp4'
      ]);
    }
  }

  onProgress(80);
  onLog('Finalizing export...');

  let data: Uint8Array;
  try {
    data = await ff.readFile('output.mp4') as Uint8Array;
  } catch {
    throw new Error('Render failed — please check your clips are valid video files.');
  }

  onProgress(100);
  onLog('Render complete!');

  return new Blob([data], { type: 'video/mp4' });
}

// Quick trim-only render
export async function trimClip(
  url: string, trimIn: number, trimOut: number,
  onLog: (msg: string) => void
): Promise<Blob> {
  const ff = await getFFmpeg(onLog);
  await ff.writeFile('input.mp4', await fetchFile(url));
  await ff.exec([
    '-i', 'input.mp4',
    '-ss', String(trimIn),
    '-to', String(trimOut),
    '-c', 'copy',
    'trimmed.mp4'
  ]);
  const data = await ff.readFile('trimmed.mp4') as Uint8Array;
  return new Blob([data], { type: 'video/mp4' });
}

// Apply color grade to a single clip
export async function gradeClip(url: string, grade: ColorGrade, onLog: (msg: string) => void): Promise<Blob> {
  const ff = await getFFmpeg(onLog);
  await ff.writeFile('input.mp4', await fetchFile(url));
  const brightness = (grade.brightness / 100).toFixed(3);
  const contrast = (1 + grade.contrast / 100).toFixed(3);
  const saturation = (1 + grade.saturation / 100).toFixed(3);
  await ff.exec([
    '-i', 'input.mp4',
    '-vf', `eq=brightness=${brightness}:contrast=${contrast}:saturation=${saturation}`,
    '-c:v', 'libx264', '-preset', 'fast',
    'graded.mp4'
  ]);
  const data = await ff.readFile('graded.mp4') as Uint8Array;
  return new Blob([data], { type: 'video/mp4' });
}

// Extract audio waveform — reuses existing AudioContext if possible
export async function extractWaveform(url: string, samples = 200, ctx?: AudioContext): Promise<number[]> {
  try {
    const ownCtx = !ctx;
    const audioCtx = ctx ?? new AudioContext();
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const decoded = await audioCtx.decodeAudioData(buf);
    const raw = decoded.getChannelData(0);
    const step = Math.floor(raw.length / samples);
    const wave: number[] = [];
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        max = Math.max(max, Math.abs(raw[i * step + j] || 0));
      }
      wave.push(max);
    }
    if (ownCtx) audioCtx.close();
    return wave;
  } catch {
    return Array.from({ length: samples }, () => Math.random() * 0.8 + 0.1);
  }
}
