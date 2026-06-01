'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, PLATFORMS, defaultGrade } from '@/store/editor';
import { getFFmpeg } from '@/lib/ffmpeg';
import { audioEngine } from '@/lib/audio';
import ProTopBar from './ProTopBar';
import ProLeftPanel from './ProLeftPanel';
import ProPreview from './ProPreview';
import ProTimeline from './ProTimeline';
import ProInspector from './ProInspector';
import { DownloaderModal } from './DownloaderModal';
import { AIModal } from './DownloaderModal';
import { ExportModal } from './DownloaderModal';
import ColorGradePanel from './ColorGradePanel';
import AudioMixerPanel from './AudioMixerPanel';

export default function ProEditor() {
  const store = useStore();
  const [modal, setModal] = useState<'none'|'download-video'|'download-music'|'ai'|'export'|'grade'|'mixer'>('none');
  const [toast, setToast] = useState<{msg:string;type:'ok'|'err'|'info'}|null>(null);
  const rafRef = useRef<number>(0);
  const lastTsRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder|null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [dark, setDark] = useState(true);

  // FIX: use refs for shortcut handler so we don't re-register on every currentTime change
  const storeRef = useRef(store);
  storeRef.current = store;

  // Init FFmpeg in background
  useEffect(() => {
    if (store.ffmpegReady || store.ffmpegLoading) return;
    store.setFfmpegLoading(true);
    getFFmpeg((msg) => store.setRenderLog(msg))
      .then(() => { store.setFfmpegReady(true); store.setFfmpegLoading(false); notify('FFmpeg ready — real rendering enabled ✓'); })
      .catch(() => { store.setFfmpegLoading(false); notify('FFmpeg load failed — basic export only', 'err'); });
  }, []);

  // Init audio engine
  useEffect(() => { audioEngine.init(); }, []);

  // Theme
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); }, [dark]);

  // Playback RAF loop
  useEffect(() => {
    if (store.playing) {
      const tick = (ts: number) => {
        if (lastTsRef.current) {
          const delta = (ts - lastTsRef.current) / 1000;
          const s = storeRef.current;
          const next = s.currentTime + delta;
          if (next >= s.project.duration) {
            s.setPlaying(false); s.setCurrentTime(0); audioEngine.stopAll(); return;
          }
          s.setCurrentTime(next);
        }
        lastTsRef.current = ts;
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      audioEngine.resume();
    } else {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
      audioEngine.suspend();
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [store.playing]);

  // FIX: keyboard shortcuts use storeRef — no re-registration on time/selection changes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const s = storeRef.current;
      switch (e.code) {
        case 'Space': e.preventDefault(); s.setPlaying(!s.playing); break;
        case 'KeyJ': s.setCurrentTime(Math.max(0, s.currentTime - 5)); break;
        case 'KeyL': s.setCurrentTime(Math.min(s.project.duration, s.currentTime + 5)); break;
        case 'KeyK': s.setPlaying(false); break;
        case 'Home': s.setCurrentTime(0); break;
        case 'End': s.setCurrentTime(s.project.duration); break;
        case 'Delete': case 'Backspace':
          if (s.selectedId) {
            const clip = s.project.clips.find(c => c.id === s.selectedId);
            const audio = s.project.audioTracks.find(a => a.id === s.selectedId);
            // FIX: revoke blob URL before deleting
            if (clip?.url?.startsWith('blob:')) URL.revokeObjectURL(clip.url);
            if (audio?.url?.startsWith('blob:')) URL.revokeObjectURL(audio.url);
            s.deleteClip(s.selectedId); s.deleteAudio(s.selectedId); s.deleteText(s.selectedId);
            notify('Deleted');
          }
          break;
        case 'KeyZ': if (e.ctrlKey||e.metaKey) { e.shiftKey ? s.redo() : s.undo(); } break;
        case 'KeyS': if (e.ctrlKey||e.metaKey) { e.preventDefault(); s.saveProject(); notify('Project saved ✓'); } break;
        case 'KeyD': if (s.selectedId) { s.duplicateClip(s.selectedId); notify('Duplicated'); } break;
        case 'KeyM': if (s.selectedId) { const c = s.project.clips.find(x=>x.id===s.selectedId); if(c) s.updateClip(c.id,{muted:!c.muted}); } break;
        case 'Equal': if (e.ctrlKey||e.metaKey) { e.preventDefault(); s.setZoom(s.zoom * 1.2); } break;
        case 'Minus': if (e.ctrlKey||e.metaKey) { e.preventDefault(); s.setZoom(s.zoom / 1.2); } break;
        case 'KeyB': s.setActiveTool('razor'); break;
        case 'KeyV': s.setActiveTool('select'); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // FIX: empty deps — uses storeRef inside

  const notify = useCallback((msg: string, type: 'ok'|'err'|'info' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const addVideoFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const isVid = file.type.startsWith('video/');
    const isImg = file.type.startsWith('image/');
    if (isVid) {
      const vid = document.createElement('video');
      vid.src = url;
      vid.onloadedmetadata = () => {
        store.addClip({ name: file.name.replace(/\.[^.]+$/,''), url, type:'video', originalDuration: vid.duration, duration: vid.duration, trimIn:0, trimOut: vid.duration, speed:1, volume:100, opacity:100, muted:false, loop:false, posX:0, posY:0, scaleX:1, scaleY:1, rotation:0, flipH:false, flipV:false, grade: defaultGrade(), transition:null, transitionDuration:0.5, filters:[], trackIndex:0, locked:false, visible:true });
        notify(`✓ ${file.name}`);
      };
      vid.onerror = () => {
        store.addClip({ name: file.name.replace(/\.[^.]+$/,''), url, type:'video', originalDuration:10, duration:10, trimIn:0, trimOut:10, speed:1, volume:100, opacity:100, muted:false, loop:false, posX:0, posY:0, scaleX:1, scaleY:1, rotation:0, flipH:false, flipV:false, grade: defaultGrade(), transition:null, transitionDuration:0.5, filters:[], trackIndex:0, locked:false, visible:true });
        notify(`✓ ${file.name}`);
      };
    } else if (isImg) {
      store.addClip({ name: file.name.replace(/\.[^.]+$/,''), url, type:'image', originalDuration:5, duration:5, trimIn:0, trimOut:5, speed:1, volume:0, opacity:100, muted:true, loop:false, posX:0, posY:0, scaleX:1, scaleY:1, rotation:0, flipH:false, flipV:false, grade: defaultGrade(), transition:null, transitionDuration:0.5, filters:[], trackIndex:0, locked:false, visible:true });
      notify(`✓ Image: ${file.name}`);
    }
  }, []);

  const addAudioFile = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    const audio = document.createElement('audio');
    audio.src = url;
    audio.onloadedmetadata = () => {
      store.addAudio({ name: file.name.replace(/\.[^.]+$/,''), url, type:'music', duration: audio.duration, volume:80, pan:0, fadeIn:0, fadeOut:0, loop:false, muted:false, solo:false, eq:{low:0,mid:0,high:0}, trackIndex:0 });
      notify(`🎵 ${file.name}`);
    };
    audio.onerror = () => {
      store.addAudio({ name: file.name.replace(/\.[^.]+$/,''), url, type:'music', duration:180, volume:80, pan:0, fadeIn:0, fadeOut:0, loop:false, muted:false, solo:false, eq:{low:0,mid:0,high:0}, trackIndex:0 });
      notify(`🎵 ${file.name}`);
    };
  }, []);

  // FIX: revoke all blob URLs when starting a new project
  const handleNewProject = useCallback(() => {
    const s = storeRef.current;
    s.project.clips.forEach(c => { if (c.url?.startsWith('blob:')) URL.revokeObjectURL(c.url); });
    s.project.audioTracks.forEach(a => { if (a.url?.startsWith('blob:')) URL.revokeObjectURL(a.url); });
    s.newProject();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type:'video/webm' });
        addVideoFile(new File([blob], `recording-${Date.now()}.webm`, { type:'video/webm' }));
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
      };
      mr.start(100);
      recorderRef.current = mr;
      setRecording(true);
      notify('🔴 Recording — click Stop when done');
    } catch { notify('Camera/mic denied', 'err'); }
  };

  const stopRecording = () => { recorderRef.current?.stop(); };

  // Global drop
  useEffect(() => {
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      Array.from(e.dataTransfer?.files || []).forEach(f => {
        if (f.type.startsWith('video/') || f.type.startsWith('image/')) addVideoFile(f);
        else if (f.type.startsWith('audio/')) addAudioFile(f);
      });
    };
    const onOver = (e: DragEvent) => e.preventDefault();
    window.addEventListener('drop', onDrop); window.addEventListener('dragover', onOver);
    return () => { window.removeEventListener('drop', onDrop); window.removeEventListener('dragover', onOver); };
  }, []);

  const C = { bg: '#070709', panel: '#0d0d12', border: '#1a1a28', text: '#dde0ee', muted: '#8888aa' };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background: C.bg, overflow:'hidden', fontFamily:'Inter,sans-serif' }}>
      <ProTopBar
        dark={dark} onToggleTheme={() => setDark(!dark)}
        onImportVideo={() => fileInputRef.current?.click()}
        onImportAudio={() => audioInputRef.current?.click()}
        onRecord={recording ? stopRecording : startRecording}
        recording={recording}
        onDownloadVideo={() => setModal('download-video')}
        onDownloadMusic={() => setModal('download-music')}
        onAI={() => setModal('ai')}
        onExport={() => setModal('export')}
        onGrade={() => setModal('grade')}
        onMixer={() => setModal('mixer')}
        onNewProject={handleNewProject}
        notify={notify}
      />

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        <ProLeftPanel onImportVideo={() => fileInputRef.current?.click()} onImportAudio={() => audioInputRef.current?.click()} onDownloadMusic={() => setModal('download-music')} notify={notify} />
        <ProPreview notify={notify} />
        <ProInspector notify={notify} />
      </div>

      <ProTimeline notify={notify} />

      {modal === 'download-video' && <DownloaderModal tab="video" onClose={() => setModal('none')} onFile={f => { addVideoFile(f); setModal('none'); }} notify={notify} />}
      {modal === 'download-music' && <DownloaderModal tab="music" onClose={() => setModal('none')} onFile={f => { addAudioFile(f); setModal('none'); }} notify={notify} />}
      {modal === 'ai' && <AIModal onClose={() => setModal('none')} notify={notify} />}
      {modal === 'export' && <ExportModal onClose={() => setModal('none')} notify={notify} />}
      {modal === 'grade' && <ColorGradePanel onClose={() => setModal('none')} notify={notify} />}
      {modal === 'mixer' && <AudioMixerPanel onClose={() => setModal('none')} notify={notify} />}

      {toast && (
        <div style={{ position:'fixed', bottom:26, left:'50%', transform:'translateX(-50%)', background: toast.type==='err'?'#e8375a':toast.type==='info'?'#7c3aed':'#10b981', color:'#fff', padding:'10px 22px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:9999, boxShadow:'0 8px 32px rgba(0,0,0,0.5)', whiteSpace:'nowrap' }}>
          {toast.msg}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="video/*,image/*" multiple style={{ display:'none' }} onChange={e => { Array.from(e.target.files||[]).forEach(addVideoFile); e.target.value=''; }} />
      <input ref={audioInputRef} type="file" accept="audio/*" multiple style={{ display:'none' }} onChange={e => { Array.from(e.target.files||[]).forEach(addAudioFile); e.target.value=''; }} />
    </div>
  );
}
