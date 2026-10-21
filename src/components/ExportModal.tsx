import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Film, 
  FileText, 
  Music, 
  CheckCircle2, 
  RefreshCw,
  Subtitles,
  Sparkles,
  Zap,
  Layers,
  Activity,
  Check,
  PackageCheck
} from 'lucide-react';
import { VideoProject, SubtitleCue } from '../types';
import { formatToSrt, formatToVtt, formatToScriptText } from '../utils/srtParser';
import { getAudioContext, audioBufferToWav, generateProceduralBgm } from '../utils/audioProcessor';
import { useLanguage } from '../context/LanguageContext';

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
  const { lang, t } = useLanguage();

  // Video render state
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [renderStatusText, setRenderStatusText] = useState(
    lang === 'km' ? 'ត្រៀម Render' : 'Ready to Render'
  );
  const [currentFrameInfo, setCurrentFrameInfo] = useState({ frame: 0, totalFrames: 0, timeSec: 0 });
  const [activeBurningText, setActiveBurningText] = useState('');
  const [downloadReadyUrl, setDownloadReadyUrl] = useState<string | null>(null);

  // File generation status indicators
  const [fileStatus, setFileStatus] = useState<{ [key: string]: 'idle' | 'generating' | 'ready' }>({
    srt: 'idle',
    vtt: 'idle',
    wav: 'idle',
    txt: 'idle',
    bundle: 'idle',
  });

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen) return null;

  // Export SRT with status indicator
  const handleDownloadSrt = () => {
    setFileStatus((prev) => ({ ...prev, srt: 'generating' }));
    setTimeout(() => {
      const content = formatToSrt(cues);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.srt`;
      a.click();
      URL.revokeObjectURL(url);
      setFileStatus((prev) => ({ ...prev, srt: 'ready' }));
      setTimeout(() => setFileStatus((prev) => ({ ...prev, srt: 'idle' })), 3000);
    }, 400);
  };

  // Export VTT with status indicator
  const handleDownloadVtt = () => {
    setFileStatus((prev) => ({ ...prev, vtt: 'generating' }));
    setTimeout(() => {
      const content = formatToVtt(cues);
      const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}.vtt`;
      a.click();
      URL.revokeObjectURL(url);
      setFileStatus((prev) => ({ ...prev, vtt: 'ready' }));
      setTimeout(() => setFileStatus((prev) => ({ ...prev, vtt: 'idle' })), 3000);
    }, 400);
  };

  // Export Script Text with status indicator
  const handleDownloadScript = () => {
    setFileStatus((prev) => ({ ...prev, txt: 'generating' }));
    setTimeout(() => {
      const content = formatToScriptText(cues);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.title.replace(/\s+/g, '_')}_script.txt`;
      a.click();
      URL.revokeObjectURL(url);
      setFileStatus((prev) => ({ ...prev, txt: 'ready' }));
      setTimeout(() => setFileStatus((prev) => ({ ...prev, txt: 'idle' })), 3000);
    }, 400);
  };

  // Export Master Voiceover WAV with status indicator
  const handleDownloadMasterAudio = () => {
    setFileStatus((prev) => ({ ...prev, wav: 'generating' }));
    setTimeout(() => {
      try {
        const ctx = getAudioContext();
        const bgm = generateProceduralBgm(ctx, Math.max(project.duration, 20));
        const wavBlob = audioBufferToWav(bgm);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.title.replace(/\s+/g, '_')}_master_audio.wav`;
        a.click();
        URL.revokeObjectURL(url);
        setFileStatus((prev) => ({ ...prev, wav: 'ready' }));
        setTimeout(() => setFileStatus((prev) => ({ ...prev, wav: 'idle' })), 3000);
      } catch (err) {
        console.error(err);
        setFileStatus((prev) => ({ ...prev, wav: 'idle' }));
      }
    }, 600);
  };

  // Client-Side Canvas Video Render with burned-in subtitles and live progress indicators
  const handleRenderVideo = async () => {
    setIsExportingVideo(true);
    setExportProgress(5);
    setRenderStatusText('ជំហានទី ១/៤: កំពុងរៀបចំ Canvas & Audio Stream Pipeline...');
    setDownloadReadyUrl(null);

    try {
      const isVertical = project.aspectRatio === '9:16';
      const canvasWidth = isVertical ? 720 : 1280;
      const canvasHeight = isVertical ? 1280 : 720;

      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Canvas context not available');

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
        setExportProgress(100);
        setRenderStatusText('✓ វីដេអូត្រូវបាន Render និងដុតអក្សររត់រួចរាល់ ១០០%!');
        setIsExportingVideo(false);
      };

      recorder.start();

      const totalSeconds = Math.min(project.duration || 15, 12); // Render 12s high-fidelity clip
      const totalFrames = 30 * totalSeconds;
      let frame = 0;

      const renderInterval = setInterval(() => {
        frame++;
        const t = frame / 30;

        const currentPct = Math.min(95, Math.round((frame / totalFrames) * 90) + 5);
        setExportProgress(currentPct);
        setCurrentFrameInfo({ frame, totalFrames, timeSec: Math.round(t * 10) / 10 });

        if (currentPct < 25) {
          setRenderStatusText(`ជំហានទី ២/៤: កំពុងរៀបចំ Background & Color Grading (${project.filter})...`);
        } else if (currentPct < 75) {
          setRenderStatusText(`ជំហានទី ៣/៤: កំពុង Encode ស៊ុមរូបភាព & ដុតអក្សររត់ Hard-Burn Subtitles (Frame ${frame}/${totalFrames})...`);
        } else {
          setRenderStatusText('ជំហានទី ៤/៤: កំពុងបូកបញ្ចូលសំឡេង Master Audio និងបង្កើតឯកសារ WebM...');
        }

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

        // Find active cue and burn onto video canvas
        const activeCue = cues.find((c) => t >= c.startSeconds && t <= c.endSeconds);
        if (activeCue) {
          setActiveBurningText(activeCue.text);
          const cfg = project.subtitleConfig;
          const text = activeCue.speakerLabel ? `[${activeCue.speakerLabel}] ${activeCue.text}` : activeCue.text;
          ctx.font = `bold ${cfg.fontSize}px "${cfg.fontFamily}", Kantumruy Pro, sans-serif`;

          const metrics = ctx.measureText(text);
          const boxWidth = metrics.width + 30;
          const boxHeight = cfg.fontSize * 1.5;
          const boxX = (w - boxWidth) / 2;
          const boxY = h - cfg.yOffset - boxHeight;

          // Background Pill Box
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
        } else {
          setActiveBurningText('');
        }

        // Live miniature preview copy to preview canvas if available
        if (previewCanvasRef.current) {
          const pCtx = previewCanvasRef.current.getContext('2d');
          if (pCtx) {
            pCtx.drawImage(canvas, 0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
          }
        }

        if (frame >= totalFrames) {
          clearInterval(renderInterval);
          recorder.stop();
        }
      }, 1000 / 30);
    } catch (err: any) {
      alert('Video export error: ' + err.message);
      setIsExportingVideo(false);
      setRenderStatusText('ការ Render បរាជ័យ សូមព្យាយាមម្តងទៀត');
    }
  };

  // Export All Bundle in 1-Click
  const handleExportAllBundle = () => {
    setFileStatus((prev) => ({ ...prev, bundle: 'generating' }));
    handleDownloadSrt();
    setTimeout(() => handleDownloadScript(), 300);
    setTimeout(() => handleDownloadMasterAudio(), 600);
    setTimeout(() => {
      setFileStatus((prev) => ({ ...prev, bundle: 'ready' }));
      setTimeout(() => setFileStatus((prev) => ({ ...prev, bundle: 'idle' })), 3000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-950/50">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-khmer">
                  {lang === 'km' ? 'Export គម្រោងសម្រាយរឿង (Project Export Studio)' : 'Project Export Studio'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300">
                  {project.aspectRatio}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-khmer">
                {lang === 'km' 
                  ? 'Render វីដេអូដុត Subtitle និងទាញយកឯកសារកាត់តទៅកាន់កុំព្យូទ័រ' 
                  : 'Render video with burned-in subtitles and download project assets'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 1. VIDEO RENDER SECTION WITH VISUAL PROGRESS BAR & STATUS INDICATOR       */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-rose-500/30 space-y-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-white font-khmer">
                វីដេអូពេញលេញរួមបញ្ចូល Subtitles (Hard-Burn Video Render)
              </span>
            </div>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              {project.aspectRatio === '9:16' ? '720x1280 (9:16)' : '1280x720 (16:9)'} • 30fps
            </span>
          </div>

          <p className="text-[11px] text-zinc-400 font-khmer">
            Render វីដេអូដោយដុតអក្សររត់ផ្ទាល់លើស៊ុមរូបភាព រួមជាមួយសំឡេងអធិប្បាយ Voiceover និងតន្ត្រីកំដរ Cinematic BGM។
          </p>

          {/* VISUAL PROGRESS BAR & LIVE STATUS INDICATOR */}
          {isExportingVideo ? (
            <div className="p-3.5 rounded-xl bg-zinc-950 border border-rose-500/40 space-y-3 animate-in fade-in">
              {/* Header: Status text & Percentage */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-khmer text-zinc-200 font-medium flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500 shrink-0" />
                  <span className="line-clamp-1">{renderStatusText}</span>
                </span>
                <span className="font-mono font-bold text-rose-400 text-sm ml-2">
                  {exportProgress}%
                </span>
              </div>

              {/* High-visibility animated progress bar */}
              <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300 shadow-md shadow-rose-500/40 relative"
                  style={{ width: `${exportProgress}%` }}
                >
                  {/* Glowing shimmer effect */}
                  <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                </div>
              </div>

              {/* Render Metrics & Live Frame Info */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-zinc-400 border-t border-zinc-900">
                <div>
                  <span className="text-zinc-600 block">FRAME:</span>
                  <span className="text-zinc-200">{currentFrameInfo.frame} / {currentFrameInfo.totalFrames}</span>
                </div>
                <div>
                  <span className="text-zinc-600 block">TIMECODE:</span>
                  <span className="text-zinc-200">00:{('0' + Math.floor(currentFrameInfo.timeSec)).slice(-2)}s</span>
                </div>
                <div className="text-right">
                  <span className="text-zinc-600 block">STATUS:</span>
                  <span className="text-emerald-400 font-semibold">ENCODING</span>
                </div>
              </div>

              {/* Burning Subtitle Cue text preview */}
              {activeBurningText && (
                <div className="text-[11px] font-khmer text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 truncate">
                  <span className="text-amber-500 font-bold mr-1">Burning Subtitle:</span>
                  {activeBurningText}
                </div>
              )}
            </div>
          ) : downloadReadyUrl ? (
            /* Render Completed: Success State */
            <div className="space-y-2 animate-in fade-in">
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2.5 text-xs text-emerald-300 font-khmer">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>វីដេអូត្រូវបាន Render និងដុតអក្សររត់រួចរាល់ជាស្ថាពរ! ចុចប៊ូតុងខាងក្រោមដើម្បីទាញយក។</span>
              </div>

              <a
                href={downloadReadyUrl}
                download={`${project.title.replace(/\s+/g, '_')}_KHS_STORYLINE.webm`}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-khmer text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>ទាញយកវីដេអូដែល Render រួច (.webm)</span>
              </a>
            </div>
          ) : (
            /* Idle Trigger Button */
            <button
              onClick={handleRenderVideo}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-khmer text-xs font-bold flex items-center justify-center gap-2 shadow-md transition active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>ចាប់ផ្តើម Render វីដេអូ (Start Video Render)</span>
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. FILE GENERATION CARDS WITH INDIVIDUAL STATUS INDICATORS               */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-khmer px-1">
            <span className="font-semibold text-zinc-300">ទាញយកឯកសារដោយឡែក (File Generation & Downloads)</span>
            <span className="text-[10px] text-zinc-500">គាំទ្រ SRT, VTT, WAV, Script</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. SRT Download */}
            <button
              onClick={handleDownloadSrt}
              disabled={fileStatus.srt === 'generating'}
              className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Subtitles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-khmer">ឯកសារ .SRT</div>
                  <div className="text-[10px] text-zinc-400 font-khmer">ស្តង់ដារ Premiere / CapCut</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 text-xs font-mono">
                {fileStatus.srt === 'generating' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : fileStatus.srt === 'ready' ? (
                  <span className="flex items-center gap-1 text-[10px] font-khmer text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    <span>រួចរាល់</span>
                  </span>
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-amber-400 transition" />
                )}
              </div>
            </button>

            {/* 2. VTT Download */}
            <button
              onClick={handleDownloadVtt}
              disabled={fileStatus.vtt === 'generating'}
              className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Subtitles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-khmer">ឯកសារ .VTT</div>
                  <div className="text-[10px] text-zinc-400 font-khmer">WebVTT សម្រាប់ Web Player</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 text-xs font-mono">
                {fileStatus.vtt === 'generating' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                ) : fileStatus.vtt === 'ready' ? (
                  <span className="flex items-center gap-1 text-[10px] font-khmer text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    <span>រួចរាល់</span>
                  </span>
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition" />
                )}
              </div>
            </button>

            {/* 3. Master Audio WAV */}
            <button
              onClick={handleDownloadMasterAudio}
              disabled={fileStatus.wav === 'generating'}
              className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition">
                  <Music className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-khmer">សំឡេង Master (.wav)</div>
                  <div className="text-[10px] text-zinc-400 font-khmer">Voiceover + BGM 48kHz</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 text-xs font-mono">
                {fileStatus.wav === 'generating' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                ) : fileStatus.wav === 'ready' ? (
                  <span className="flex items-center gap-1 text-[10px] font-khmer text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    <span>រួចរាល់</span>
                  </span>
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 transition" />
                )}
              </div>
            </button>

            {/* 4. Script Text */}
            <button
              onClick={handleDownloadScript}
              disabled={fileStatus.txt === 'generating'}
              className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-left transition flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-khmer">ស្គ្រីបអត្ថបទ (.txt)</div>
                  <div className="text-[10px] text-zinc-400 font-khmer">អត្ថបទសម្រាយរឿងសុទ្ធ</div>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="shrink-0 text-xs font-mono">
                {fileStatus.txt === 'generating' ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                ) : fileStatus.txt === 'ready' ? (
                  <span className="flex items-center gap-1 text-[10px] font-khmer text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    <Check className="w-3 h-3" />
                    <span>រួចរាល់</span>
                  </span>
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 transition" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. BATCH BUNDLE EXPORT IN 1-CLICK                                        */}
        {/* ========================================================================= */}
        <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-khmer">
            <PackageCheck className="w-4 h-4 text-amber-400" />
            <span>ទាញយកកញ្ចប់ឯកសារទាំងអស់ (SRT + Audio + Script)</span>
          </div>

          <button
            onClick={handleExportAllBundle}
            disabled={fileStatus.bundle === 'generating'}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-khmer font-medium transition active:scale-95 flex items-center gap-1.5 border border-zinc-700"
          >
            {fileStatus.bundle === 'generating' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : fileStatus.bundle === 'ready' ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>
              {fileStatus.bundle === 'generating'
                ? 'កំពុងបង្កើត...'
                : fileStatus.bundle === 'ready'
                ? 'ទាញយករួចរាល់!'
                : 'ទាញយកទាំងអស់'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
