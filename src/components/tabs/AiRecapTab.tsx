import React, { useState, useRef } from 'react';
import { 
  Sparkles, 
  FileText, 
  Mic, 
  MicOff, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  ArrowRight,
  Tv,
  Film,
  Zap,
  Cpu
} from 'lucide-react';
import { SubtitleCue } from '../../types';
import { parseSrt, secondsToSrtTime } from '../../utils/srtParser';

interface AiRecapTabProps {
  cues: SubtitleCue[];
  setCues: React.Dispatch<React.SetStateAction<SubtitleCue[]>>;
  projectTitle: string;
  setProjectTitle: (t: string) => void;
  setActiveTab: (tab: any) => void;
}

export const AiRecapTab: React.FC<AiRecapTabProps> = ({
  cues,
  setCues,
  projectTitle,
  setProjectTitle,
  setActiveTab,
}) => {
  const [subSection, setSubSection] = useState<'script_writer' | 'gemini_stt' | 'local_stt'>('script_writer');

  // Script writer state
  const [movieTitle, setMovieTitle] = useState('');
  const [genre, setGenre] = useState('Action / Thriller / Mystery');
  const [synopsis, setSynopsis] = useState('');
  const [tone, setTone] = useState('អធិប្បាយរំភើប ភ័យរន្ធត់ កាត់ឆ្មក់ Hook ទាក់ទាញ សម្រាប់ TikTok/YouTube');
  const [durationMinutes, setDurationMinutes] = useState(3);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  // Gemini STT state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [sttFile, setSttFile] = useState<File | null>(null);
  const [sttResult, setSttResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Local STT (Web Speech Recognition for Low-Spec PCs)
  const [isListening, setIsListening] = useState(false);
  const [localTranscript, setLocalTranscript] = useState('');
  const [recognitionLang, setRecognitionLang] = useState('km-KH');
  const recognitionRef = useRef<any>(null);

  // Handle Script Generation with Gemini 3.8 Flash
  const handleGenerateScript = async () => {
    setIsGeneratingScript(true);
    setGeneratedResult(null);

    try {
      const res = await fetch('/api/gemini/recap-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: movieTitle,
          genre,
          synopsis,
          tone,
          durationMinutes,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setGeneratedResult(json.data);
        if (json.data.title) {
          setProjectTitle(json.data.title);
        }
      } else {
        throw new Error(json.error || 'Failed to generate script');
      }
    } catch (err: any) {
      alert('Error generating script: ' + err.message);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 1-Click apply generated cues to SRT Editor & Video Timeline
  const handleApplyScriptToProject = () => {
    if (!generatedResult || !generatedResult.cues) return;

    const newCues: SubtitleCue[] = generatedResult.cues.map((c: any, idx: number) => {
      const startSec = idx * 4.5;
      const endSec = startSec + 4.2;
      return {
        id: 'cue_' + Math.random().toString(36).substr(2, 9),
        index: idx + 1,
        startTime: c.startTime || secondsToSrtTime(startSec),
        endTime: c.endTime || secondsToSrtTime(endSec),
        startSeconds: startSec,
        endSeconds: endSec,
        speaker: c.speaker === 'ប្រុស' ? 'male' : c.speaker === 'ស្រី' ? 'female' : 'narrator',
        speakerLabel: c.speaker || 'អ្នករៀបរាប់',
        text: c.text,
      };
    });

    setCues(newCues);
    setActiveTab('srt');
  };

  // Handle Gemini Speech to Text
  const handleTranscribeAudio = async () => {
    if (!sttFile) return;
    setIsTranscribing(true);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Audio = (e.target?.result as string).split(',')[1];
        const res = await fetch('/api/gemini/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio,
            mimeType: sttFile.type || 'audio/mp3',
            language: 'Khmer',
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          setSttResult(json.data);
          if (json.data.srt) {
            const parsed = parseSrt(json.data.srt);
            if (parsed.length > 0) {
              setCues(parsed);
            }
          }
        } else {
          throw new Error(json.error || 'Transcription failed');
        }
        setIsTranscribing(false);
      };
      reader.readAsDataURL(sttFile);
    } catch (err: any) {
      alert('Transcription error: ' + err.message);
      setIsTranscribing(false);
    }
  };

  // Fast Local Speech Recognition (Free, for low-spec PCs)
  const toggleLocalSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Web Speech Recognition API is not supported in this browser. Please use Chrome/Edge or Gemini STT.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = recognitionLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setLocalTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  // Convert local recorded transcript to Subtitle Cue
  const handleAddLocalTranscriptToCues = () => {
    if (!localTranscript.trim()) return;

    const startSec = cues.length > 0 ? cues[cues.length - 1].endSeconds + 0.5 : 1.0;
    const endSec = startSec + Math.max(3.0, localTranscript.length * 0.15);

    const newCue: SubtitleCue = {
      id: 'cue_' + Math.random().toString(36).substr(2, 9),
      index: cues.length + 1,
      startTime: secondsToSrtTime(startSec),
      endTime: secondsToSrtTime(endSec),
      startSeconds: startSec,
      endSeconds: endSec,
      speaker: 'narrator',
      speakerLabel: 'អ្នករៀបរាប់',
      text: localTranscript.trim(),
    };

    setCues((prev) => [...prev, newCue]);
    setLocalTranscript('');
  };

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setSubSection('script_writer')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-khmer transition ${
            subSection === 'script_writer'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tool សម្រាយរឿង AI Script Writer</span>
        </button>

        <button
          onClick={() => setSubSection('gemini_stt')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-khmer transition ${
            subSection === 'gemini_stt'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Gemini Speech-to-Text (SRT)</span>
        </button>

        <button
          onClick={() => setSubSection('local_stt')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold font-khmer transition ${
            subSection === 'local_stt'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Local STT លឿន (ម៉ាស៊ីនទាប)</span>
        </button>
      </div>

      {subSection === 'script_writer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Form: Inputs */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <h3 className="text-sm font-semibold text-white font-khmer flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>កំណត់សាច់រឿងដើម្បីបង្កើតស្គ្រីបសម្រាយ</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1">
                ចំណងជើងរឿង (Movie Title):
              </label>
              <input
                type="text"
                value={movieTitle}
                onChange={(e) => setMovieTitle(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-khmer"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1">
                  ប្រភេទរឿង (Genre):
                </label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none font-khmer"
                >
                  <option value="Action / Thriller">Action / Thriller (វាយប្រហារ រំភើប)</option>
                  <option value="Horror / Ghost">Horror (ខ្មោច ភ័យរន្ធត់)</option>
                  <option value="Mystery / Sci-Fi">Mystery / Sci-Fi (អាថ៌កំបាំង វិទ្យាសាស្ត្រ)</option>
                  <option value="Comedy / Funny">Comedy (កំប្លែង សើច)</option>
                  <option value="Romance / Drama">Drama (មនោសញ្ចេតនា សោកសៅ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1">
                  ថិរវេលាគ្រោងទុក (នាទី):
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-2 text-xs text-zinc-200 focus:outline-none font-mono"
                >
                  <option value={1}>1 នាទី (Shorts / TikTok)</option>
                  <option value={3}>3 នាទី (Recap Clip)</option>
                  <option value={5}>5 នាទី (Standard Recap)</option>
                  <option value={10}>10 នាទី (In-depth Full Recap)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1">
                សេចក្តីសង្ខេប / ឈុតឆាកសំខាន់ៗ (Plot Synopsis / Key Notes):
              </label>
              <textarea
                rows={4}
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                placeholder="រៀបរាប់ពីដំណើរដើមទង និងឈុតឆាកដែលចង់ឱ្យ AI សម្រាយ..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-khmer resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 font-khmer mb-1">
                ស្ទាយ៍អធិប្បាយ (Recap Tone & Hooks):
              </label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-khmer"
              />
            </div>

            <button
              onClick={handleGenerateScript}
              disabled={isGeneratingScript}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-khmer text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
            >
              {isGeneratingScript ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>
                {isGeneratingScript
                  ? 'កំពុងនិពន្ធស្គ្រីបសម្រាយរឿងជាមួយ Gemini AI...'
                  : '🚀 បង្កើតស្គ្រីបសម្រាយរឿងអាជីព (Generate Script)'}
              </span>
            </button>
          </div>

          {/* Right Column: Generated Script Preview & Action */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800 pb-2">
                <h4 className="text-xs font-bold text-zinc-200 font-khmer flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>លទ្ធផលស្គ្រីបសម្រាយរឿង (Generated Script)</span>
                </h4>
                {generatedResult && (
                  <span className="text-[10px] text-emerald-400 font-khmer bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">
                    ✓ រួចរាល់
                  </span>
                )}
              </div>

              {generatedResult ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {/* Hook callout */}
                  {generatedResult.hook && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-khmer">
                      <span className="font-bold text-amber-400">🔥 Viral Opening Hook: </span>
                      {generatedResult.hook}
                    </div>
                  )}

                  {/* Cues breakdown */}
                  <div className="space-y-2">
                    {generatedResult.cues?.map((c: any, i: number) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs flex items-start gap-2"
                      >
                        <span className="font-mono text-[10px] text-zinc-500 mt-0.5">
                          #{i + 1}
                        </span>
                        <span className="font-khmer font-bold text-rose-400 shrink-0">
                          [{c.speaker}]
                        </span>
                        <span className="font-khmer text-zinc-200 flex-1">{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center text-zinc-500 font-khmer text-xs flex flex-col items-center justify-center gap-2">
                  <Sparkles className="w-8 h-8 text-zinc-700 animate-pulse" />
                  <span>សូមបំពេញព័ត៌មានខាងឆ្វេង ហើយចុច "បង្កើតស្គ្រីបសម្រាយរឿង" ដើម្បីឱ្យ Gemini AI និពន្ធស្គ្រីប</span>
                </div>
              )}
            </div>

            {/* Apply Button */}
            {generatedResult && (
              <div className="pt-4 border-t border-zinc-800 mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-zinc-400 font-khmer">
                  ចំនួនបន្ទាត់ Subtitles: {generatedResult.cues?.length || 0}
                </span>

                <button
                  onClick={handleApplyScriptToProject}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-khmer text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-2 active:scale-95 transition"
                >
                  <span>📥 បញ្ចូលទៅក្នុង SRT & Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {subSection === 'gemini_stt' && (
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white font-khmer flex items-center gap-2">
                <Film className="w-4 h-4 text-rose-500" />
                <span>ការ Transcript សំឡេងជាអក្សរដោយប្រើ Gemini (Speech-to-Text & SRT)</span>
              </h3>
              <p className="text-xs text-zinc-400 font-khmer">
                បញ្ចូលឯកសារសម្លេង ឬវីដេអូ ដើម្បីឱ្យ Gemini AI ស្តាប់ និងបំប្លែងជាអក្សររត់ SRT ដោយបែកចែកតួអង្គស្វ័យប្រវត្តិ
              </p>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-zinc-950 border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-3 text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*,video/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setSttFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <Upload className="w-10 h-10 text-rose-500/70" />
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white font-khmer transition"
              >
                {sttFile ? `ឯកសារ៖ ${sttFile.name}` : 'ជ្រើសរើសឯកសារ Audio/Video'}
              </button>
              <p className="text-[11px] text-zinc-500 font-khmer mt-1">គាំទ្រ MP3, WAV, MP4, WebM</p>
            </div>

            {sttFile && (
              <button
                onClick={handleTranscribeAudio}
                disabled={isTranscribing}
                className="mt-2 px-6 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-khmer text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
              >
                {isTranscribing && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>
                  {isTranscribing ? 'កំពុងស្តាប់ និងបំប្លែងជា SRT...' : 'ចាប់ផ្តើម Transcript ជាមួយ Gemini'}
                </span>
              </button>
            )}
          </div>

          {sttResult && (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-emerald-400 font-khmer">
                ✓ បំប្លែងជាអក្សររត់ SRT បានជោគជ័យ!
              </span>
              <pre className="text-xs text-zinc-300 font-mono bg-zinc-900 p-3 rounded-lg overflow-x-auto max-h-48">
                {sttResult.srt || sttResult.fullTranscript}
              </pre>
            </div>
          )}
        </div>
      )}

      {subSection === 'local_stt' && (
        <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-white font-khmer flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>ការ Transcript សំឡេងបានលឿនសម្រាប់ Computer ដែលមានកម្លាំងម៉ាស៊ីនទាបៗ (Free Local STT)</span>
            </h3>
            <p className="text-xs text-zinc-400 font-khmer">
              ដំណើរការផ្ទាល់ក្នុង Browser តាមរយៈ Web Speech Recognition ឥតគិតថ្លៃ ល្បឿនលឿនភ្លាមៗ មិនត្រូវការ GPU ធំ
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={recognitionLang}
              onChange={(e) => setRecognitionLang(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none font-khmer"
            >
              <option value="km-KH">ភាសាខ្មែរ (Khmer - km-KH)</option>
              <option value="en-US">English (US)</option>
              <option value="th-TH">ภาษาไทย (Thai)</option>
              <option value="zh-CN">中文 (Chinese)</option>
            </select>

            <button
              onClick={toggleLocalSpeechRecognition}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold font-khmer transition shadow-md ${
                isListening
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'បញ្ឈប់ការថតសំឡេង' : '🎤 ចាប់ផ្តើមនិយាយ (Speak to Dictate)'}</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
            <span className="text-[11px] text-zinc-500 font-khmer block mb-2">
              អត្ថបទដែលចាប់បានផ្ទាល់ (Live Speech Stream):
            </span>
            <div className="min-h-[80px] p-3 rounded-lg bg-zinc-900/70 border border-zinc-800/80 text-xs text-white font-khmer">
              {localTranscript || (
                <span className="text-zinc-600 italic">
                  {isListening ? 'កំពុងស្តាប់... សូមនិយាយ...' : 'ចុចប៊ូតុង "ចាប់ផ្តើមនិយាយ" ដើម្បីសាកល្បង'}
                </span>
              )}
            </div>

            {localTranscript && (
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleAddLocalTranscriptToCues}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold font-khmer text-xs transition"
                >
                  + បន្ថែមអត្ថបទនេះចូលទៅក្នុង SRT Cues
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
