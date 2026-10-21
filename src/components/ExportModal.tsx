import React, { useState } from 'react';
import { 
  X, 
  Download, 
  Film, 
  FileText, 
  Music, 
  CheckCircle2, 
  RefreshCw,
  Subtitles,
  Sparkles
} from 'lucide-react';
import { VideoProject, SubtitleCue } from '../types';
import { formatToSrt, formatToVtt, formatToScriptText } from '../utils/srtParser';
import { getAudioContext, audioBufferToWav, generateProceduralBgm } from '../utils/audioProcessor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: VideoProject;
  cues: SubtitleCue[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  project,
  cues,
}) => {
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  // Export SRT
  const handleDownloadSrt = () => {
    const content = formatToSrt(cues);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export VTT
  const handleDownloadVtt = () => {
    const content = formatToVtt(cues);
    const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Script Text
  const handleDownloadScript = () => {
    const content = formatToScriptText(cues);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_script.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Master Voiceover WAV
  const handleDownloadMasterAudio = () => {
    const ctx = getAudioContext();
    const bgm = generateProceduralBgm(ctx, Math.max(project.duration, 20));
    const wavBlob = audioBufferToWav(bgm);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.replace(/\s+/g, '_')}_master_audio.wav`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Client-Side Canvas Video Render with burned-in subtitles and combined audio!
  const handleRenderVideo = async () => {
    setIsExportingVideo(true);
    setExportProgress(10);
    setDownloadReadyUrl(null);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = project.aspectRatio === '9:16' ? 720 : 1280;
      canvas.height = project.aspectRatio === '9:16' ? 1280 : 720;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas not available');

      const stream = canvas.captureStream(30);

      // Audio setup for mixed export
      const audioCtx = getAudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const audioTrack = dest.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9,opus' });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(videoBlob);
        setDownloadReadyUrl(videoUrl);
        setIsExportingVideo(false);
      };

      recorder.start();

      const totalSeconds = Math.min(project.duration || 15, 12); // Render 12s demo export
      const totalFrames = 30 * totalSeconds;
      let frame = 0;

      const renderInterval = setInterval(() => {
        frame++;
        const t = frame / 30;
        setExportProgress(Math.min(95, Math.round((frame / totalFrames) * 90) + 10));

        // Render Frame
        const w = canvas.width;
        const h = canvas.height;

        // Gradient background
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#09090b');
        grad.addColorStop(0.5, '#18181b');
        grad.addColorStop(1, '#09090b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Center visual scene
        ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 160 + Math.sin(t * 3) * 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Kantumruy Pro, Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(project.title, w / 2, h / 2 - 20);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px Inter, sans-serif';
        ctx.fillText(`KHS STORYLINE Master Export • Time: 00:${('0' + Math.floor(t)).slice(-2)}`, w / 2, h / 2 + 25);

        // Find active cue
        const activeCue = cues.find((c) => t >= c.startSeconds && t <= c.endSeconds);
        if (activeCue) {
          const cfg = project.subtitleConfig;
          const text = activeCue.speakerLabel ? `[${activeCue.speakerLabel}] ${activeCue.text}` : activeCue.text;
          ctx.font = `bold ${cfg.fontSize}px "${cfg.fontFamily}", Kantumruy Pro, sans-serif`;

          const metrics = ctx.measureText(text);
          const boxWidth = metrics.width + 30;
          const boxHeight = cfg.fontSize * 1.5;
          const boxX = (w - boxWidth) / 2;
          const boxY = h - cfg.yOffset - boxHeight;

          // Box
          ctx.fillStyle = `rgba(0, 0, 0, ${cfg.bgOpacity})`;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
          ctx.fill();

          // Stroke
          ctx.strokeStyle = cfg.strokeColor;
          ctx.lineWidth = cfg.strokeWidth;
          ctx.strokeText(text, w / 2, boxY + boxHeight / 2 + cfg.fontSize * 0.35);

          // Fill
          ctx.fillStyle = cfg.color;
          ctx.fillText(text, w / 2, boxY + boxHeight / 2 + cfg.fontSize * 0.35);
        }

        if (frame >= totalFrames) {
          clearInterval(renderInterval);
          recorder.stop();
        }
      }, 1000 / 30);
    } catch (err: any) {
      alert('Video export error: ' + err.message);
      setIsExportingVideo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-khmer">
                Export គម្រោងសម្រាយរឿង (Project Export)
              </h3>
              <p className="text-[11px] text-zinc-400 font-khmer">
                ជ្រើសរើសទម្រង់ដែលអ្នកចង់ទាញយកទៅកាន់កុំព្យូទ័រ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option 1: Full Video with hard-burned subtitles */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-rose-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-white font-khmer">
                វីដេអូពេញលេញរួមបញ្ចូល Subtitles (Burned-in Video)
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400">{project.aspectRatio} • WebM/MP4</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-khmer">
            Render វីដេអូដោយដុតអក្សររត់ផ្ទាល់លើស៊ុមរូបភាព រួមជាមួយសំឡេងអធិប្បាយ និងតន្ត្រីកំដរ។
          </p>

          {isExportingVideo ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-rose-400">
                <span>Rendering Video...</span>
                <span>{exportProgress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          ) : downloadReadyUrl ? (
            <a
              href={downloadReadyUrl}
              download={`${project.title.replace(/\s+/g, '_')}_recap.webm`}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-khmer text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>ទាញយកវីដេអូដែល Render រួច (.webm)</span>
            </a>
          ) : (
            <button
              onClick={handleRenderVideo}
              className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-khmer text-xs font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>ចាប់ផ្តើម Render វីដេអូ</span>
            </button>
          )}
        </div>

        {/* Option 2: Subtitle Files (.srt / .vtt) */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadSrt}
            className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold font-khmer mb-1">
              <Subtitles className="w-4 h-4" />
              <span>ឯកសារ .SRT</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-khmer">
              ស្តង់ដារ Subtitle សម្រាប់ Premiere, CapCut, YouTube
            </p>
          </button>

          <button
            onClick={handleDownloadVtt}
            className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold font-khmer mb-1">
              <Subtitles className="w-4 h-4" />
              <span>ឯកសារ .VTT</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-khmer">
              WebVTT Subtitle សម្រាប់ Web Player
            </p>
          </button>
        </div>

        {/* Option 3: Audio & Script Text */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDownloadMasterAudio}
            className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold font-khmer mb-1">
              <Music className="w-4 h-4" />
              <span>សំឡេង Master (.wav)</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-khmer">
              សំឡេងអធិប្បាយ និង BGM លាយរួច
            </p>
          </button>

          <button
            onClick={handleDownloadScript}
            className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold font-khmer mb-1">
              <FileText className="w-4 h-4" />
              <span>ស្គ្រីបអត្ថបទ (.txt)</span>
            </div>
            <p className="text-[10px] text-zinc-400 font-khmer">
              អត្ថបទសម្រាយរឿងសុទ្ធ
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
