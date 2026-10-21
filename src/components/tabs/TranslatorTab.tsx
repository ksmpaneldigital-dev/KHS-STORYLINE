import React, { useState, useEffect, useRef } from 'react';
import { 
  Languages, 
  Sparkles, 
  ArrowRight, 
  Download, 
  Copy, 
  Check, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  FileText, 
  Layers, 
  ArrowLeftRight, 
  Bot, 
  Zap, 
  CheckCheck,
  Undo2,
  Info
} from 'lucide-react';
import { SubtitleCue } from '../../types';
import { formatToSrt, formatToVtt, parseSrt } from '../../utils/srtParser';

interface TranslatorTabProps {
  cues: SubtitleCue[];
  setCues: (newCuesOrFn: SubtitleCue[] | ((prev: SubtitleCue[]) => SubtitleCue[]), actionName?: string) => void;
  setActiveTab: (tab: any) => void;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
}

interface TranslatedCueItem {
  id: string;
  index: number;
  startTime: string;
  endTime: string;
  originalSpeaker: string;
  originalText: string;
  translatedSpeaker: string;
  translatedText: string;
}

export const TranslatorTab: React.FC<TranslatorTabProps> = ({
  cues,
  setCues,
  setActiveTab,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
  undoCount = 0,
  redoCount = 0,
}) => {
  const [viewMode, setViewMode] = useState<'bulk_cards' | 'raw_srt'>('bulk_cards');
  const [aiProvider, setAiProvider] = useState<'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-3.8-flash');
  const [sourceLang, setSourceLang] = useState<string>('Auto Detect');
  const [targetLang, setTargetLang] = useState<string>('Khmer (ភាសាខ្មែរ)');
  const [tone, setTone] = useState<string>('Natural Cinematic Movie Recap (សម្រាយបែបធម្មជាតិទាក់ទាញ)');
  
  // 1-Click Auto-Update setting
  const [autoUpdateProjectCues, setAutoUpdateProjectCues] = useState<boolean>(true);

  // Bulk Cues State
  const [translatedCues, setTranslatedCues] = useState<TranslatedCueItem[]>([]);
  const [isBulkTranslating, setIsBulkTranslating] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressPhaseText, setProgressPhaseText] = useState<string>('');
  
  // Undo history backup
  const [previousCuesBackup, setPreviousCuesBackup] = useState<SubtitleCue[] | null>(null);

  // Raw SRT state
  const [sourceSrt, setSourceSrt] = useState<string>(() => formatToSrt(cues));
  const [translatedSrt, setTranslatedSrt] = useState<string>('');
  const [isTranslatingRaw, setIsTranslatingRaw] = useState<boolean>(false);

  const [copied, setCopied] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const progressIntervalRef = useRef<any>(null);

  const sourceLanguages = [
    'Auto Detect',
    'Khmer (ភាសាខ្មែរ)',
    'English',
    'Chinese (中文)',
    'Thai (ภาษาไทย)',
    'Vietnamese (Tiếng Việt)',
    'Korean (한국어)',
    'Japanese (日本語)',
    'French (Français)',
    'Spanish (Español)',
    'German (Deutsch)',
    'Russian (Русский)',
  ];

  const targetLanguages = [
    'Khmer (ភាសាខ្មែរ)',
    'English',
    'Chinese (Simplified / 简体中文)',
    'Chinese (Traditional / 繁體中文)',
    'Thai (ภาษาไทย)',
    'Vietnamese (Tiếng Việt)',
    'Korean (한국어)',
    'Japanese (日本語)',
    'French (Français)',
    'Spanish (Español)',
    'German (Deutsch)',
  ];

  // Initialize or update translated cues list whenever cues change
  useEffect(() => {
    setTranslatedCues((prev) => {
      return cues.map((cue, idx) => {
        const existing = prev.find((p) => p.id === cue.id);
        return {
          id: cue.id,
          index: idx + 1,
          startTime: cue.startTime,
          endTime: cue.endTime,
          originalSpeaker: cue.speakerLabel || cue.speaker,
          originalText: cue.text,
          translatedSpeaker: existing?.translatedSpeaker || cue.speakerLabel || cue.speaker,
          translatedText: existing?.translatedText || '',
        };
      });
    });
    setSourceSrt(formatToSrt(cues));
  }, [cues]);

  // Clean up progress timer on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  // Swap Source and Target Languages
  const handleSwapLanguages = () => {
    if (sourceLang === 'Auto Detect') {
      setSourceLang(targetLang);
      setTargetLang('English');
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
  };

  // 1. Bulk Translate all subtitle cues at once using AI provider & Update in 1-Click
  const handleBulkTranslateAllCues = async () => {
    if (cues.length === 0) {
      alert('មិនមានបន្ទាត់ Subtitle ដើម្បីបកប្រែទេ!');
      return;
    }

    setIsBulkTranslating(true);
    setProgressPercent(15);
    setProgressPhaseText(`កំពុងរៀបចំទិន្នន័យ និងភ្ជាប់ទៅកាន់ AI Provider (${aiProvider})...`);
    setStatusMsg('');

    // Smooth progress simulation while waiting for API
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      setProgressPercent((prev) => {
        if (prev < 40) {
          setProgressPhaseText(`AI កំពុងវិភាគ និងបកប្រែ ${cues.length} បន្ទាត់ ទៅជា ${targetLang}...`);
          return prev + 5;
        } else if (prev < 80) {
          setProgressPhaseText(`AI កំពុងសម្រួលសំនួនវោហារស័ព្ទ (${tone.split(' ')[0]})...`);
          return prev + 3;
        }
        return prev;
      });
    }, 400);

    try {
      // Save current cues to backup for 1-click Undo
      setPreviousCuesBackup([...cues]);

      const payload = {
        cues: cues.map((c) => ({
          id: c.id,
          index: c.index,
          speaker: c.speaker,
          speakerLabel: c.speakerLabel,
          text: c.text,
        })),
        sourceLang,
        targetLang,
        tone,
        aiProvider,
      };

      const res = await fetch('/api/gemini/translate-cues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setProgressPercent(90);
      setProgressPhaseText('កំពុងធ្វើបច្ចុប្បន្នភាពលើ Project Cues & Timeline...');

      const json = await res.json();
      if (json.success && Array.isArray(json.results)) {
        // Map results back to translatedCues
        const resultMap = new Map<string, any>();
        json.results.forEach((r: any) => {
          if (r.id) resultMap.set(r.id, r);
        });

        const updated = cues.map((cue, idx) => {
          const match = resultMap.get(cue.id) || json.results[idx] || {};
          return {
            id: cue.id,
            index: idx + 1,
            startTime: cue.startTime,
            endTime: cue.endTime,
            originalSpeaker: cue.speakerLabel || cue.speaker,
            originalText: cue.text,
            translatedSpeaker: match.translatedSpeaker || cue.speakerLabel || cue.speaker,
            translatedText: match.translatedText || match.text || '',
          };
        });

        setTranslatedCues(updated);

        // Also build updated raw SRT string
        const generatedSrt = updated
          .map((item, i) => {
            const speaker = item.translatedSpeaker ? `[${item.translatedSpeaker}] ` : '';
            return `${i + 1}\n${item.startTime} --> ${item.endTime}\n${speaker}${item.translatedText}`;
          })
          .join('\n\n');
        setTranslatedSrt(generatedSrt);

        // IF AUTO-UPDATE IS ENABLED: 1-Click Update all cues directly in the project!
        if (autoUpdateProjectCues) {
          const newProjectCues: SubtitleCue[] = cues.map((cue) => {
            const trans = updated.find((t) => t.id === cue.id);
            if (trans && trans.translatedText.trim()) {
              return {
                ...cue,
                speakerLabel: trans.translatedSpeaker || cue.speakerLabel,
                text: trans.translatedText.trim(),
              };
            }
            return cue;
          });

          setCues(newProjectCues, `បកប្រែ Subtitles ជា ${targetLang}`);
        }

        setProgressPercent(100);
        setProgressPhaseText('ការបកប្រែបានបញ្ចប់ ១០០%!');
        setStatusMsg(
          autoUpdateProjectCues
            ? `✓ បានបកប្រែ និង Update Subtitles ទាំង ${cues.length} បន្ទាត់ ទៅជា ${targetLang} ដោយជោគជ័យ!`
            : `✓ បានបកប្រែ ${cues.length} បន្ទាត់រួចរាល់! សូមចុច "យកទៅដាក់លើ Timeline" ដើម្បី Update។`
        );
      } else {
        throw new Error(json.error || 'Bulk translation failed');
      }
    } catch (err: any) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      console.error(err);
      alert('Error during bulk translation: ' + err.message);
      setStatusMsg('ការបកប្រែបរាជ័យ សូមព្យាយាមម្តងទៀត។');
    } finally {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      setIsBulkTranslating(false);
    }
  };

  // 2. Revert / Undo to previous language
  const handleUndoTranslation = () => {
    if (undo && canUndo) {
      undo();
      setStatusMsg('✓ បានត្រឡប់ទៅអត្ថបទមុនពេលបកប្រែវិញ (Undone)');
    } else if (previousCuesBackup && previousCuesBackup.length > 0) {
      setCues([...previousCuesBackup], 'Undo បកប្រែ');
      setPreviousCuesBackup(null);
      setStatusMsg('✓ បានត្រឡប់ទៅអត្ថបទដើមវិញរួចរាល់ (Undone)');
    }
  };

  // 3. Translate raw SRT text string
  const handleTranslateRawSrt = async () => {
    if (!sourceSrt.trim()) return;
    setIsTranslatingRaw(true);
    setStatusMsg(`កំពុងបកប្រែ Raw SRT ជាមួយ ${aiProvider}...`);

    try {
      const res = await fetch('/api/gemini/translate-srt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          srtContent: sourceSrt,
          sourceLang,
          targetLang,
          tone,
        }),
      });

      const json = await res.json();
      if (json.success && json.translatedSrt) {
        setTranslatedSrt(json.translatedSrt);

        if (autoUpdateProjectCues) {
          const parsed = parseSrt(json.translatedSrt);
          if (parsed.length > 0) {
            setCues(parsed);
          }
        }

        setStatusMsg('បកប្រែ Subtitles SRT បានជោគជ័យ!');
      } else {
        throw new Error(json.error || 'Translation failed');
      }
    } catch (err: any) {
      alert('Error translating SRT: ' + err.message);
    } finally {
      setIsTranslatingRaw(false);
    }
  };

  // Apply all translated cues manually to the project timeline
  const handleApplyAllToProject = () => {
    if (viewMode === 'raw_srt') {
      if (!translatedSrt.trim()) return;
      const parsed = parseSrt(translatedSrt);
      if (parsed.length > 0) {
        setCues(parsed);
        setActiveTab('srt');
      } else {
        alert('Could not parse translated SRT format');
      }
    } else {
      // From translatedCues table
      const updatedProjectCues: SubtitleCue[] = cues.map((cue) => {
        const trans = translatedCues.find((t) => t.id === cue.id);
        if (trans && trans.translatedText.trim()) {
          return {
            ...cue,
            speakerLabel: trans.translatedSpeaker || cue.speakerLabel,
            text: trans.translatedText.trim(),
          };
        }
        return cue;
      });

      setCues(updatedProjectCues);
      setActiveTab('srt');
    }
  };

  // Download translated SRT
  const handleDownloadTranslatedSrt = () => {
    let content = translatedSrt;
    if (!content && translatedCues.length > 0) {
      content = translatedCues
        .map((item, i) => {
          const speaker = item.translatedSpeaker ? `[${item.translatedSpeaker}] ` : '';
          return `${i + 1}\n${item.startTime} --> ${item.endTime}\n${speaker}${item.translatedText}`;
        })
        .join('\n\n');
    }

    if (!content.trim()) {
      alert('មិនទាន់មានអត្ថបទបកប្រែដើម្បីទាញយកទេ!');
      return;
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_subtitles_${targetLang.slice(0, 5)}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download translated VTT
  const handleDownloadTranslatedVtt = () => {
    const vttBody = translatedCues
      .map((item, i) => {
        const vttStart = item.startTime.replace(',', '.');
        const vttEnd = item.endTime.replace(',', '.');
        const speaker = item.translatedSpeaker ? `[${item.translatedSpeaker}] ` : '';
        return `${i + 1}\n${vttStart} --> ${vttEnd}\n${speaker}${item.translatedText}`;
      })
      .join('\n\n');

    const content = `WEBVTT\n\n${vttBody}`;
    const blob = new Blob([content], { type: 'text/vtt;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_subtitles_${targetLang.slice(0, 5)}.vtt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopy = () => {
    let content = translatedSrt;
    if (!content && translatedCues.length > 0) {
      content = translatedCues
        .map((item, i) => {
          const speaker = item.translatedSpeaker ? `[${item.translatedSpeaker}] ` : '';
          return `${i + 1}\n${item.startTime} --> ${item.endTime}\n${speaker}${item.translatedText}`;
        })
        .join('\n\n');
    }
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Inline edit for translated cue
  const handleEditTranslatedText = (id: string, text: string) => {
    setTranslatedCues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, translatedText: text } : item))
    );
  };

  const handleEditTranslatedSpeaker = (id: string, speaker: string) => {
    setTranslatedCues((prev) =>
      prev.map((item) => (item.id === id ? { ...item, translatedSpeaker: speaker } : item))
    );
  };

  const hasAnyTranslation = translatedCues.some((c) => c.translatedText.trim().length > 0) || translatedSrt.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* ========================================================================= */}
      {/* 🌟 DEDICATED BULK TRANSLATION SECTION: Select Languages & 1-Click Update */}
      {/* ========================================================================= */}
      <section className="p-5 rounded-2xl bg-gradient-to-b from-zinc-900 via-zinc-900/95 to-zinc-950 border-2 border-rose-500/30 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <Languages className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-khmer">
                  ផ្នែកបកប្រែ Subtitles ទាំងអស់ក្នុងពេលតែមួយ (Bulk Translation)
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                  1-CLICK AI
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-khmer">
                ជ្រើសរើសភាសាដើម និងភាសាគោលដៅ ដើម្បីឱ្យ AI បកប្រែ និង Update គ្រប់បន្ទាត់ទាំងអស់ក្នុងគម្រោងភ្លាមៗ
              </p>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs shrink-0">
            <button
              onClick={() => setViewMode('bulk_cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-khmer transition ${
                viewMode === 'bulk_cards'
                  ? 'bg-rose-600 text-white font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>ផ្ទាំងបន្ទាត់ Cues ({cues.length})</span>
            </button>

            <button
              onClick={() => setViewMode('raw_srt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-khmer transition ${
                viewMode === 'raw_srt'
                  ? 'bg-rose-600 text-white font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>កូដ Raw SRT</span>
            </button>
          </div>
        </div>

        {/* Language Selection & AI Provider Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10 pt-1">
          {/* Source Language */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-khmer flex items-center justify-between">
              <span>ភាសាដើម (Source Language):</span>
              <span className="text-[10px] text-zinc-500 font-mono">From</span>
            </label>
            <div className="flex items-center gap-1.5">
              <select
                value={sourceLang}
                onChange={(e) => setSourceLang(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-medium"
              >
                {sourceLanguages.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>

              {/* Swap Languages Button */}
              <button
                onClick={handleSwapLanguages}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition shrink-0"
                title="ផ្លាស់ប្តូរភាសាដើម និងភាសាគោលដៅ (Swap Languages)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          </div>

          {/* Target Language */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-rose-500/40 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-rose-300 font-khmer flex items-center justify-between">
              <span>ភាសាគោលដៅ (Target Language):</span>
              <span className="text-[10px] text-rose-400 font-bold font-mono">To</span>
            </label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full bg-zinc-900 border border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 font-bold focus:outline-none focus:border-rose-500"
            >
              {targetLanguages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* AI Provider / Model */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-khmer flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-rose-400" />
              <span>AI Provider & Model:</span>
            </label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as any)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (ណែនាំ - ភាសាខ្មែរច្បាស់)</option>
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (High-Speed)</option>
            </select>
          </div>

          {/* Tone Presets */}
          <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-khmer">
              ស្ទាយ៍បកប្រែ (Translation Style):
            </label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-khmer"
            >
              <option value="Natural Cinematic Movie Recap (សម្រាយបែបធម្មជាតិទាក់ទាញ)">
                សម្រាយរឿងបែបធម្មជាតិ (Recap Style)
              </option>
              <option value="Accurate Subtitle Dubbing (បកប្រែចំៗ ក្បោះក្បាយ សម្រាប់បញ្ចូលសម្លេង)">
                បកប្រែបញ្ចូលសម្លេង (Dubbing Style)
              </option>
              <option value="Viral Hook & Suspense (អធិប្បាយរំភើប កាត់ឆ្មក់ Hook ទាក់ទាញ)">
                Hook & Suspense (រំភើប ភ័យរន្ធត់)
              </option>
              <option value="Casual & Modern Slang (ភាសាសាមញ្ញ សន្ទនាទាន់សម័យ)">
                ភាសាសាមញ្ញទាន់សម័យ (Casual)
              </option>
            </select>
          </div>
        </div>

        {/* 1-Click Action Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-zinc-800 relative z-10">
          {/* Options & Cue count info */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoUpdateProjectCues}
                onChange={(e) => setAutoUpdateProjectCues(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-500 cursor-pointer"
              />
              <span className="text-xs text-zinc-300 font-khmer font-medium">
                Update គម្រោង Cues និងវីដេអូភ្លាមៗក្នុង ១-Click (Auto-Update Timeline)
              </span>
            </label>

            <span className="text-xs text-zinc-500 font-mono hidden lg:inline">
              | {cues.length} Cues Ready
            </span>
          </div>

          {/* Trigger & Undo buttons */}
          <div className="flex items-center gap-2">
            {previousCuesBackup && (
              <button
                onClick={handleUndoTranslation}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white font-khmer text-xs flex items-center gap-1.5 border border-zinc-700 transition"
                title="ត្រឡប់ទៅភាសាដើមវិញ"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Undo ត្រឡប់ដើម</span>
              </button>
            )}

            <button
              onClick={viewMode === 'bulk_cards' ? handleBulkTranslateAllCues : handleTranslateRawSrt}
              disabled={isBulkTranslating || isTranslatingRaw || cues.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-khmer text-xs font-bold shadow-lg shadow-rose-950/60 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50 whitespace-nowrap"
            >
              {isBulkTranslating || isTranslatingRaw ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-white" />
              )}
              <span>
                {isBulkTranslating
                  ? `កំពុងបកប្រែ ${cues.length} បន្ទាត់ (${progressPercent}%)...`
                  : `⚡ បកប្រែ និង Update គ្រប់បន្ទាត់ក្នុង ១-Click (${cues.length} Cues)`}
              </span>
            </button>
          </div>
        </div>

        {/* Animated Progress Indicator during Operation */}
        {isBulkTranslating && (
          <div className="p-3 rounded-xl bg-zinc-950 border border-rose-500/40 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-khmer text-zinc-300 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                <span>{progressPhaseText || 'កំពុងដំណើរការបកប្រែ...'}</span>
              </span>
              <span className="font-mono font-bold text-rose-400">{progressPercent}%</span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-300 shadow-lg shadow-rose-500/50"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Success / Status Message Notification */}
        {statusMsg && !isBulkTranslating && (
          <div className="text-xs text-emerald-400 font-khmer flex items-center justify-between bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/40 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{statusMsg}</span>
            </div>

            {previousCuesBackup && (
              <button
                onClick={handleUndoTranslation}
                className="text-xs text-amber-300 underline font-khmer hover:text-white ml-2"
              >
                ចុចទីនេះដើម្បី Undo
              </button>
            )}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 📋 WORKSTATION VIEW 1: Individual Cues Side-by-Side Comparison & Inspector */}
      {/* ========================================================================= */}
      {viewMode === 'bulk_cards' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 font-khmer">
            <span className="font-semibold text-zinc-300">
              ការប្រៀបធៀបតាមបន្ទាត់នីមួយៗ (Side-by-Side Cue Inspector)
            </span>
            <span className="text-[11px] text-zinc-500">
              អ្នកអាចពិនិត្យ ឬកែសម្រួលអត្ថបទបកប្រែផ្ទាល់ក្នុងប្រអប់ខាងក្រោមបាន
            </span>
          </div>

          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {translatedCues.map((item) => {
              const isFemale = item.originalSpeaker.includes('ស្រី') || item.originalSpeaker.toLowerCase().includes('female');
              const isMale = item.originalSpeaker.includes('ប្រុស') || item.originalSpeaker.toLowerCase().includes('male');

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col gap-2.5"
                >
                  {/* Cue Header: Index, Timecode, Speaker */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-zinc-950 border border-zinc-800 flex items-center justify-center font-mono font-bold text-[11px] text-zinc-400">
                        {item.index}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-400">
                        {item.startTime} → {item.endTime}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-khmer ${
                          isFemale
                            ? 'bg-pink-950/60 border border-pink-500/40 text-pink-300'
                            : isMale
                            ? 'bg-blue-950/60 border border-blue-500/40 text-blue-300'
                            : 'bg-purple-950/60 border border-purple-500/40 text-purple-300'
                        }`}
                      >
                        [{item.originalSpeaker}]
                      </span>
                    </div>

                    {item.translatedText ? (
                      <span className="text-[10px] font-khmer text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1 font-semibold">
                        <CheckCheck className="w-3 h-3" />
                        <span>បានបកប្រែរួចរាល់</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-khmer text-zinc-500 italic">
                        រង់ចាំការបកប្រែ...
                      </span>
                    )}
                  </div>

                  {/* Comparison Row: Original (Left) vs Translated (Right) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Original Source */}
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between">
                      <span className="text-[10px] font-medium text-zinc-500 font-khmer mb-1">
                        អត្ថបទដើម ({sourceLang}):
                      </span>
                      <div className="text-zinc-300 font-khmer text-xs leading-relaxed">
                        {item.originalText}
                      </div>
                    </div>

                    {/* Translated Target */}
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-rose-500/20 focus-within:border-rose-500/60 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-rose-400 font-khmer font-bold">
                          លទ្ធផលបកប្រែ ({targetLang}):
                        </span>
                        <input
                          type="text"
                          value={item.translatedSpeaker}
                          onChange={(e) => handleEditTranslatedSpeaker(item.id, e.target.value)}
                          placeholder="ឈ្មោះ Speaker"
                          className="w-24 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-[10px] text-zinc-300 focus:outline-none font-khmer"
                          title="កែឈ្មោះតួអង្គបង្ហាញ"
                        />
                      </div>
                      <textarea
                        rows={2}
                        value={item.translatedText}
                        onChange={(e) => handleEditTranslatedText(item.id, e.target.value)}
                        placeholder={`អត្ថបទបកប្រែជា ${targetLang}...`}
                        className="w-full bg-transparent border-0 p-0 text-xs font-khmer text-zinc-100 focus:outline-none resize-none leading-relaxed placeholder-zinc-600"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📝 WORKSTATION VIEW 2: Raw SRT Code Editor */}
      {/* ========================================================================= */}
      {viewMode === 'raw_srt' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Source SRT */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-khmer text-zinc-400 mb-1">
              <span className="font-semibold text-zinc-300">អត្ថបទដើម (Original SRT)</span>
              <button
                onClick={() => setSourceSrt(formatToSrt(cues))}
                className="text-[11px] text-zinc-400 hover:text-white underline font-khmer"
              >
                ↻ ផ្ទុកពី Timeline
              </button>
            </div>
            <textarea
              rows={14}
              value={sourceSrt}
              onChange={(e) => setSourceSrt(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-zinc-300 focus:outline-none focus:border-rose-500 resize-none"
              placeholder="1&#10;00:00:01,000 --> 00:00:04,000&#10;[អ្នករៀបរាប់] អត្ថបទ..."
            />
          </div>

          {/* Translated SRT */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-khmer text-zinc-400 mb-1">
              <span className="font-semibold text-emerald-400">លទ្ធផលបកប្រែ (Translated SRT)</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  disabled={!translatedSrt}
                  className="p-1 rounded text-zinc-400 hover:text-white transition"
                  title="ចម្លង SRT"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleDownloadTranslatedSrt}
                  disabled={!translatedSrt}
                  className="p-1 rounded text-zinc-400 hover:text-white transition"
                  title="ទាញយកឯកសារ .SRT"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <textarea
              rows={14}
              value={translatedSrt}
              onChange={(e) => setTranslatedSrt(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-khmer text-zinc-100 focus:outline-none focus:border-emerald-500 resize-none font-mono"
              placeholder={`លទ្ធផលបកប្រែជា ${targetLang} នឹងបង្ហាញនៅទីនេះ...`}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📥 EXPORT & SYNC BAR AT BOTTOM */}
      {/* ========================================================================= */}
      {hasAnyTranslation && (
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
          <div className="text-xs font-khmer text-zinc-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              បានបកប្រែរួចរាល់! អ្នកអាចយកទៅដាក់លើវីដេអូ ឬទាញយកឯកសារ Subtitle ទុក។
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadTranslatedSrt}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-khmer text-zinc-300 hover:text-white border border-zinc-700 transition"
              title="ទាញយក .SRT"
            >
              ទាញយក .SRT
            </button>

            <button
              onClick={handleDownloadTranslatedVtt}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-khmer text-zinc-300 hover:text-white border border-zinc-700 transition"
              title="ទាញយក .VTT"
            >
              ទាញយក .VTT
            </button>

            <button
              onClick={handleApplyAllToProject}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-khmer text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-2 active:scale-95 transition"
            >
              <span>📥 យកអក្សរបកប្រែទាំងអស់ទៅដាក់លើ Timeline & Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
