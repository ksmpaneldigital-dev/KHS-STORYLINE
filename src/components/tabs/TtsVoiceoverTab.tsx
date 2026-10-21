import React, { useState } from 'react';
import { 
  Mic2, 
  Play, 
  Pause, 
  Sparkles, 
  Cpu, 
  Volume2, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Settings,
  RefreshCw
} from 'lucide-react';
import { SubtitleCue, TTSSettings } from '../../types';
import { speakLocalText } from '../../utils/audioProcessor';

interface TtsVoiceoverTabProps {
  cues: SubtitleCue[];
  setCues: React.Dispatch<React.SetStateAction<SubtitleCue[]>>;
  ttsSettings: TTSSettings;
  setTtsSettings: React.Dispatch<React.SetStateAction<TTSSettings>>;
  onSeek: (time: number) => void;
}

export const TtsVoiceoverTab: React.FC<TtsVoiceoverTabProps> = ({
  cues,
  setCues,
  ttsSettings,
  setTtsSettings,
  onSeek,
}) => {
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [playingCueId, setPlayingCueId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Voices available in Gemini TTS
  const geminiVoices = [
    { id: 'Charon', label: 'Charon (Deep Male Dramatic)', desc: 'សំឡេងប្រុសគ្រល័រ បែបភាពយន្ត Action' },
    { id: 'Puck', label: 'Puck (Engaging Narrator)', desc: 'សំឡេងរៀបរាប់រហ័ស រស់រវើក ទាក់ទាញ' },
    { id: 'Fenrir', label: 'Fenrir (Intense Male)', desc: 'សំឡេងប្រុសអំណាច រំភើប ភ័យរន្ធត់' },
    { id: 'Kore', label: 'Kore (Clear Female Warm)', desc: 'សំឡេងស្រីស្រទន់ ច្បាស់ កក់ក្តៅ' },
    { id: 'Zephyr', label: 'Zephyr (Calm Female)', desc: 'សំឡេងស្រីស្ងប់ស្ងាត់ ឆ្លាតវៃ' },
  ];

  // Generate TTS for single cue
  const generateCueAudio = async (cue: SubtitleCue) => {
    try {
      setStatusMessage(`កំពុងបង្កើតសំឡេងសម្រាប់៖ [${cue.speakerLabel}]...`);

      if (ttsSettings.engine === 'browser') {
        // Local Browser Speech
        await speakLocalText(cue.text, {
          speakerRole: cue.speaker,
          rate: ttsSettings.rate,
          pitch: ttsSettings.pitch,
        });
        setStatusMessage('សំឡេងបានចាក់រួចរាល់ (Browser Speech)');
        return;
      }

      // Gemini Neural TTS
      let voiceName = ttsSettings.narratorVoice;
      let speakerRole = 'narrator';
      if (cue.speaker === 'male' || cue.speakerLabel.includes('ប្រុស')) {
        voiceName = ttsSettings.maleVoice;
        speakerRole = 'male';
      } else if (cue.speaker === 'female' || cue.speakerLabel.includes('ស្រី')) {
        voiceName = ttsSettings.femaleVoice;
        speakerRole = 'female';
      }

      const res = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cue.text,
          voiceName: voiceName,
          speakerRole: speakerRole,
          style: ttsSettings.dramaticStyle,
        }),
      });

      const json = await res.json();
      if (json.success && json.audioBase64) {
        const audioUrl = `data:audio/wav;base64,${json.audioBase64}`;
        setCues((prev) =>
          prev.map((c) => (c.id === cue.id ? { ...c, audioUrl, audioBase64: json.audioBase64 } : c))
        );
        // Play generated audio
        const audio = new Audio(audioUrl);
        setPlayingCueId(cue.id);
        audio.onended = () => setPlayingCueId(null);
        audio.play();
        setStatusMessage('បង្កើតសំឡេងបានជោគជ័យ!');
      } else {
        throw new Error(json.error || 'TTS error');
      }
    } catch (err: any) {
      console.warn('TTS fallback to local speech:', err);
      // Fallback seamlessly to local speech so the user is never blocked!
      await speakLocalText(cue.text, { speakerRole: cue.speaker });
      setStatusMessage('បានចាក់សំឡេងតាមម៉ាស៊ីនក្នុងកុំព្យូទ័រ (Local Fallback)');
    }
  };

  // Generate All Voices from SRT (បែកចែកសំឡេងប្រុសស្រី)
  const handleGenerateAllCues = async () => {
    if (cues.length === 0) return;
    setIsGeneratingAll(true);
    setStatusMessage('ចាប់ផ្តើមសំយោគសំឡេងទាំងអស់តាម SRT...');

    for (let i = 0; i < cues.length; i++) {
      setProgressIndex(i + 1);
      const cue = cues[i];

      try {
        if (ttsSettings.engine === 'gemini') {
          let voiceName = ttsSettings.narratorVoice;
          let speakerRole = 'narrator';
          if (cue.speaker === 'male' || cue.speakerLabel.includes('ប្រុស')) {
            voiceName = ttsSettings.maleVoice;
            speakerRole = 'male';
          } else if (cue.speaker === 'female' || cue.speakerLabel.includes('ស្រី')) {
            voiceName = ttsSettings.femaleVoice;
            speakerRole = 'female';
          }

          const res = await fetch('/api/gemini/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: cue.text,
              voiceName: voiceName,
              speakerRole: speakerRole,
              style: ttsSettings.dramaticStyle,
            }),
          });

          const json = await res.json();
          if (json.success && json.audioBase64) {
            const audioUrl = `data:audio/wav;base64,${json.audioBase64}`;
            setCues((prev) =>
              prev.map((c) => (c.id === cue.id ? { ...c, audioUrl, audioBase64: json.audioBase64 } : c))
            );
          }
        }
      } catch (e) {
        console.warn('Error on cue', i, e);
      }
    }

    setIsGeneratingAll(false);
    setStatusMessage('សំយោគសំឡេងតាម SRT ទាំងអស់បានជោគជ័យ!');
  };

  return (
    <div className="space-y-6">
      {/* Engine Selection: Gemini AI Neural TTS vs Free Local Browser TTS */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white font-khmer flex items-center gap-2">
              <Mic2 className="w-4 h-4 text-rose-500" />
              <span>ប្រព័ន្ធសំឡេងអាន (Text-to-Speech Engine)</span>
            </h3>
            <p className="text-xs text-zinc-400 font-khmer">
              ជ្រើសរើសសំឡេង AI Neural ឬ សំឡេងកុំព្យូទ័រឥតគិតថ្លៃ (Free Local TTS សម្រាប់ម៉ាស៊ីនកម្លាំងទាប)
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
            <button
              onClick={() => setTtsSettings((s) => ({ ...s, engine: 'gemini' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-khmer transition ${
                ttsSettings.engine === 'gemini'
                  ? 'bg-rose-600 text-white font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini Neural AI (Pro)</span>
            </button>

            <button
              onClick={() => setTtsSettings((s) => ({ ...s, engine: 'browser' }))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-khmer transition ${
                ttsSettings.engine === 'browser'
                  ? 'bg-emerald-600 text-white font-semibold shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Free Local Offline (លឿន)</span>
            </button>
          </div>
        </div>

        {/* Multi-Speaker Voice Assignment (បែកចែកសំឡេងប្រុសស្រី) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Narrator Voice */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-purple-900/40 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-xs font-bold text-purple-300 font-khmer">សំឡេង [អ្នករៀបរាប់]</span>
            </div>
            <select
              value={ttsSettings.narratorVoice}
              onChange={(e) => setTtsSettings((s) => ({ ...s, narratorVoice: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg p-2 focus:outline-none"
            >
              {geminiVoices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-zinc-500 font-khmer">សំឡេងអធិប្បាយរៀបរាប់សាច់រឿងទូទៅ</span>
          </div>

          {/* Male Lead Voice */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-blue-900/40 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-xs font-bold text-blue-300 font-khmer">សំឡេង [ប្រុស] (Male Lead)</span>
            </div>
            <select
              value={ttsSettings.maleVoice}
              onChange={(e) => setTtsSettings((s) => ({ ...s, maleVoice: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg p-2 focus:outline-none"
            >
              <option value="Charon">Charon (Deep & Heavy Cinematic)</option>
              <option value="Fenrir">Fenrir (Intense Male Hero)</option>
              <option value="Puck">Puck (Fast Young Male)</option>
            </select>
            <span className="text-[10px] text-zinc-500 font-khmer">សម្រាប់ពាក្យសន្ទនាតួអង្គប្រុសក្នុងរឿង</span>
          </div>

          {/* Female Lead Voice */}
          <div className="p-3 rounded-xl bg-zinc-950 border border-pink-900/40 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500" />
              <span className="text-xs font-bold text-pink-300 font-khmer">សំឡេង [ស្រី] (Female Lead)</span>
            </div>
            <select
              value={ttsSettings.femaleVoice}
              onChange={(e) => setTtsSettings((s) => ({ ...s, femaleVoice: e.target.value }))}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-lg p-2 focus:outline-none"
            >
              <option value="Kore">Kore (Clear & Emotional Warm)</option>
              <option value="Zephyr">Zephyr (Calm & Intelligent)</option>
            </select>
            <span className="text-[10px] text-zinc-500 font-khmer">សម្រាប់ពាក្យសន្ទនាតួអង្គស្រីក្នុងរឿង</span>
          </div>
        </div>

        {/* Dramatic Tone / Style input */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-medium text-zinc-400 font-khmer mb-1">
              ស្ទាយ៍អធិប្បាយ និងអារម្មណ៍សំឡេង (Recap Emotion / Tone Prompt):
            </label>
            <input
              type="text"
              value={ttsSettings.dramaticStyle}
              onChange={(e) => setTtsSettings((s) => ({ ...s, dramaticStyle: e.target.value }))}
              placeholder="ឧ. សំឡេងអធិប្បាយរំភើប ភ័យរន្ធត់ កាត់ឆ្មក់ Hook ទាក់ទាញ"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-rose-500 font-khmer"
            />
          </div>

          {/* Master Generate Button */}
          <button
            onClick={handleGenerateAllCues}
            disabled={isGeneratingAll}
            className="w-full sm:w-auto mt-4 sm:mt-5 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-rose-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-khmer text-xs font-bold shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 transition disabled:opacity-50"
          >
            {isGeneratingAll ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>
              {isGeneratingAll
                ? `កំពុងសំយោគ (${progressIndex}/${cues.length})...`
                : '⚡ បង្កើតសំឡេងតាម SRT ទាំងអស់ស្វ័យប្រវត្តិ'}
            </span>
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 text-xs text-amber-300 font-khmer flex items-center gap-1.5 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Cues List with Direct TTS Trigger */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
        <h4 className="text-xs font-semibold text-zinc-300 font-khmer flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>ស្តាប់សាកល្បង និងបង្កើតសំឡេងតាមបន្ទាត់នីមួយៗ (Cue Audio Inspector)</span>
        </h4>

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {cues.map((cue) => {
            const hasAudio = !!cue.audioUrl;
            const isPlayingThis = playingCueId === cue.id;
            const isFemale = cue.speaker === 'female' || cue.speakerLabel.includes('ស្រី');
            const isMale = cue.speaker === 'male' || cue.speakerLabel.includes('ប្រុស');

            return (
              <div
                key={cue.id}
                className="p-3 rounded-lg bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-khmer shrink-0 ${
                      isFemale
                        ? 'bg-pink-950 text-pink-300 border border-pink-500/30'
                        : isMale
                        ? 'bg-blue-950 text-blue-300 border border-blue-500/30'
                        : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {cue.speakerLabel || cue.speaker}
                  </span>

                  <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                    {cue.startTime.slice(3, 8)}
                  </span>

                  <span className="font-khmer text-zinc-200 truncate flex-1">
                    {cue.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {hasAudio && (
                    <span className="text-[10px] text-emerald-400 font-khmer px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                      ✓ រួចរាល់
                    </span>
                  )}

                  <button
                    onClick={() => generateCueAudio(cue)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-khmer text-[11px] transition active:scale-95"
                  >
                    {isPlayingThis ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-rose-400 fill-rose-400" />}
                    <span>{hasAudio ? 'ចាក់សំឡេង' : 'បង្កើត & ចាក់'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
