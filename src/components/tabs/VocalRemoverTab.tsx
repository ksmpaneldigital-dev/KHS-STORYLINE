import React, { useState, useRef, useEffect } from 'react';
import { 
  Sliders, 
  Music, 
  Mic2, 
  Play, 
  Pause, 
  Download, 
  Upload, 
  RotateCcw, 
  Volume2, 
  CheckCircle2,
  Sparkles,
  Radio
} from 'lucide-react';
import { 
  getAudioContext, 
  processVocalSeparation, 
  audioBufferToWav,
  generateProceduralBgm
} from '../../utils/audioProcessor';

interface VocalRemoverTabProps {
  videoUrl?: string;
}

export const VocalRemoverTab: React.FC<VocalRemoverTabProps> = ({ videoUrl }) => {
  const [mode, setMode] = useState<'karaoke' | 'vocals_only' | 'all'>('karaoke');
  const [vocalGain, setVocalGain] = useState<number>(0.1);
  const [bgmGain, setBgmGain] = useState<number>(1.2);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isABOriginal, setIsABOriginal] = useState<boolean>(false);
  const [audioLoaded, setAudioLoaded] = useState<boolean>(false);
  const [audioFileName, setAudioFileName] = useState<string>('Cinematic Movie Audio');
  const [statusMsg, setStatusMsg] = useState<string>('');

  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const currentSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize with procedural or video audio
  useEffect(() => {
    const ctx = getAudioContext();
    const bgm = generateProceduralBgm(ctx, 24);
    audioBufferRef.current = bgm;
    setAudioLoaded(true);
  }, [videoUrl]);

  // Load custom audio file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAudioFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const arrayBuffer = evt.target?.result as ArrayBuffer;
      const ctx = getAudioContext();
      try {
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        audioBufferRef.current = decoded;
        setAudioLoaded(true);
        setStatusMsg(`បានបញ្ចូលឯកសារ៖ ${file.name} រួចរាល់!`);
      } catch (err) {
        alert('Could not decode audio file');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Playback logic
  const stopPlayback = () => {
    if (currentSourceNodeRef.current) {
      try {
        currentSourceNodeRef.current.stop();
      } catch {}
      currentSourceNodeRef.current.disconnect();
      currentSourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  const startPlayback = () => {
    if (!audioBufferRef.current) return;
    const ctx = getAudioContext();
    stopPlayback();

    let targetBuffer = audioBufferRef.current;

    // If not A/B original, process with vocal separator algorithm
    if (!isABOriginal) {
      targetBuffer = processVocalSeparation(audioBufferRef.current, {
        mode: mode,
        vocalGain: vocalGain,
        bgmGain: bgmGain,
      });
    }

    const source = ctx.createBufferSource();
    source.buffer = targetBuffer;
    source.loop = true;
    source.connect(ctx.destination);
    source.start(0);

    currentSourceNodeRef.current = source;
    setIsPlaying(true);
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  };

  // Switch A/B comparison
  const toggleAB = (original: boolean) => {
    setIsABOriginal(original);
    if (isPlaying) {
      // Restart with new buffer
      setTimeout(() => startPlayback(), 50);
    }
  };

  // Export processed WAV stem
  const handleExportStem = () => {
    if (!audioBufferRef.current) return;

    setStatusMsg('កំពុង Render និង Export WAV Stem...');
    const processed = processVocalSeparation(audioBufferRef.current, {
      mode: mode,
      vocalGain: vocalGain,
      bgmGain: bgmGain,
    });

    const wavBlob = audioBufferToWav(processed);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `isolated_${mode}_stem.wav`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg(`ទាញយកឯកសារ isolated_${mode}_stem.wav បានជោគជ័យ!`);
  };

  // Waveform visualization
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;

      // Draw subtle dark grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();

      if (isPlaying) {
        phase += 0.1;
        const color = isABOriginal
          ? '#94a3b8' // gray original
          : mode === 'karaoke'
          ? '#f43f5e' // rose
          : '#38bdf8'; // cyan

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let x = 0; x < w; x += 3) {
          const normX = x / w;
          const amp = (mode === 'karaoke' ? bgmGain : vocalGain) * 25;
          const y =
            h / 2 +
            Math.sin(normX * 18 + phase) * amp * Math.sin(normX * Math.PI) +
            Math.cos(normX * 36 - phase * 1.5) * (amp * 0.4);

          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        // Idle flat line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isABOriginal, mode, vocalGain, bgmGain]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white font-khmer flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-500" />
            <span>ឧបករណ៍បំបែកសំឡេង (Tool Separate Voice & Vocal Remover)</span>
          </h3>
          <p className="text-xs text-zinc-400 font-khmer">
            ញែកសំឡេងនិយាយ និងតន្ត្រីកំដរ (BGM) ចេញពីគ្នា ដើម្បីងាយស្រួលសម្រាយរឿង និងកាត់ត
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="audio/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-300 font-khmer transition"
          >
            <Upload className="w-3.5 h-3.5 text-rose-400" />
            <span>បញ្ចូល Audio ថ្មី</span>
          </button>
        </div>
      </div>

      {/* Preset Modes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Karaoke / Dubbing Mode */}
        <button
          onClick={() => {
            setMode('karaoke');
            setVocalGain(0.05);
            setBgmGain(1.2);
            if (isPlaying) setTimeout(() => startPlayback(), 50);
          }}
          className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
            mode === 'karaoke'
              ? 'bg-rose-500/15 border-rose-500 text-white shadow-lg shadow-rose-950/30'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Music className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-xs font-khmer">🎶 Karaoke / Dubbing Mode</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-khmer mb-2">
            បំបាត់សំឡេងនិយាយដើមចោល រក្សាទុកតែតន្ត្រីកំដរ និងសំឡេង SFX ភាពយន្តសម្រាប់សម្រាយរឿង។
          </p>
          <span className="text-[10px] text-rose-300 font-mono">BGM: 120% • Vocal: Cut</span>
        </button>

        {/* Vocals Only Mode */}
        <button
          onClick={() => {
            setMode('vocals_only');
            setVocalGain(1.3);
            setBgmGain(0.1);
            if (isPlaying) setTimeout(() => startPlayback(), 50);
          }}
          className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
            mode === 'vocals_only'
              ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-lg shadow-cyan-950/30'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Mic2 className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-xs font-khmer">🗣️ Vocals Only (ញែកតែសំឡេង)</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-khmer mb-2">
            ស្រង់យកតែសំឡេងនិយាយសុទ្ធ និងកាត់បន្ថយតន្ត្រីកំដរខាងក្រោយឱ្យនៅតិចបំផុត។
          </p>
          <span className="text-[10px] text-cyan-300 font-mono">Vocal: 130% • BGM: Cut</span>
        </button>

        {/* Custom Mix */}
        <button
          onClick={() => {
            setMode('all');
            setVocalGain(0.8);
            setBgmGain(0.8);
            if (isPlaying) setTimeout(() => startPlayback(), 50);
          }}
          className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
            mode === 'all'
              ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-950/30'
              : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs font-khmer">🎛️ Custom Stem Mix</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-khmer mb-2">
            លៃតម្រូវកម្រិតសំឡេងនិយាយ និងតន្ត្រីតាមការពេញចិត្តដោយប្រើ Sliders ខាងក្រោម។
          </p>
          <span className="text-[10px] text-amber-300 font-mono">Manual Balance</span>
        </button>
      </div>

      {/* Sliders Console */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Vocal Level */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-xs font-khmer mb-2">
            <span className="text-cyan-400 font-medium">កម្រិតសំឡេងនិយាយ (Vocal Isolation Gain)</span>
            <span className="font-mono text-cyan-400">{Math.round(vocalGain * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={vocalGain}
            onChange={(e) => {
              setVocalGain(parseFloat(e.target.value));
              if (isPlaying) setTimeout(() => startPlayback(), 30);
            }}
            className="w-full accent-cyan-500"
          />
        </div>

        {/* BGM Level */}
        <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
          <div className="flex items-center justify-between text-xs font-khmer mb-2">
            <span className="text-rose-400 font-medium">កម្រិតតន្ត្រីកំដរ (Instrumental / BGM Gain)</span>
            <span className="font-mono text-rose-400">{Math.round(bgmGain * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={bgmGain}
            onChange={(e) => {
              setBgmGain(parseFloat(e.target.value));
              if (isPlaying) setTimeout(() => startPlayback(), 30);
            }}
            className="w-full accent-rose-500"
          />
        </div>
      </div>

      {/* Real-time Waveform Canvas & Controls */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-khmer text-zinc-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>កំពុងចាក់៖ {audioFileName}</span>
          </span>

          {/* A/B Switch Button */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => toggleAB(false)}
              className={`px-3 py-1 rounded-md text-[11px] font-khmer transition ${
                !isABOriginal
                  ? 'bg-rose-600 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              សំឡេងបំបែក (Separated)
            </button>
            <button
              onClick={() => toggleAB(true)}
              className={`px-3 py-1 rounded-md text-[11px] font-khmer transition ${
                isABOriginal
                  ? 'bg-zinc-700 text-white font-bold shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              សំឡេងដើម (Original)
            </button>
          </div>
        </div>

        {/* Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={800}
          height={90}
          className="w-full h-24 bg-zinc-900/60 rounded-lg border border-zinc-800/80"
        />

        {/* Play & Export Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={togglePlay}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-khmer text-xs font-bold shadow-md active:scale-95 transition"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            <span>{isPlaying ? 'ផ្អាកសំឡេង' : 'ចាក់ស្តាប់សាកល្បង (Play Preview)'}</span>
          </button>

          <button
            onClick={handleExportStem}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-khmer text-xs font-semibold border border-zinc-700 transition active:scale-95"
          >
            <Download className="w-4 h-4 text-rose-400" />
            <span>ទាញយកឯកសារ Stem (WAV File)</span>
          </button>
        </div>

        {statusMsg && (
          <div className="mt-2 text-xs text-emerald-400 font-khmer flex items-center gap-1.5 bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
