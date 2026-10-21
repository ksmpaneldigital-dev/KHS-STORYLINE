import React, { useRef } from 'react';
import { SubtitleCue, VideoProject } from '../types';
import { Film, Subtitles, Mic2, Music, Scissors } from 'lucide-react';

interface TimelineTracksProps {
  project: VideoProject;
  cues: SubtitleCue[];
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onSelectCue?: (cue: SubtitleCue) => void;
  selectedCueId?: string;
}

export const TimelineTracks: React.FC<TimelineTracksProps> = ({
  project,
  cues,
  currentTime,
  duration,
  onSeek,
  onSelectCue,
  selectedCueId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalDuration = Math.max(duration, 30);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(progress * totalDuration);
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

  // Generate 5-second tick markers for ruler
  const tickInterval = 5;
  const numTicks = Math.ceil(totalDuration / tickInterval);
  const ticks = Array.from({ length: numTicks + 1 }, (_, i) => i * tickInterval);

  return (
    <div className="bg-zinc-950/90 rounded-2xl border border-zinc-800/80 p-3 flex flex-col gap-2 select-none shadow-xl">
      {/* Track Legend & Duration Info */}
      <div className="flex items-center justify-between text-xs text-zinc-400 px-1 border-b border-zinc-900 pb-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-khmer text-zinc-300 font-medium">
            <Scissors className="w-3.5 h-3.5 text-rose-500" />
            <span>Timeline បន្ទាត់កាត់ត</span>
          </div>

          {/* Speaker color tags */}
          <div className="hidden sm:flex items-center gap-2 text-[10px]">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" />
              <span className="font-khmer">អ្នករៀបរាប់</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-500" />
              <span className="font-khmer">ប្រុស</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-pink-500" />
              <span className="font-khmer">ស្រី</span>
            </span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-zinc-500">
          Duration: <span className="text-zinc-300 font-semibold">{totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Main Track View with scrub area */}
      <div className="flex">
        {/* Track Label Column */}
        <div className="w-28 flex flex-col gap-2 pr-3 pt-6 border-r border-zinc-800 text-xs text-zinc-400 shrink-0">
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Film className="w-3.5 h-3.5 text-indigo-400" />
            <span>វីដេអូ</span>
          </div>
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Subtitles className="w-3.5 h-3.5 text-amber-400" />
            <span>Subtitles</span>
          </div>
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Mic2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Voiceover</span>
          </div>
          <div className="h-9 flex items-center gap-1.5 font-khmer text-[11px] text-zinc-300">
            <Music className="w-3.5 h-3.5 text-rose-400" />
            <span>BGM</span>
          </div>
        </div>

        {/* Tracks Area */}
        <div
          ref={containerRef}
          onClick={handleTimelineClick}
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
          <div className="h-9 rounded-lg bg-indigo-950/30 border border-indigo-900/40 relative overflow-hidden flex items-center px-2">
            <div className="text-[10px] text-indigo-300/80 font-khmer truncate">
              {project.title} • {project.aspectRatio}
            </div>
            {/* Filmstrip mock dashes */}
            <div className="absolute inset-0 opacity-10 flex justify-between pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-4 border-r border-indigo-200 h-full" />
              ))}
            </div>
          </div>

          {/* Track 2: Subtitle Cues Track */}
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

          {/* Track 3: Voiceover Audio Track */}
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
                  {/* Mock audio wave pulses */}
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

          {/* Track 4: BGM Music Track */}
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

          {/* Red Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-rose-500 pointer-events-none z-20 shadow-md shadow-rose-500/50"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          >
            <div className="w-3 h-3 bg-rose-500 rounded-sm -translate-x-1.5 rotate-45 -top-1 absolute" />
          </div>
        </div>
      </div>
    </div>
  );
};
