import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';

export type Platform = 'youtube-shorts'|'youtube'|'tiktok'|'reels'|'facebook'|'twitter'|'custom';
export type AspectRatio = '9:16'|'16:9'|'1:1'|'4:5'|'custom';

export const PLATFORMS: Record<Platform, { label:string; ratio:AspectRatio; w:number; h:number; maxSec:number; icon:string }> = {
  'youtube-shorts': { label:'YouTube Shorts', ratio:'9:16', w:1080, h:1920, maxSec:60,  icon:'📱' },
  'youtube':        { label:'YouTube',         ratio:'16:9', w:1920, h:1080, maxSec:600, icon:'▶️' },
  'tiktok':         { label:'TikTok',          ratio:'9:16', w:1080, h:1920, maxSec:180, icon:'🎵' },
  'reels':          { label:'Instagram Reels', ratio:'9:16', w:1080, h:1920, maxSec:90,  icon:'📸' },
  'facebook':       { label:'Facebook',        ratio:'16:9', w:1280, h:720,  maxSec:240, icon:'👥' },
  'twitter':        { label:'Twitter/X',       ratio:'16:9', w:1280, h:720,  maxSec:140, icon:'🐦' },
  'custom':         { label:'Custom',          ratio:'16:9', w:1920, h:1080, maxSec:600, icon:'⚙️' },
};

export interface ColorGrade {
  brightness: number; contrast: number; saturation: number; sharpness: number;
  temperature: number; tint: number; highlights: number; shadows: number;
  vignette: number; grain: number; lut: string | null;
}

export const defaultGrade = (): ColorGrade => ({
  brightness:0, contrast:0, saturation:0, sharpness:0,
  temperature:0, tint:0, highlights:0, shadows:0,
  vignette:0, grain:0, lut:null,
});

export interface VideoClip {
  id: string; name: string; url: string; type: 'video'|'image';
  start: number; duration: number; originalDuration: number;
  trimIn: number; trimOut: number;
  speed: number; volume: number; opacity: number;
  muted: boolean; loop: boolean;
  posX: number; posY: number; scaleX: number; scaleY: number; rotation: number;
  flipH: boolean; flipV: boolean;
  grade: ColorGrade;
  transition: string | null; transitionDuration: number;
  filters: string[];
  trackIndex: number; // for multi-track support
  color: string;
  locked: boolean; visible: boolean;
}

export interface AudioTrack {
  id: string; name: string; url: string|null; type: 'music'|'sfx'|'voiceover';
  start: number; duration: number;
  volume: number; pan: number; // -1 left, 0 center, 1 right
  fadeIn: number; fadeOut: number; loop: boolean;
  muted: boolean; solo: boolean;
  eq: { low:number; mid:number; high:number };
  color: string; trackIndex: number;
}

export interface TextOverlay {
  id: string; text: string;
  start: number; duration: number;
  x: number; y: number; // percent
  fontSize: number; fontFamily: string;
  color: string; bgColor: string|null; outlineColor: string|null;
  bold: boolean; italic: boolean; underline: boolean;
  align: 'left'|'center'|'right';
  animation: string|null; animationOut: string|null;
  rotation: number; letterSpacing: number;
  shadow: boolean;
}

export interface Caption {
  id: string; text: string; time: number; duration: number;
}

export interface Marker {
  id: string; time: number; label: string; color: string;
}

export interface Project {
  id: string; name: string; platform: Platform;
  clips: VideoClip[]; audioTracks: AudioTrack[];
  textOverlays: TextOverlay[]; captions: Caption[];
  markers: Marker[];
  duration: number;
  fps: number; quality: string;
  createdAt: number; updatedAt: number;
}

const COLORS = ['#e8375a','#7c3aed','#06b6d4','#10b981','#f59e0b','#ec4899','#3b82f6','#f97316'];
let ci = 0; const nc = () => COLORS[ci++ % COLORS.length];

const newProject = (): Project => ({
  id: uuid(), name: 'Untitled Project', platform: 'youtube-shorts',
  clips:[], audioTracks:[], textOverlays:[], captions:[], markers:[],
  duration: 30, fps: 30, quality: '1080p',
  createdAt: Date.now(), updatedAt: Date.now(),
});

interface EditorStore {
  project: Project;
  currentTime: number; playing: boolean; volume: number; zoom: number;
  selectedId: string|null; selectedType: 'clip'|'audio'|'text'|null;
  activePanel: string; activeTool: 'select'|'razor'|'hand'|'text';
  showWaveforms: boolean; snapToGrid: boolean; rippleEdit: boolean;
  ffmpegReady: boolean; ffmpegLoading: boolean;
  renderProgress: number|null; renderLog: string;
  undoStack: Project[]; redoStack: Project[];

  // Project
  setProjectName:(n:string)=>void; setPlatform:(p:Platform)=>void; setFps:(f:number)=>void;
  // Clips
  addClip:(c:Omit<VideoClip,'id'|'start'|'color'>)=>void;
  updateClip:(id:string,u:Partial<VideoClip>)=>void;
  deleteClip:(id:string)=>void;
  splitClip:(id:string,t:number)=>void;
  duplicateClip:(id:string)=>void;
  // Audio
  addAudio:(a:Omit<AudioTrack,'id'|'start'|'color'>)=>void;
  updateAudio:(id:string,u:Partial<AudioTrack>)=>void;
  deleteAudio:(id:string)=>void;
  // Text
  addText:(t:Omit<TextOverlay,'id'>)=>void;
  updateText:(id:string,u:Partial<TextOverlay>)=>void;
  deleteText:(id:string)=>void;
  // Captions & Markers
  setCaptions:(c:Caption[])=>void;
  addMarker:(t:number)=>void; deleteMarker:(id:string)=>void;
  // Playback
  setCurrentTime:(t:number)=>void; setPlaying:(p:boolean)=>void; setVolume:(v:number)=>void;
  // UI
  setSelectedId:(id:string|null,type?:'clip'|'audio'|'text'|null)=>void;
  setActivePanel:(p:string)=>void; setActiveTool:(t:'select'|'razor'|'hand'|'text')=>void;
  setZoom:(z:number)=>void; toggleSnapToGrid:()=>void; toggleRippleEdit:()=>void; toggleWaveforms:()=>void;
  // FFmpeg
  setFfmpegReady:(r:boolean)=>void; setFfmpegLoading:(l:boolean)=>void;
  setRenderProgress:(p:number|null)=>void; setRenderLog:(l:string)=>void;
  // History
  pushUndo:()=>void; undo:()=>void; redo:()=>void;
  // Save
  saveProject:()=>void; loadProject:(p:Project)=>void; newProject:()=>void;
  recalcDuration:()=>void;
}

export const useStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      project: newProject(),
      currentTime:0, playing:false, volume:80, zoom:1,
      selectedId:null, selectedType:null,
      activePanel:'clips', activeTool:'select',
      showWaveforms:true, snapToGrid:true, rippleEdit:false,
      ffmpegReady:false, ffmpegLoading:false,
      renderProgress:null, renderLog:'',
      undoStack:[], redoStack:[],

      setProjectName:(name)=>set(s=>({project:{...s.project,name}})),
      setPlatform:(platform)=>set(s=>({project:{...s.project,platform}})),
      setFps:(fps)=>set(s=>({project:{...s.project,fps}})),

      addClip:(clip) => {
        get().pushUndo();
        set(s=>{
          const start = s.project.clips.filter(c=>c.trackIndex===clip.trackIndex).reduce((a,c)=>Math.max(a,c.start+c.duration),0);
          const nc2:VideoClip = {...clip, id:uuid(), start, color:nc()};
          const clips=[...s.project.clips,nc2];
          return {project:{...s.project,clips,duration:clips.reduce((a,c)=>Math.max(a,c.start+c.duration),s.project.duration)}};
        });
      },
      updateClip:(id,u)=>{
        set(s=>{
          const clips=s.project.clips.map(c=>c.id===id?{...c,...u}:c);
          return {project:{...s.project,clips,duration:clips.reduce((a,c)=>Math.max(a,c.start+c.duration),30)}};
        });
      },
      deleteClip:(id)=>{ get().pushUndo(); set(s=>{ const clips=s.project.clips.filter(c=>c.id!==id); return {project:{...s.project,clips,duration:clips.reduce((a,c)=>Math.max(a,c.start+c.duration),30)},selectedId:null}; }); },
      splitClip:(id,t)=>{ get().pushUndo(); set(s=>{
        const idx=s.project.clips.findIndex(c=>c.id===id); if(idx<0)return s;
        const clip=s.project.clips[idx];
        const at=t-clip.start; if(at<=0.05||at>=clip.duration-0.05)return s;
        const a:VideoClip={...clip,duration:at,trimOut:clip.trimIn+at};
        const b:VideoClip={...clip,id:uuid(),start:clip.start+at,duration:clip.duration-at,trimIn:clip.trimIn+at};
        const clips=[...s.project.clips]; clips.splice(idx,1,a,b);
        return {project:{...s.project,clips}};
      }); },
      duplicateClip:(id)=>set(s=>{
        const c=s.project.clips.find(x=>x.id===id); if(!c)return s;
        const nd:VideoClip={...c,id:uuid(),start:c.start+c.duration};
        const clips=[...s.project.clips,nd];
        return {project:{...s.project,clips,duration:clips.reduce((a,x)=>Math.max(a,x.start+x.duration),s.project.duration)}};
      }),

      addAudio:(track)=>set(s=>({project:{...s.project,audioTracks:[...s.project.audioTracks,{...track,id:uuid(),start:0,color:nc()}]}})),
      updateAudio:(id,u)=>set(s=>({project:{...s.project,audioTracks:s.project.audioTracks.map(a=>a.id===id?{...a,...u}:a)}})),
      deleteAudio:(id)=>set(s=>({project:{...s.project,audioTracks:s.project.audioTracks.filter(a=>a.id!==id)}})),

      addText:(t)=>set(s=>({project:{...s.project,textOverlays:[...s.project.textOverlays,{...t,id:uuid()}]}})),
      updateText:(id,u)=>set(s=>({project:{...s.project,textOverlays:s.project.textOverlays.map(t=>t.id===id?{...t,...u}:t)}})),
      deleteText:(id)=>set(s=>({project:{...s.project,textOverlays:s.project.textOverlays.filter(t=>t.id!==id)}})),

      setCaptions:(captions)=>set(s=>({project:{...s.project,captions}})),
      addMarker:(time)=>set(s=>({project:{...s.project,markers:[...s.project.markers,{id:uuid(),time,label:'Marker',color:'#e8375a'}]}})),
      deleteMarker:(id)=>set(s=>({project:{...s.project,markers:s.project.markers.filter(m=>m.id!==id)}})),

      setCurrentTime:(t)=>set({currentTime:t}),
      setPlaying:(p)=>set({playing:p}),
      setVolume:(v)=>set({volume:v}),

      setSelectedId:(id,type=null)=>set({selectedId:id,selectedType:type}),
      setActivePanel:(p)=>set({activePanel:p}),
      setActiveTool:(t)=>set({activeTool:t}),
      setZoom:(z)=>set({zoom:Math.max(0.1,Math.min(20,z))}),
      toggleSnapToGrid:()=>set(s=>({snapToGrid:!s.snapToGrid})),
      toggleRippleEdit:()=>set(s=>({rippleEdit:!s.rippleEdit})),
      toggleWaveforms:()=>set(s=>({showWaveforms:!s.showWaveforms})),

      setFfmpegReady:(r)=>set({ffmpegReady:r}),
      setFfmpegLoading:(l)=>set({ffmpegLoading:l}),
      setRenderProgress:(p)=>set({renderProgress:p}),
      setRenderLog:(l)=>set({renderLog:l}),

      pushUndo:()=>set(s=>({undoStack:[...s.undoStack.slice(-30),s.project],redoStack:[]})),
      undo:()=>set(s=>{
        if(!s.undoStack.length)return s;
        const stack=[...s.undoStack]; const prev=stack.pop()!;
        return {project:prev,undoStack:stack,redoStack:[s.project,...s.redoStack]};
      }),
      redo:()=>set(s=>{
        if(!s.redoStack.length)return s;
        const stack=[...s.redoStack]; const next=stack.shift()!;
        return {project:next,redoStack:stack,undoStack:[...s.undoStack,s.project]};
      }),

      saveProject:()=>set(s=>{
        const p={...s.project,updatedAt:Date.now()};
        const all=JSON.parse(localStorage.getItem('vfpro-projects')||'[]');
        const idx=all.findIndex((x:any)=>x.id===p.id);
        if(idx>=0)all[idx]=p; else all.unshift(p);
        localStorage.setItem('vfpro-projects',JSON.stringify(all.slice(0,20)));
        return {project:p};
      }),
      loadProject:(p)=>set({project:p,currentTime:0,playing:false,selectedId:null}),
      newProject:()=>set({project:newProject(),currentTime:0,playing:false,selectedId:null,undoStack:[],redoStack:[]}),
      recalcDuration:()=>set(s=>({project:{...s.project,duration:s.project.clips.reduce((a,c)=>Math.max(a,c.start+c.duration),30)}})),
    }),
    { name:'vfpro-editor', partialize:(s)=>({ project:s.project, volume:s.volume, zoom:s.zoom, snapToGrid:s.snapToGrid }) }
  )
);
