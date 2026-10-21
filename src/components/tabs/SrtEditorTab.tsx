import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Clock, 
  Type, 
  Palette, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Search, 
  ArrowRightLeft,
  ChevronDown,
  Sparkles,
  Layers,
  Undo2,
  Redo2
} from 'lucide-react';
import { SubtitleCue, SubtitleStyleConfig, SpeakerRole } from '../../types';
import { secondsToSrtTime, srtTimeToSeconds, formatToSrt, formatToVtt, formatToScriptText, shiftCuesTime, parseSrt } from '../../utils/srtParser';

interface SrtEditorTabProps {
  cues: SubtitleCue[];
  setCues: (newCuesOrFn: SubtitleCue[] | ((prev: SubtitleCue[]) => SubtitleCue[]), actionName?: string) => void;
  currentTime: number;
  onSeek: (time: number) => void;
  subtitleConfig: SubtitleStyleConfig;
  setSubtitleConfig: React.Dispatch<React.SetStateAction<SubtitleStyleConfig>>;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
}

export const SrtEditorTab: React.FC<SrtEditorTabProps> = ({
  cues,
  setCues,
  currentTime,
  onSeek,
  subtitleConfig,
  setSubtitleConfig,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
  undoCount = 0,
  redoCount = 0,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpeakerFilter, setSelectedSpeakerFilter] = useState<string>('all');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'cues' | 'styling'>('cues');

  // Filtered cues
  const filteredCues = cues.filter((cue) => {
    const matchesSearch = cue.text.toLowerCase().includes(searchTerm.toLowerCase()) || cue.speakerLabel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpeaker = selectedSpeakerFilter === 'all' || cue.speaker === selectedSpeakerFilter;
    return matchesSearch && matchesSpeaker;
  });

  // Add new cue at current playhead time
  const handleAddCue = () => {
    const startSec = Math.round(currentTime * 10) / 10;
    const endSec = startSec + 4.0;
    const newCue: SubtitleCue = {
      id: 'cue_' + Math.random().toString(36).substr(2, 9),
      index: cues.length + 1,
      startTime: secondsToSrtTime(startSec),
      endTime: secondsToSrtTime(endSec),
      startSeconds: startSec,
      endSeconds: endSec,
      speaker: 'narrator',
      speakerLabel: 'អ្នករៀបរាប់',
      text: 'បញ្ចូលអត្ថបទអធិប្បាយរឿងនៅទីនេះ...',
    };

    const updated = [...cues, newCue].sort((a, b) => a.startSeconds - b.startSeconds);
    setCues(updated.map((c, i) => ({ ...c, index: i + 1 })));
  };

  // Update a single cue field
  const updateCue = (id: string, updates: Partial<SubtitleCue>) => {
    setCues((prev) =>
      prev.map((cue) => {
        if (cue.id !== id) return cue;
        const merged = { ...cue, ...updates };

        // Auto sync seconds if time string changed
        if (updates.startTime) {
          merged.startSeconds = srtTimeToSeconds(updates.startTime);
        }
        if (updates.endTime) {
          merged.endSeconds = srtTimeToSeconds(updates.endTime);
        }
        return merged;
      })
    );
  };

  // Adjust cue time by delta seconds
  const adjustCueTime = (id: string, deltaSec: number) => {
    setCues((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const newStart = Math.max(0, c.startSeconds + deltaSec);
        const newEnd = Math.max(newStart + 0.5, c.endSeconds + deltaSec);
        return {
          ...c,
          startSeconds: newStart,
          endSeconds: newEnd,
          startTime: secondsToSrtTime(newStart),
          endTime: secondsToSrtTime(newEnd),
        };
      })
    );
  };

  // Delete cue
  const deleteCue = (id: string) => {
    setCues((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, index: i + 1 })));
  };

  // Split cue in half
  const splitCue = (id: string) => {
    const cue = cues.find((c) => c.id === id);
    if (!cue) return;

    const midSec = cue.startSeconds + (cue.endSeconds - cue.startSeconds) / 2;
    const firstCue: SubtitleCue = {
      ...cue,
      endTime: secondsToSrtTime(midSec),
      endSeconds: midSec,
    };
    const secondCue: SubtitleCue = {
      id: 'cue_' + Math.random().toString(36).substr(2, 9),
      index: cue.index + 1,
      startTime: secondsToSrtTime(midSec),
      endTime: cue.endTime,
      startSeconds: midSec,
      endSeconds: cue.endSeconds,
      speaker: cue.speaker,
      speakerLabel: cue.speakerLabel,
      text: '...',
    };

    const cueIndex = cues.findIndex((c) => c.id === id);
    const updated = [...cues];
    updated.splice(cueIndex, 1, firstCue, secondCue);
    setCues(updated.map((c, i) => ({ ...c, index: i + 1 })));
  };

  // Shift all cues globally
  const handleGlobalShift = (deltaSec: number) => {
    setCues((prev) => shiftCuesTime(prev, deltaSec));
  };

  // Import SRT file
  const handleImportSrt = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const parsed = parseSrt(content);
        if (parsed.length > 0) {
          setCues(parsed);
        }
      }
    };
    reader.readAsText(file);
  };

  // Download SRT
  const handleDownloadSrt = () => {
    const srtText = formatToSrt(cues);
    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'movie_recap_subtitles.srt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy SRT to clipboard
  const handleCopySrt = () => {
    const srtText = formatToSrt(cues);
    navigator.clipboard.writeText(srtText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Tab toggle: Cues List vs Subtitle Appearance Styling */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('cues')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'cues'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-khmer">បញ្ជីអក្សររត់ SRT ({cues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('styling')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === 'styling'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span className="font-khmer">រចនាអក្សរ Subtitle Styling</span>
          </button>
        </div>

        {/* Global time sync buttons */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400">
          <span className="font-khmer mr-1">រំកិលម៉ោងទាំងអស់:</span>
          <button
            onClick={() => handleGlobalShift(-0.5)}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-mono"
            title="រំកិលថយក្រោយ 0.5 វិនាទី"
          >
            -0.5s
          </button>
          <button
            onClick={() => handleGlobalShift(0.5)}
            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-mono"
            title="រំកិលទៅមុខ 0.5 វិនាទី"
          >
            +0.5s
          </button>
        </div>
      </div>

      {activeTab === 'styling' ? (
        /* Subtitle Appearance Customization Panel */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
          {/* Left Column: Typography & Position */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1.5">
                ពុម្ពអក្សរខ្មែរ (Khmer Font Family)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Kantumruy Pro', 'Battambang', 'Moul', 'Siemreap', 'Inter'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => setSubtitleConfig((c) => ({ ...c, fontFamily: font }))}
                    className={`p-2 rounded-lg border text-xs text-left transition ${
                      subtitleConfig.fontFamily === font
                        ? 'border-amber-400 bg-amber-400/10 text-white font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                    style={{ fontFamily: font }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 font-khmer mb-1">
                <span>ទំហំអក្សរ (Font Size)</span>
                <span className="font-mono text-amber-400">{subtitleConfig.fontSize}px</span>
              </div>
              <input
                type="range"
                min="18"
                max="56"
                value={subtitleConfig.fontSize}
                onChange={(e) => setSubtitleConfig((c) => ({ ...c, fontSize: parseInt(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 font-khmer mb-1">
                <span>ទីតាំងពីបាតក្រោម (Y-Offset)</span>
                <span className="font-mono text-amber-400">{subtitleConfig.yOffset}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="160"
                value={subtitleConfig.yOffset}
                onChange={(e) => setSubtitleConfig((c) => ({ ...c, yOffset: parseInt(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-xs text-zinc-300 font-khmer">អក្សរដិត (Bold Font)</span>
              <input
                type="checkbox"
                checked={subtitleConfig.isBold}
                onChange={(e) => setSubtitleConfig((c) => ({ ...c, isBold: e.target.checked }))}
                className="w-4 h-4 accent-amber-500 rounded"
              />
            </div>
          </div>

          {/* Right Column: Colors, Stroke, Background Box */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1.5">
                ពណ៌អក្សរ (Text Color)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={subtitleConfig.color}
                  onChange={(e) => setSubtitleConfig((c) => ({ ...c, color: e.target.value }))}
                  className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-zinc-700"
                />
                <div className="flex items-center gap-2">
                  {['#FFE600', '#FFFFFF', '#06B6D4', '#10B981', '#F43F5E'].map((clr) => (
                    <button
                      key={clr}
                      onClick={() => setSubtitleConfig((c) => ({ ...c, color: clr }))}
                      className="w-6 h-6 rounded-full border border-white/20 transition hover:scale-110"
                      style={{ backgroundColor: clr }}
                      title={clr}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 font-khmer mb-1">
                <span>កម្រាស់បន្ទាត់គែមអក្សរ (Outline Stroke)</span>
                <span className="font-mono text-amber-400">{subtitleConfig.strokeWidth}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="0.5"
                value={subtitleConfig.strokeWidth}
                onChange={(e) => setSubtitleConfig((c) => ({ ...c, strokeWidth: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-zinc-300 font-khmer mb-1">
                <span>ផ្ទៃប្រអប់ខាងក្រោយ (Background Box Opacity)</span>
                <span className="font-mono text-amber-400">{Math.round(subtitleConfig.bgOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={subtitleConfig.bgOpacity}
                onChange={(e) => setSubtitleConfig((c) => ({ ...c, bgOpacity: parseFloat(e.target.value) }))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Live Subtitle Preview Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-center flex flex-col items-center justify-center min-h-[90px]">
              <span className="text-[10px] text-zinc-500 font-khmer mb-1">គំរូអក្សរផ្ទាល់ (Live Preview)</span>
              <div
                style={{
                  fontFamily: subtitleConfig.fontFamily,
                  fontSize: `${subtitleConfig.fontSize * 0.75}px`,
                  color: subtitleConfig.color,
                  fontWeight: subtitleConfig.isBold ? 'bold' : 'normal',
                  WebkitTextStroke: `${subtitleConfig.strokeWidth * 0.7}px ${subtitleConfig.strokeColor}`,
                  backgroundColor: `rgba(0, 0, 0, ${subtitleConfig.bgOpacity})`,
                  padding: `${subtitleConfig.boxPadding * 0.7}px 14px`,
                  borderRadius: `${subtitleConfig.boxRadius}px`,
                }}
              >
                [អ្នករៀបរាប់] ឈុតឆាករឿងគួរឱ្យចាប់អារម្មណ៍បំផុត!
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Cues List & Form */
        <div className="space-y-3">
          {/* Action Row: Add Cue, Search, Speaker Filter, Import/Export */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80 p-3 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <button
                onClick={handleAddCue}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-khmer text-xs font-semibold shadow-md active:scale-95 transition whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>បន្ថែមបន្ទាត់ Subtitle ថ្មី</span>
              </button>

              {/* Search */}
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ស្វែងរកអក្សររត់..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-khmer"
                />
              </div>
            </div>

            {/* Undo / Redo & Import / Export SRT files */}
            <div className="flex items-center gap-1.5">
              {/* Undo & Redo buttons */}
              <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-950 border border-zinc-800">
                <button
                  onClick={undo}
                  disabled={!canUndo}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent font-khmer transition"
                  title={`Undo ត្រឡប់ក្រោយ (Ctrl+Z)${undoCount > 0 ? ` (${undoCount})` : ''}`}
                >
                  <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Undo</span>
                </button>

                <button
                  onClick={redo}
                  disabled={!canRedo}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent font-khmer transition"
                  title={`Redo ទៅមុខ (Ctrl+Y)${redoCount > 0 ? ` (${redoCount})` : ''}`}
                >
                  <Redo2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Redo</span>
                </button>
              </div>

              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 cursor-pointer font-khmer transition">
                <Upload className="w-3.5 h-3.5 text-rose-400" />
                <span>Import SRT</span>
                <input type="file" accept=".srt,.vtt,.txt" onChange={handleImportSrt} className="hidden" />
              </label>

              <button
                onClick={handleDownloadSrt}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 font-khmer transition"
                title="ទាញយកជាឯកសារ .SRT"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>ទាញយក SRT</span>
              </button>

              <button
                onClick={handleCopySrt}
                className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                title="ចម្លង SRT ទាំងអស់"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Subtitle Cue Cards */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredCues.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 font-khmer text-xs">
                មិនមានអក្សររត់ត្រូវនឹងការស្វែងរកនេះទេ។
              </div>
            ) : (
              filteredCues.map((cue) => {
                const isNarrator = cue.speaker === 'narrator' || cue.speakerLabel.includes('រៀបរាប់');
                const isMale = cue.speaker === 'male' || cue.speakerLabel.includes('ប្រុស');
                const isFemale = cue.speaker === 'female' || cue.speakerLabel.includes('ស្រី');

                return (
                  <div
                    key={cue.id}
                    className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition flex flex-col md:flex-row items-start md:items-center gap-3 group"
                  >
                    {/* Index & Jump Button */}
                    <button
                      onClick={() => onSeek(cue.startSeconds)}
                      className="w-7 h-7 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono font-bold text-zinc-400 hover:text-white hover:border-rose-500 flex items-center justify-center shrink-0 transition"
                      title="ចុចដើម្បីលោតទៅពេលនេះ"
                    >
                      {cue.index}
                    </button>

                    {/* Speaker Selector & Label */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        value={cue.speaker}
                        onChange={(e) => {
                          const val = e.target.value as SpeakerRole;
                          const defaultLabel = val === 'male' ? 'ប្រុស' : val === 'female' ? 'ស្រី' : 'អ្នករៀបរាប់';
                          updateCue(cue.id, { speaker: val, speakerLabel: defaultLabel });
                        }}
                        className={`text-xs px-2 py-1 rounded-lg border focus:outline-none font-khmer ${
                          isFemale
                            ? 'bg-pink-950/60 border-pink-500/50 text-pink-300'
                            : isMale
                            ? 'bg-blue-950/60 border-blue-500/50 text-blue-300'
                            : 'bg-purple-950/60 border-purple-500/50 text-purple-300'
                        }`}
                      >
                        <option value="narrator">អ្នករៀបរាប់ (Narrator)</option>
                        <option value="male">តួប្រុស (Male)</option>
                        <option value="female">តួស្រី (Female)</option>
                        <option value="character">តួអង្គ (Character)</option>
                      </select>

                      <input
                        type="text"
                        value={cue.speakerLabel}
                        onChange={(e) => updateCue(cue.id, { speakerLabel: e.target.value })}
                        className="w-20 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-300 focus:outline-none font-khmer"
                        title="ឈ្មោះតួអង្គបង្ហាញលើវីដេអូ"
                      />
                    </div>

                    {/* Time Inputs */}
                    <div className="flex items-center gap-1 shrink-0 text-xs font-mono">
                      <input
                        type="text"
                        value={cue.startTime}
                        onChange={(e) => updateCue(cue.id, { startTime: e.target.value })}
                        className="w-24 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-300 text-center focus:outline-none focus:border-rose-500 text-[11px]"
                      />
                      <span className="text-zinc-600">→</span>
                      <input
                        type="text"
                        value={cue.endTime}
                        onChange={(e) => updateCue(cue.id, { endTime: e.target.value })}
                        className="w-24 bg-zinc-950 border border-zinc-800 rounded px-1.5 py-1 text-zinc-300 text-center focus:outline-none focus:border-rose-500 text-[11px]"
                      />

                      {/* Fast nudges (+/- 0.2s) */}
                      <button
                        onClick={() => adjustCueTime(cue.id, -0.2)}
                        className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-[10px] text-zinc-400"
                        title="ថយក្រោយ 0.2s"
                      >
                        -0.2
                      </button>
                      <button
                        onClick={() => adjustCueTime(cue.id, 0.2)}
                        className="px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-[10px] text-zinc-400"
                        title="ទៅមុខ 0.2s"
                      >
                        +0.2
                      </button>
                    </div>

                    {/* Subtitle Text Input */}
                    <div className="flex-1 w-full">
                      <textarea
                        rows={1}
                        value={cue.text}
                        onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                        className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-100 focus:outline-none focus:border-rose-500 font-khmer resize-none"
                      />
                    </div>

                    {/* Action Tools: Split & Delete */}
                    <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                      <button
                        onClick={() => splitCue(cue.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition"
                        title="ពុះបន្ទាត់ជាពីរ (Split cue)"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteCue(cue.id)}
                        className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="លុបបន្ទាត់នេះ"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
