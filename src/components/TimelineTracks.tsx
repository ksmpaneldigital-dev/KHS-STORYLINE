import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SubtitleCue, VideoProject } from '../types';
import { 
  Film, 
  Subtitles, 
  Mic2, 
  Music, 
  Scissors, 
  Activity, 
  Waves, 
  Sparkles,
  Zap,
  Volume2,
  Volume1,
  VolumeX
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { extractAudioPeaks } from '../utils/waveformUtils';

interface TimelineTracksProps {
  project: VideoProject;
  cues: SubtitleCue[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSelectCue?: (cue: SubtitleCue) => void;
  selectedCueId?: string;
  onUpdateVideoVolume?: (volume: number) => void;
}

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  project,
  cues,
  currentTime,
  duration,
  onSeek,
  onSelectCue,
  selectedCueId,
  onUpdateVideoVolume,
}) => {
  const { lang, t } = useLanguage();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalDuration = Math.max(duration, 30);

  // Audio Waveform Visualizer States
  const [waveformPeaks, setWaveformPeaks] = useState<number[]>([]);
  const [isLoadingWaveform, setIsLoadingWaveform] = useState<boolean>(true);
  const [waveformGain, setWaveformGain] = useState<number>(1.2); // 1x, 1.5x, 2x gain boost
  const [isDetailedHeight, setIsDetailedHeight] = useState<boolean>(false);
  const [showSpikeMarkers, setShowSpikeMarkers] = useState<boolean>(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverXPercent, setHoverXPercent] = useState<number | null>(null);

  // Video Track Volume Gain State & Handlers (Independent from TTS/BGM)
  const [lastNonZeroVolume, setLastNonZeroVolume] = useState<number>(
    project.videoVolume > 0 ? project.videoVolume : 0.8
  );

  const handleVolumeChange = (newVolume: number) => {
    const clamped = Math.max(0, Math.min(1, newVolume));
    if (clamped > 0) {
      setLastNonZeroVolume(clamped);
    }
    onUpdateVideoVolume?.(clamped);
  };

  const handleToggleMute = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (project.videoVolume > 0) {
      setLastNonZeroVolume(project.videoVolume);
      onUpdateVideoVolume?.(0);
    } else {
      const restored = lastNonZeroVolume > 0 ? lastNonZeroVolume : 0.8;
      onUpdateVideoVolume?.(restored);
    }
  };

  // Extract or generate audio peaks aligned with speech & media
  useEffect(() => {
    let isCancelled = false;
    setIsLoadingWaveform(true);

    extractAudioPeaks(project.videoUrl, totalDuration, cues, 320)
      .then((peaks) => {
        if (!isCancelled) {
          setWaveformPeaks(peaks);
          setIsLoadingWaveform(false);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setIsLoadingWaveform(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [project.videoUrl, totalDuration, cues]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(progress * totalDuration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverXPercent(progress * 100);
    setHoverTime(progress * totalDuration);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverXPercent(null);
  };

  const getCueColor = (speaker: string, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-amber-400 text-zinc-950 border-white ring-2 ring-amber-400 font-bold';
    }
    const lower = (speaker || '').toLowerCase();
    if (lower.includes('ស្រី') || lower === 'female') {
      return 'bg-pink-600/80 hover:bg-pink-500 text-white border-pink-400/40';
    }
    if (lower.includes('ប្រុស') || lower === 'male') {
      return 'bg-blue-600/80 hover:bg-blue-500 text-white border-blue-400/40';
    }
    if (lower.includes('រៀបរាប់') || lower === 'narrator') {
      return 'bg-purple-600/80 hover:bg-purple-500 text-white border-purple-400/40';
    }
    return 'bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-400/40';
  };

  // Format seconds to mm:ss.ms
  const formatTimecode = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 1000);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  // Generate 5-second tick markers for ruler
  const tickInterval = 5;
  const numTicks = Math.ceil(totalDuration / tickInterval);
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => i * tickInterval);

  // Waveform height styling
  const waveformTrackHeight = isDetailedHeight ? 'h-16' : 'h-11';
  const waveformTrackHeightPx = isDetailedHeight ? 64 : 44;

  // Count speech spikes detected
  const speechSpikesCount = useMemo(() => {
    return waveformPeaks.filter((p) => p * waveformGain >= 0.75).length;
  }, [waveformPeaks, waveformGain]);

  return (
    <div className="bg-zinc-950/90 rounded-2xl border border-zinc-800/80 p-3 flex flex-col gap-2 select-none shadow-xl relative">
      {/* Track Legend, Waveform Controls & Duration Info */}
      <div className="flex flex-wrap items-center justify-between text-xs text-zinc-400 px-1 border-b border-zinc-900 pb-2.5 gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 font-khmer text-zinc-300 font-medium">
            <Scissors className="w-3.5 h-3.5 text-rose-500" />
            <span>{lang === 'km' ? 'Timeline បន្ទាត់កាត់ត' : 'Multi-Track Timeline'}</span>
          </div>

          {/* Speaker color tags */}
          <div className="hidden sm:flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" />
              <span className="font-khmer">{t('narratorSpeaker')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" />
              <span className="font-khmer">{t('maleSpeaker')}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-pink-500" />
              <span className="font-khmer">{t('femaleSpeaker')}</span>
            </span>
          </div>

          {/* Waveform Spike Legend Badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-[10px] text-cyan-300">
            <Activity className="w-3 h-3 text-cyan-400" />
            <span>{lang === 'km' ? 'Waveform សំឡេង' : 'Audio Waveform'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" title="Speech Spike" />
            <span className="text-amber-300 font-mono text-[9px]">Spike {speechSpikesCount}</span>
          </div>
        </div>

        {/* Waveform Visualizer Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Waveform Gain Boost Buttons */}
          <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded-lg border border-zinc-800 text-[10px]">
            <span className="text-zinc-500 font-mono">Gain:</span>
            {[
              { val: 1.0, label: '1x' },
              { val: 1.4, label: '1.4x' },
              { val: 2.0, label: '2x' },
            ].map((g) => (
              <button
                key={g.label}
                onClick={() => setWaveformGain(g.val)}
                className={`px-1.5 py-0.5 rounded transition font-mono ${
                  waveformGain === g.val
                    ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title={`Boost waveform amplitude ${g.label}`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {/* Height Expand Toggle */}
          <button
            onClick={() => setIsDetailedHeight(!isDetailedHeight)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition flex items-center gap-1 ${
              isDetailedHeight
                ? 'bg-rose-950/50 border-rose-800/60 text-rose-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Detailed Waveform Height (ពង្រីកកម្ពស់ Waveform)"
          >
            <Waves className="w-3 h-3 text-cyan-400" />
            <span>{isDetailedHeight ? 'Height: 64px' : 'Height: 44px'}</span>
          </button>

          {/* Spike Markers Toggle */}
          <button
            onClick={() => setShowSpikeMarkers(!showSpikeMarkers)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition flex items-center gap-1 ${
              showSpikeMarkers
                ? 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle speech spike visual highlight markers"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Spikes</span>
          </button>

          {/* Total Duration Display */}
          <div className="text-[11px] font-mono text-zinc-500 pl-1 border-l border-zinc-800">
            Duration: <span className="text-zinc-300 font-semibold">{totalDuration.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      {/* Main Track View with scrub area */}
      <div className="flex">
        {/* Track Label Column */}
        <div className="w-28 flex flex-col gap-2 pr-3 pt-6 border-r border-zinc-800 text-xs text-zinc-400 shrink-0">
          {/* Track 1: Video */}
          <div className="h-9 flex items-center justify-between gap-1 font-khmer text-[11px] text-zinc-300 pr-1">
            <div className="flex items-center gap-1.5 truncate">
              <Film className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{t('trackVideo')}</span>
            </div>
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition shrink-0"
              title={project.videoVolume === 0 ? t('unmuteVideoAudio') : t('muteVideoAudio')}
            >
              {project.videoVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : project.videoVolume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5 text-indigo-300" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </button>
          </div>

          {/* Track 2: Audio Waveform (Speech Spikes) */}
          <div className={`${waveformTrackHeight} flex flex-col justify-center gap-0.5 font-khmer text-[11px] text-cyan-300 transition-all duration-200`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{lang === 'km' ? 'Waveform' : 'Waveform'}</span>
            </div>
            <span className="text-[9px] text-cyan-400/60 font-mono tracking-tighter">
              {lang === 'km' ? 'Speech Spikes' : 'Voice Spikes'}
            </span>
          </div>

          {/* Track 3: Subtitles */}
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Subtitles className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">{t('trackSrt')}</span>
          </div>

          {/* Track 4: Voiceover */}
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate">{t('trackTts')}</span>
          </div>

          {/* Track 5: BGM */}
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Music className="w-3.5 h-3.5 text-rose-400" />
            <span className="truncate">{t('trackBgm')}</span>
          </div>
        </div>

        {/* Tracks Area */}
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative flex-1 flex flex-col gap-2 pl-2 overflow-x-hidden cursor-pointer"
        >
          {/* Time Ruler */}
          <div className="h-6 relative border-b border-zinc-800 text-[10px] font-mono text-zinc-500">
            {ticks.map((t) => {
              const leftPercent = (t / totalDuration) * 100;
              return (
                <div
                  key={t}
                  className="absolute top-0 flex flex-col items-center"
                  style={{ left: `${leftPercent}%` }}
                >
                  <span className="-translate-x-1/2">{t}s</span>
                  <div className="w-px h-1.5 bg-zinc-700" />
                </div>
              );
            })}
          </div>

          {/* Track 1: Video Track */}
          <div className="h-9 rounded-lg bg-indigo-950/30 border border-indigo-900/40 relative overflow-hidden flex items-center justify-between px-2 select-none group/videotrack">
            <div className="text-[10px] text-indigo-300/80 font-khmer truncate flex items-center gap-2 z-10 min-w-0 pr-2">
              <span className="truncate font-medium">{project.title}</span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="font-mono text-[9px] text-indigo-300/70 hidden sm:inline px-1 py-0.5 rounded bg-indigo-900/40 border border-indigo-700/40">
                {project.aspectRatio}
              </span>
            </div>

            {/* Filmstrip mock dashes */}
            <div className="absolute inset-0 opacity-10 flex justify-between pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-4 border-r border-indigo-200 h-full" />
              ))}
            </div>

            {/* Video Audio Volume Gain Slider Controls */}
            <div
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="z-10 flex items-center gap-1.5 sm:gap-2 bg-zinc-950/85 backdrop-blur-sm border border-indigo-800/60 hover:border-indigo-500/60 px-2 py-0.5 rounded-md shadow-sm transition shrink-0"
            >
              {/* Quick Mute/Unmute */}
              <button
                type="button"
                onClick={handleToggleMute}
                className="p-0.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition flex items-center justify-center"
                title={project.videoVolume === 0 ? t('unmuteVideoAudio') : t('muteVideoAudio')}
              >
                {project.videoVolume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                ) : project.videoVolume < 0.5 ? (
                  <Volume1 className="w-3.5 h-3.5 text-indigo-300" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </button>

              <span className="text-[10px] font-mono text-zinc-400 hidden md:inline">
                {lang === 'km' ? 'សំឡេង' : 'Gain'}:
              </span>

              {/* Volume Gain Slider */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={project.videoVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Video Volume Gain"
                className="w-16 sm:w-24 md:w-28 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none"
                title={`${t('videoVolumeGain')}: ${Math.round(project.videoVolume * 100)}%`}
              />

              {/* Percentage Readout */}
              <span className={`text-[10px] font-mono font-bold w-8 text-right ${
                project.videoVolume === 0 ? 'text-rose-400' : 'text-indigo-300'
              }`}>
                {Math.round(project.videoVolume * 100)}%
              </span>

              {/* Quick Presets */}
              <div className="hidden sm:flex items-center gap-1 border-l border-zinc-800 pl-1.5">
                {[
                  { label: '0%', val: 0 },
                  { label: '50%', val: 0.5 },
                  { label: '100%', val: 1.0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleVolumeChange(preset.val)}
                    className={`text-[9px] font-mono px-1 py-0.5 rounded transition ${
                      Math.abs(project.videoVolume - preset.val) < 0.03
                        ? 'bg-indigo-600/40 text-indigo-200 font-bold border border-indigo-500/50'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* Track 2: AUDIO WAVEFORM VISUALIZER WITH SPEECH SPIKES & CUE GHOSTS       */}
          {/* ========================================================================= */}
          <div 
            className={`${waveformTrackHeight} rounded-lg bg-zinc-950 border border-cyan-950/80 hover:border-cyan-700/60 transition-all duration-200 relative overflow-hidden flex items-center shadow-inner group`}
            title="Audio Waveform: Speech Spikes indicate dialogue attacks (Click to align cursor)"
          >
            {/* Subtle zero-crossing reference line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-cyan-950/60 border-t border-dashed border-cyan-800/25 pointer-events-none" />

            {/* Subtle dB threshold guide lines */}
            <div className="absolute left-0 right-0 top-[20%] h-px bg-cyan-900/10 pointer-events-none" />
            <div className="absolute left-0 right-0 bottom-[20%] h-px bg-cyan-900/10 pointer-events-none" />

            {/* Subtitle Cue Ghost Alignment Overlays on Waveform */}
            {cues.map((cue) => {
              const cueLeft = (cue.startSeconds / totalDuration) * 100;
              const cueWidth = Math.max(0.5, ((cue.endSeconds - cue.startSeconds) / totalDuration) * 100);
              const isSelected = selectedCueId === cue.id;

              return (
                <div
                  key={'ghost_' + cue.id}
                  className={`absolute top-0 bottom-0 pointer-events-none transition-all ${
                    isSelected 
                      ? 'bg-amber-400/15 border-x-2 border-amber-400/80 z-10' 
                      : 'bg-cyan-500/5 border-x border-dashed border-cyan-400/20'
                  }`}
                  style={{ left: `${cueLeft}%`, width: `${cueWidth}%` }}
                >
                  {/* Subtle cue start marker tag */}
                  <div className="absolute top-0.5 left-0.5 text-[8px] font-mono text-cyan-400/40 select-none truncate">
                    {cue.startTime.slice(3, 8)}
                  </div>
                </div>
              );
            })}

            {/* High-Resolution Audio Waveform SVG Bars with Speech Spikes */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none" 
              preserveAspectRatio="none" 
              viewBox={`0 0 ${waveformPeaks.length || 300} ${waveformTrackHeightPx}`}
            >
              <defs>
                {/* Normal Voice Energy Gradient */}
                <linearGradient id="waveNormalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
                  <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.85" />
                </linearGradient>

                {/* Speech Spike Gradient for Plosives / Strong Consonants */}
                <linearGradient id="waveSpikeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
                  <stop offset="25%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="75%" stopColor="#f59e0b" stopOpacity="1" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.95" />
                </linearGradient>

                {/* Low Ambience / Silence Gradient */}
                <linearGradient id="waveQuietGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#334155" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#334155" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {waveformPeaks.map((rawPeak, i) => {
                const boosted = Math.min(1.0, rawPeak * waveformGain);
                const isSpeechSpike = boosted >= 0.72;
                const isSilence = boosted < 0.18;

                // Center-mirrored bar calculation
                const centerY = waveformTrackHeightPx / 2;
                const maxHalfHeight = (waveformTrackHeightPx / 2) - 3;
                const halfHeight = Math.max(1.5, boosted * maxHalfHeight);
                const yTop = centerY - halfHeight;
                const barHeight = halfHeight * 2;

                const fillColor = isSpeechSpike
                  ? 'url(#waveSpikeGrad)'
                  : isSilence
                  ? 'url(#waveQuietGrad)'
                  : 'url(#waveNormalGrad)';

                return (
                  <g key={i}>
                    {/* Mirrored Waveform Bar */}
                    <rect
                      x={i}
                      y={yTop}
                      width={0.85}
                      height={barHeight}
                      rx={0.4}
                      fill={fillColor}
                    />

                    {/* Speech Spike Indicator Dots on high amplitude plosives */}
                    {showSpikeMarkers && isSpeechSpike && (
                      <>
                        <circle cx={i + 0.4} cy={Math.max(1.5, yTop - 1.5)} r={0.7} fill="#fbbf24" />
                        <circle cx={i + 0.4} cy={Math.min(waveformTrackHeightPx - 1.5, yTop + barHeight + 1.5)} r={0.7} fill="#fbbf24" />
                      </>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Loading Indicator if waveform is computing */}
            {isLoadingWaveform && (
              <div className="absolute inset-0 bg-zinc-950/70 backdrop-blur-[1px] flex items-center justify-center gap-2 text-cyan-400 text-xs font-khmer">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>កំពុងគណនា Speech Waveform...</span>
              </div>
            )}

            {/* Informational overlay label */}
            <div className="absolute right-2 bottom-1 text-[9px] font-mono text-cyan-400/40 pointer-events-none select-none">
              SPEECH WAVEFORM • {waveformPeaks.length} BINS • {waveformGain}x GAIN
            </div>
          </div>

          {/* Track 3: Subtitle Cues Track */}
          <div className="h-9 rounded-lg bg-zinc-900/60 border border-zinc-800/80 relative overflow-hidden">
            {cues.map((cue) => {
              const leftPercent = (cue.startSeconds / totalDuration) * 100;
              const widthPercent = Math.max(1.5, ((cue.endSeconds - cue.startSeconds) / totalDuration) * 100);
              const isSelected = selectedCueId === cue.id;
              const colorClass = getCueColor(cue.speakerLabel || cue.speaker, isSelected);

              return (
                <div
                  key={cue.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSeek(cue.startSeconds);
                    if (onSelectCue) onSelectCue(cue);
                  }}
                  className={`absolute top-1 bottom-1 rounded px-1.5 text-[10px] flex items-center justify-between overflow-hidden cursor-pointer border transition-transform hover:scale-[1.02] shadow-sm ${colorClass}`}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  title={`[${cue.speakerLabel}] ${cue.text} (${cue.startTime})`}
                >
                  <span className="truncate font-khmer text-[10px] leading-tight">
                    {cue.speakerLabel ? `[${cue.speakerLabel}] ` : ''}
                    {cue.text}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track 4: Voiceover Audio Track */}
          <div className="h-9 rounded-lg bg-emerald-950/30 border border-emerald-900/40 relative overflow-hidden flex items-center px-2">
            {cues.map((cue) => {
              const leftPercent = (cue.startSeconds / totalDuration) * 100;
              const widthPercent = Math.max(1.5, ((cue.endSeconds - cue.startSeconds) / totalDuration) * 100);

              return (
                <div
                  key={'vo_' + cue.id}
                  className="absolute top-1.5 bottom-1.5 rounded bg-emerald-600/70 border border-emerald-400/40 flex items-center px-1 overflow-hidden"
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                >
                  {/* Audio wave pulses */}
                  <div className="flex items-center gap-0.5 w-full justify-around opacity-75">
                    <div className="w-0.5 h-3 bg-white/70" />
                    <div className="w-0.5 h-4 bg-white" />
                    <div className="w-0.5 h-2 bg-white/60" />
                    <div className="w-0.5 h-4 bg-white" />
                  </div>
                </div>
              );
            })}
            <span className="text-[10px] text-emerald-400/70 font-khmer ml-1">
              សំឡេងអធិប្បាយរៀបរាប់ (TTS Synchronized)
            </span>
          </div>

          {/* Track 5: BGM Music Track */}
          <div className="h-9 rounded-lg bg-rose-950/20 border border-rose-900/30 relative overflow-hidden flex items-center px-2">
            <span className="text-[10px] text-rose-300/70 font-khmer">
              🎵 តន្ត្រីកំដរភាពយន្ត (Cinematic Recap Atmosphere) • Volume: {Math.round(project.bgmVolume * 100)}%
            </span>
            {/* Waveform graphic */}
            <div className="absolute right-4 flex items-center gap-1 opacity-25">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-rose-400 rounded-full"
                  style={{ height: `${8 + Math.sin(i * 0.8) * 12}px` }}
                />
              ))}
            </div>
          </div>

          {/* Dynamic Hover Alignment Cursor Guide Line & Tooltip */}
          {hoverXPercent !== null && hoverTime !== null && (
            <div
              className="absolute top-0 bottom-0 w-px bg-cyan-400/80 pointer-events-none z-30 flex flex-col items-center"
              style={{ left: `${hoverXPercent}%` }}
            >
              <div className="bg-zinc-900 text-cyan-300 border border-cyan-500/50 text-[9px] font-mono px-1.5 py-0.5 rounded shadow-lg -translate-y-4 whitespace-nowrap">
                {formatTimecode(hoverTime)}
              </div>
            </div>
          )}

          {/* Red Playhead Line with scrub handle */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-40 shadow-md shadow-rose-500/50"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          >
            <div className="w-3 h-3 bg-rose-500 rounded-sm -translate-x-1.5 rotate-45 -top-1 absolute" />
          </div>
        </div>
      </div>
    </div>
  );
};
