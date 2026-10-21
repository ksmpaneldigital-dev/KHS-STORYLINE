import React from 'react';
import { 
  Tv, 
  Smartphone, 
  Square, 
  Volume2, 
  Sliders, 
  Sparkles, 
  Scissors, 
  Download,
  Film
} from 'lucide-react';
import { VideoProject, AspectRatio, VideoFilter } from '../../types';

interface VideoEditorTabProps {
  project: VideoProject;
  setProject: React.Dispatch<React.SetStateAction<VideoProject>>;
  onOpenExportModal: () => void;
}

export const VideoEditorTab: React.FC<VideoEditorTabProps> = ({
  project,
  setProject,
  onOpenExportModal,
}) => {
  const filters: { id: VideoFilter; label: string; desc: string }[] = [
    { id: 'cinematic', label: 'Cinematic Mood', desc: 'ពណ៌បែបភាពយន្តហូលីវូដ កម្រិតពណ៌ច្បាស់' },
    { id: 'none', label: 'ធម្មតា (Original)', desc: 'ពណ៌ដើមនៃវីដេអូគ្មានការកែសម្រួល' },
    { id: 'warm', label: 'Warm Drama', desc: 'ពណ៌ស្រទន់ កក់ក្តៅ បែបរឿងមនោសញ្ចេតនា' },
    { id: 'noir', label: 'Cold Noir', desc: 'ស ខ្មៅ អាថ៌កំបាំង បែបរឿងស៊ើបអង្កេត' },
    { id: 'cyberpunk', label: 'Cyberpunk', desc: 'ពណ៌រស់រវើក Neon សម្រាប់រឿង Sci-Fi / Action' },
    { id: 'vintage', label: 'Vintage Classic', desc: 'ពណ៌បែបភាពយន្តបុរាណទសវត្សរ៍ ៨០-៩០' },
  ];

  return (
    <div className="space-y-6">
      {/* Aspect Ratio & Format */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2 font-khmer">
          <Film className="w-4 h-4 text-rose-500" />
          <span>ទំហំវីដេអូសម្រាប់បណ្តាញសង្គម (Video Aspect Ratio)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setProject((p) => ({ ...p, aspectRatio: '16:9' }))}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              project.aspectRatio === '16:9'
                ? 'bg-rose-500/10 border-rose-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Tv className="w-5 h-5 text-rose-400" />
            <div>
              <div className="font-bold text-xs">16:9 Landscape</div>
              <div className="text-[10px] text-zinc-500 font-khmer">YouTube / Facebook</div>
            </div>
          </button>

          <button
            onClick={() => setProject((p) => ({ ...p, aspectRatio: '9:16' }))}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              project.aspectRatio === '9:16'
                ? 'bg-rose-500/10 border-rose-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Smartphone className="w-5 h-5 text-rose-400" />
            <div>
              <div className="font-bold text-xs">9:16 Vertical</div>
              <div className="text-[10px] text-zinc-500 font-khmer">TikTok / Reels / Shorts</div>
            </div>
          </button>

          <button
            onClick={() => setProject((p) => ({ ...p, aspectRatio: '1:1' }))}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              project.aspectRatio === '1:1'
                ? 'bg-rose-500/10 border-rose-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Square className="w-5 h-5 text-rose-400" />
            <div>
              <div className="font-bold text-xs">1:1 Square</div>
              <div className="text-[10px] text-zinc-500 font-khmer">Instagram / Post</div>
            </div>
          </button>

          <button
            onClick={() => setProject((p) => ({ ...p, aspectRatio: '4:3' }))}
            className={`p-3 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              project.aspectRatio === '4:3'
                ? 'bg-rose-500/10 border-rose-500 text-white'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Tv className="w-5 h-5 text-zinc-400" />
            <div>
              <div className="font-bold text-xs">4:3 Classic</div>
              <div className="text-[10px] text-zinc-500 font-khmer">Retro Cinema</div>
            </div>
          </button>
        </div>
      </div>

      {/* Audio Mixing Console */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2 font-khmer">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>ការលាយសំឡេង (Audio Mixer Console)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Video Audio Volume */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-khmer">
              <span className="text-zinc-300">សំឡេងវីដេអូដើម</span>
              <span className="font-mono text-zinc-400">{Math.round(project.videoVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.videoVolume}
              onChange={(e) => setProject((p) => ({ ...p, videoVolume: parseFloat(e.target.value) }))}
              className="w-full accent-indigo-500"
            />
            <span className="text-[10px] text-zinc-500 font-khmer">បន្ថយដើម្បីកុំឱ្យរំខានសំឡេងសម្រាយរឿង</span>
          </div>

          {/* Voiceover Volume */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-khmer">
              <span className="text-emerald-400 font-medium">សំឡេងអាន/សម្រាយ (Voiceover)</span>
              <span className="font-mono text-emerald-400">{Math.round(project.voiceoverVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={project.voiceoverVolume}
              onChange={(e) => setProject((p) => ({ ...p, voiceoverVolume: parseFloat(e.target.value) }))}
              className="w-full accent-emerald-500"
            />
            <span className="text-[10px] text-zinc-500 font-khmer">សំឡេងតួអង្គប្រុស/ស្រី និងអ្នករៀបរាប់</span>
          </div>

          {/* BGM Volume */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs font-khmer">
              <span className="text-rose-400 font-medium">តន្ត្រីកំដរ (Cinematic BGM)</span>
              <span className="font-mono text-rose-400">{Math.round(project.bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={project.bgmVolume}
              onChange={(e) => setProject((p) => ({ ...p, bgmVolume: parseFloat(e.target.value) }))}
              className="w-full accent-rose-500"
            />
            <span className="text-[10px] text-zinc-500 font-khmer">បង្កើតបរិយាកាសរំភើប ភ័យរន្ធត់</span>
          </div>
        </div>
      </div>

      {/* Cinematic Color Grading Filters */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2 font-khmer">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>ពណ៌បែបភាពយន្ត (Cinematic Color Grading Filters)</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setProject((p) => ({ ...p, filter: f.id }))}
              className={`p-3 rounded-xl border text-left transition ${
                project.filter === f.id
                  ? 'bg-amber-500/15 border-amber-500 text-white shadow-md shadow-amber-950/30'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
              }`}
            >
              <div className="font-bold text-xs mb-1 font-khmer">{f.label}</div>
              <div className="text-[10px] text-zinc-500 font-khmer line-clamp-2">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Watermark & Channel Logo */}
      <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-200 mb-2 font-khmer">
          Watermark & ឈ្មោះ Channel
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={project.watermarkText}
            onChange={(e) => setProject((p) => ({ ...p, watermarkText: e.target.value }))}
            placeholder="ឧ. CineRecap Movie Studio"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-khmer"
          />
          <button
            onClick={() => setProject((p) => ({ ...p, watermarkText: '' }))}
            className="px-3 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-400 hover:text-white font-khmer"
          >
            លុប
          </button>
        </div>
      </div>

      {/* Burn Subtitles & Export Video Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-zinc-900 to-amber-950/40 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white font-khmer mb-1">
            🎬 រួចរាល់ក្នុងការ Render & Export វីដេអូ?
          </h4>
          <p className="text-xs text-zinc-400 font-khmer">
            កម្មវិធីនឹងដុតអក្សររត់ (Hard-Burn Subtitles), លាយសំឡេងអធិប្បាយ TTS និងតន្ត្រីកំដរ ចូលក្នុងវីដេអូពេញលេញតែមួយ។
          </p>
        </div>
        <button
          onClick={onOpenExportModal}
          className="px-6 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-lg shadow-rose-950/50 flex items-center gap-2 whitespace-nowrap active:scale-95 transition"
        >
          <Download className="w-4 h-4" />
          <span className="font-khmer">Export វីដេអូពេញលេញ</span>
        </button>
      </div>
    </div>
  );
};
