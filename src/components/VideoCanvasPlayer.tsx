import React, { useRef, useEffect, useState, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  RotateCcw, 
  Upload, 
  Sparkles,
  Smartphone,
  Tv,
  Square,
  FastForward,
  Rewind
} from 'lucide-react';
import { VideoProject, SubtitleCue, AspectRatio } from '../types';

interface VideoCanvasPlayerProps {
  project: VideoProject;
  cues: SubtitleCue[];
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onVideoLoaded?: (duration: number) => void;
  onUploadCustomVideo: (file: File) => void;
  onSelectCue?: (cue: SubtitleCue) => void;
  onAspectChange: (aspect: AspectRatio) => void;
}

export const VideoCanvasPlayer: React.FC<VideoCanvasPlayerProps> = ({
  project,
  cues,
  currentTime,
  setCurrentTime,
  isPlaying,
  setIsPlaying,
  onVideoLoaded,
  onUploadCustomVideo,
  onAspectChange,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [duration, setDuration] = useState<number>(project.duration || 30);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // Active subtitle cue for current time
  const activeCue = useMemo(() => {
    return cues.find(
      (cue) => currentTime >= cue.startSeconds && currentTime <= cue.endSeconds
    );
  }, [cues, currentTime]);

  // Sync video play state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch((e) => {
        console.warn('Playback prevented:', e);
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Sync playback rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : project.videoVolume;
    }
  }, [isMuted, project.videoVolume]);

  // Video time update event
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (!isNaN(dur) && dur > 0) {
        setDuration(dur);
        if (onVideoLoaded) onVideoLoaded(dur);
      }
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleStep = (delta: number) => {
    const newTime = Math.max(0, Math.min(duration, currentTime + delta));
    handleSeek(newTime);
  };

  // Canvas drawing loop
  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    const render = () => {
      if (canvas && video && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          // Clear
          ctx.clearRect(0, 0, width, height);

          // Apply video color grading filter
          ctx.save();
          if (project.filter === 'cinematic') {
            ctx.filter = 'contrast(1.15) saturate(1.2) brightness(0.95)';
          } else if (project.filter === 'warm') {
            ctx.filter = 'sepia(0.2) saturate(1.25) contrast(1.1)';
          } else if (project.filter === 'drama') {
            ctx.filter = 'contrast(1.3) brightness(0.9) saturate(0.9)';
          } else if (project.filter === 'cyberpunk') {
            ctx.filter = 'hue-rotate(20deg) contrast(1.25) saturate(1.4)';
          } else if (project.filter === 'noir') {
            ctx.filter = 'grayscale(1) contrast(1.4) brightness(0.9)';
          } else if (project.filter === 'vintage') {
            ctx.filter = 'sepia(0.4) contrast(1.1) brightness(0.95)';
          } else {
            ctx.filter = 'none';
          }

          // Draw video frame with aspect ratio letterboxing / filling
          const videoAspect = (video.videoWidth || 16) / (video.videoHeight || 9);
          const canvasAspect = width / height;

          let renderW = width;
          let renderH = height;
          let renderX = 0;
          let renderY = 0;

          if (canvasAspect > videoAspect) {
            // Canvas is wider than video: letterbox sides
            renderW = height * videoAspect;
            renderX = (width - renderW) / 2;
          } else {
            // Canvas is taller than video: letterbox top/bottom
            renderH = width / videoAspect;
            renderY = (height - renderH) / 2;
          }

          ctx.drawImage(video, renderX, renderY, renderW, renderH);
          ctx.restore();

          // Draw Watermark if set
          if (project.watermarkText) {
            ctx.save();
            ctx.font = '600 16px Inter, Kantumruy Pro, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 4;
            ctx.fillText(project.watermarkText, 24, 36);
            ctx.restore();
          }

          // Draw active Subtitle Cue
          if (activeCue && activeCue.text) {
            ctx.save();
            const config = project.subtitleConfig;

            // Scale font size based on canvas width
            const scale = width / 1280;
            const targetFontSize = Math.max(16, Math.round(config.fontSize * scale));
            const fontString = `${config.isBold ? 'bold' : 'normal'} ${targetFontSize}px "${config.fontFamily}", Kantumruy Pro, Inter, sans-serif`;
            ctx.font = fontString;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Clean text line breaks or speaker badge
            const fullLine = activeCue.speakerLabel
              ? `[${activeCue.speakerLabel}] ${activeCue.text}`
              : activeCue.text;

            // Simple text wrapping for long subtitles
            const maxWidth = width * 0.85;
            const words = fullLine.split(' ');
            const lines: string[] = [];
            let currentLine = words[0] || '';

            for (let i = 1; i < words.length; i++) {
              const testLine = currentLine + ' ' + words[i];
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth) {
                lines.push(currentLine);
                currentLine = words[i];
              } else {
                currentLine = testLine;
              }
            }
            lines.push(currentLine);

            const lineHeight = targetFontSize * 1.35;
            const totalTextHeight = lines.length * lineHeight;

            // Compute Y position
            let baseY = height - 60 * scale;
            if (config.positionY === 'center') {
              baseY = height / 2;
            } else if (config.positionY === 'top') {
              baseY = 60 * scale + totalTextHeight / 2;
            } else {
              // Bottom
              baseY = height - (config.yOffset * scale) - totalTextHeight / 2;
            }

            // Draw Background Box / Pill
            if (config.bgOpacity > 0) {
              const maxLineWidth = Math.max(...lines.map((l) => ctx.measureText(l).width));
              const boxPadX = config.boxPadding * scale * 1.5;
              const boxPadY = config.boxPadding * scale;
              const boxWidth = maxLineWidth + boxPadX * 2;
              const boxHeight = totalTextHeight + boxPadY * 2;
              const boxX = (width - boxWidth) / 2;
              const boxY = baseY - totalTextHeight / 2 - boxPadY;

              ctx.save();
              ctx.fillStyle = config.bgColor;
              ctx.globalAlpha = config.bgOpacity;
              
              // Rounded pill rectangle
              const radius = config.boxRadius * scale;
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
              ctx.fill();
              ctx.restore();
            }

            // Draw Text Lines with outline stroke
            lines.forEach((line, lineIdx) => {
              const lineY = baseY - (totalTextHeight / 2) + lineIdx * lineHeight + lineHeight / 2;

              // Text outline
              if (config.strokeWidth > 0) {
                ctx.strokeStyle = config.strokeColor;
                ctx.lineWidth = config.strokeWidth * scale;
                ctx.lineJoin = 'round';
                ctx.strokeText(line, width / 2, lineY);
              }

              // Text fill
              ctx.fillStyle = config.color;
              ctx.fillText(line, width / 2, lineY);
            });

            ctx.restore();
          }
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [project, activeCue]);

  // Dimension calculation based on Aspect Ratio
  const canvasDimensions = useMemo(() => {
    switch (project.aspectRatio) {
      case '9:16':
        return { width: 720, height: 1280, aspectClass: 'aspect-[9/16] max-h-[540px]' };
      case '1:1':
        return { width: 1080, height: 1080, aspectClass: 'aspect-square max-h-[500px]' };
      case '4:3':
        return { width: 1024, height: 768, aspectClass: 'aspect-[4/3] max-h-[500px]' };
      case '16:9':
      default:
        return { width: 1280, height: 720, aspectClass: 'aspect-video max-h-[480px]' };
    }
  }, [project.aspectRatio]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${('0' + mins).slice(-2)}:${('0' + s).slice(-2)}`;
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex flex-col rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-2xl overflow-hidden">
      {/* Top Bar inside Player: Aspect Ratio & File upload */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-950/60 border-b border-zinc-800 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-400 font-khmer mr-1">ទំហំវីដេអូ:</span>
          <button
            onClick={() => onAspectChange('16:9')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              project.aspectRatio === '16:9'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="16:9 YouTube / Film"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>16:9</span>
          </button>

          <button
            onClick={() => onAspectChange('9:16')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              project.aspectRatio === '9:16'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="9:16 TikTok / Reels / Shorts"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>9:16</span>
          </button>

          <button
            onClick={() => onAspectChange('1:1')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
              project.aspectRatio === '1:1'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
            title="1:1 Instagram / Facebook"
          >
            <Square className="w-3.5 h-3.5" />
            <span>1:1</span>
          </button>
        </div>

        {/* Upload Custom Video Button */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onUploadCustomVideo(e.target.files[0]);
              }
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition font-khmer text-xs"
          >
            <Upload className="w-3 h-3 text-rose-400" />
            <span>ប្តូរវីដេអូ</span>
          </button>
        </div>
      </div>

      {/* Screen Container */}
      <div
        ref={containerRef}
        className="relative flex items-center justify-center bg-black/95 p-3 min-h-[320px] select-none"
      >
        {/* Hidden underlying Video tag */}
        {project.videoUrl ? (
          <video
            ref={videoRef}
            src={project.videoUrl}
            playsInline
            loop={isLooping}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            className="hidden"
            crossOrigin="anonymous"
          />
        ) : null}

        {/* Live Canvas View with hard-rendered subtitles & filters */}
        <div className={`relative flex items-center justify-center ${canvasDimensions.aspectClass} w-full`}>
          <canvas
            ref={canvasRef}
            width={canvasDimensions.width}
            height={canvasDimensions.height}
            className="w-full h-full object-contain rounded-lg shadow-2xl bg-zinc-950"
            onClick={() => setIsPlaying(!isPlaying)}
          />

          {/* Center Play Button Overlay when paused */}
          {!isPlaying && (
            <button
              onClick={() => setIsPlaying(true)}
              className="absolute w-16 h-16 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center shadow-xl backdrop-blur-sm transition-all transform hover:scale-110 active:scale-95"
            >
              <Play className="w-7 h-7 ml-1 fill-white" />
            </button>
          )}
        </div>
      </div>

      {/* Player Controls Bar */}
      <div className="px-4 py-3 bg-zinc-950 border-t border-zinc-800/80 flex flex-col gap-2.5">
        {/* Scrubber Slider */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 w-12 text-right">
            {formatTime(currentTime)}
          </span>
          <div className="relative flex-1 group">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.05}
              value={currentTime}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 group-hover:h-2 rounded-lg appearance-none cursor-pointer accent-rose-500 transition-all"
            />
          </div>
          <span className="text-[11px] font-mono text-zinc-500 w-12">
            {formatTime(duration)}
          </span>
        </div>

        {/* Playback Buttons & Utilities */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStep(-5)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="ថយក្រោយ 5 វិនាទី"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40 transition active:scale-90"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              onClick={() => handleStep(5)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="ទៅមុខ 5 វិនាទី"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleSeek(0)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition ml-1"
              title="ត្រឡប់ទៅដើម (Reset to 0:00)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Live Subtitle info badge */}
          <div className="hidden md:flex items-center gap-2 text-xs text-zinc-400 max-w-sm truncate">
            {activeCue ? (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 font-khmer border border-zinc-700 truncate">
                {activeCue.speakerLabel ? `[${activeCue.speakerLabel}] ` : ''}
                {activeCue.text}
              </span>
            ) : (
              <span className="text-zinc-600 italic font-khmer">គ្មានអក្សររត់នៅពេលនេះ</span>
            )}
          </div>

          {/* Right Tools: Speed, Loop, Volume, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Playback speed */}
            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-zinc-900 text-zinc-300 text-xs px-2 py-1 rounded-md border border-zinc-800 focus:outline-none"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1.0x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2.0x</option>
            </select>

            {/* Volume toggle */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title={isMuted ? 'បើកសំឡេង' : 'បិទសំឡេង'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="ពេញអេក្រង់ (Fullscreen)"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
