import React from 'react';
import { 
  Film, 
  Subtitles, 
  Mic2, 
  Sparkles, 
  Sliders, 
  Languages, 
  Download, 
  RotateCcw,
  Undo2,
  Redo2
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'editor' | 'srt' | 'tts' | 'ai' | 'vocal' | 'translate';
  setActiveTab: (tab: 'editor' | 'srt' | 'tts' | 'ai' | 'vocal' | 'translate') => void;
  projectTitle: string;
  setProjectTitle: (t: string) => void;
  onOpenExportModal: () => void;
  onResetDemo: () => void;
  cueCount: number;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  projectTitle,
  setProjectTitle,
  onOpenExportModal,
  onResetDemo,
  cueCount,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
  undoCount = 0,
  redoCount = 0,
}) => {
  const tabs = [
    { id: 'editor', label: 'កាត់តវីដេអូ', sub: 'Video Editor', icon: Film },
    { id: 'srt', label: 'កែសម្រួល SRT', sub: `Subtitles (${cueCount})`, icon: Subtitles },
    { id: 'tts', label: 'សំឡេងប្រុស/ស្រី', sub: 'Multi-Voice TTS', icon: Mic2 },
    { id: 'ai', label: 'AI សម្រាយរឿង', sub: 'Recap & STT', icon: Sparkles },
    { id: 'vocal', label: 'បំបែកសំឡេង', sub: 'Vocal Remover', icon: Sliders },
    { id: 'translate', label: 'បកប្រែភាសា', sub: 'SRT Translator', icon: Languages },
  ] as const;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 sticky top-0 z-50 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight font-khmer">KHS STORYLINE</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                  PRO STUDIO
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-khmer">Tool សម្រាយរឿង និងកាត់តវីដេអូអាជីព</p>
            </div>
          </div>

          {/* Project Title input */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-500 font-khmer">Project:</span>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none w-52 font-khmer truncate hover:text-white"
              title="ចុចដើម្បីកែឈ្មោះ Project"
            />
          </div>
        </div>

        {/* Tab navigation */}
        <nav className="flex items-center gap-1 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span className="font-khmer">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action buttons with Global Undo/Redo */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {/* Global Undo / Redo controls */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition"
              title={`Undo ត្រឡប់ក្រោយ (Ctrl+Z)${undoCount > 0 ? ` [${undoCount}]` : ''}`}
            >
              <Undo2 className="w-3.5 h-3.5 text-zinc-300" />
            </button>

            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition"
              title={`Redo ទៅមុខ (Ctrl+Y)${redoCount > 0 ? ` [${redoCount}]` : ''}`}
            >
              <Redo2 className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>

          <button
            onClick={onResetDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition"
            title="ត្រឡប់ទៅទិន្នន័យគំរូដើម"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-khmer">ទិន្នន័យគំរូ</span>
          </button>

          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-rose-950/40 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="font-khmer">Export វីដេអូ & SRT</span>
          </button>
        </div>
      </div>
    </header>
  );
};
