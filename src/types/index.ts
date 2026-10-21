export type SpeakerRole = 'narrator' | 'male' | 'female' | 'character';

export interface SubtitleCue {
  id: string;
  index: number;
  startTime: string; // "00:00:01,000"
  endTime: string;   // "00:00:04,500"
  startSeconds: number;
  endSeconds: number;
  speaker: SpeakerRole | string;
  speakerLabel: string; // e.g. "អ្នករៀបរាប់", "ប្រុស", "ស្រី"
  text: string;
  audioUrl?: string; // generated TTS audio for this cue
  audioBase64?: string;
  audioDuration?: number;
}

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3';

export type VideoFilter = 'none' | 'cinematic' | 'drama' | 'warm' | 'cyberpunk' | 'vintage' | 'high_contrast' | 'noir';

export interface SubtitleStyleConfig {
  fontFamily: 'Kantumruy Pro' | 'Battambang' | 'Moul' | 'Siemreap' | 'Inter';
  fontSize: number;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  bgColor: string;
  bgOpacity: number;
  positionY: 'bottom' | 'center' | 'top';
  yOffset: number; // percentage or px
  isBold: boolean;
  boxPadding: number;
  boxRadius: number;
}

export interface VideoProject {
  id: string;
  title: string;
  videoUrl: string;
  duration: number;
  aspectRatio: AspectRatio;
  videoVolume: number; // 0 to 1
  voiceoverVolume: number; // 0 to 1
  bgmVolume: number; // 0 to 1
  filter: VideoFilter;
  watermarkText: string;
  subtitleConfig: SubtitleStyleConfig;
  trimStart: number;
  trimEnd: number;
}

export interface TTSSettings {
  engine: 'gemini' | 'browser';
  narratorVoice: string; // e.g. 'Puck', 'Charon' or browser voice URI
  maleVoice: string;     // 'Charon' or 'Fenrir'
  femaleVoice: string;   // 'Kore' or 'Zephyr'
  pitch: number;         // 0.5 to 2
  rate: number;          // 0.5 to 2
  dramaticStyle: string;
}

export interface VocalSeparationState {
  vocalGain: number;       // 0 to 2
  bgmGain: number;         // 0 to 2
  centerCancellation: number; // 0 to 1
  vocalFrequency: number;  // 300 to 4000 Hz
  mode: 'all' | 'karaoke' | 'vocals_only';
  isPlaying: boolean;
}
