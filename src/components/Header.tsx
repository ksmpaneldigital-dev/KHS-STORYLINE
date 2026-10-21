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
  Redo2,
  Trash2,
  Globe
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeaderProps {
  activeTab: 'editor' | 'srt' | 'tts' | 'ai' | 'vocal' | 'translate';
  setActiveTab: (tab: 'editor' | 'srt' | 'tts' | 'ai' | 'vocal' | 'translate') => void;
  projectTitle: string;
  setProjectTitle: (t: string) => void;
  onOpenExportModal: () => void;
  onResetDemo: () => void;
  onClearAllData?: () => void;
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
  onClearAllData,
  cueCount,
  undo,
  redo,
  canUndo = false,
  canRedo = false,
  undoCount = 0,
  redoCount = 0,
}) => {
  const { lang, setLang, t } = useLanguage();

  const tabs = [
    { 
      id: 'editor', 
      label: t('tabEditor'), 
      sub: t('tabEditorSub'), 
      icon: Film 
    },
    { 
      id: 'srt', 
      label: t('tabSrt'), 
      sub: `${t('tabSrtSub')} (${cueCount})`, 
      icon: Subtitles 
    },
    { 
      id: 'tts', 
      label: t('tabTts'), 
      sub: t('tabTtsSub'), 
      icon: Mic2 
    },
    { 
      id: 'ai', 
      label: t('tabAi'), 
      sub: t('tabAiSub'), 
      icon: Sparkles 
    },
    { 
      id: 'vocal', 
      label: t('tabVocal'), 
      sub: t('tabVocalSub'), 
      icon: Sliders 
    },
    { 
      id: 'translate', 
      label: t('tabTranslate'), 
      sub: t('tabTranslateSub'), 
      icon: Languages 
    },
  ] as const;

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/95 sticky top-0 z-50 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Project Name */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-950/50 shrink-0">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight font-khmer">
                  {t('brandTitle')}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                  {t('brandBadge')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-khmer">
                {t('brandSubtitle')}
              </p>
            </div>
          </div>

          {/* Project Title input */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-500 font-khmer">{t('projectLabel')}</span>
            <input
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              className="bg-transparent text-zinc-200 focus:outline-none w-52 font-khmer truncate hover:text-white"
              title={lang === 'km' ? 'ចុចដើម្បីកែឈ្មោះ Project' : 'Click to rename project'}
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

        {/* Action buttons: Language Switcher, Undo/Redo, Clear, Demo, Export */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Language Switcher Toggle */}
          <div 
            className="flex items-center p-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs shadow-inner"
            role="group"
            aria-label="Language selector"
          >
            <button
              type="button"
              onClick={() => setLang('km')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                lang === 'km'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
              title="ប្តូរទៅភាសាខ្មែរ (Khmer)"
            >
              <span className="text-xs leading-none">🇰🇭</span>
              <span className="font-khmer text-[11px]">ខ្មែរ</span>
            </button>

            <button
              type="button"
              onClick={() => setLang('en')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                lang === 'en'
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-sm font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
              title="Switch to English"
            >
              <span className="text-xs leading-none">🇬🇧</span>
              <span className="text-[11px] font-sans tracking-wide">EN</span>
            </button>
          </div>

          {/* Global Undo / Redo controls */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition"
              title={`${t('undoTooltip')}${undoCount > 0 ? ` [${undoCount}]` : ''}`}
            >
              <Undo2 className="w-3.5 h-3.5 text-zinc-300" />
            </button>

            <button
              onClick={redo}
              disabled={!canRedo}
              className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-zinc-400 transition"
              title={`${t('redoTooltip')}${redoCount > 0 ? ` [${redoCount}]` : ''}`}
            >
              <Redo2 className="w-3.5 h-3.5 text-zinc-300" />
            </button>
          </div>

          {/* Clear Old Data button */}
          {onClearAllData && (
            <button
              onClick={onClearAllData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:text-white hover:bg-rose-950/60 border border-rose-900/50 transition"
              title={t('clearDataTooltip')}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-khmer">{t('clearData')}</span>
            </button>
          )}

          {/* Load Demo Data button */}
          <button
            onClick={onResetDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition"
            title={t('demoDataTooltip')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-khmer">{t('demoData')}</span>
          </button>

          {/* Export Video & SRT Modal Trigger */}
          <button
            onClick={onOpenExportModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-md shadow-rose-950/40 transition active:scale-95 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="font-khmer">{t('exportBtn')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
