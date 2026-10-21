/**
 * CineRecap Studio - Pro Movie Recap & Video Editor
 * សម្រាយរឿង និងកាត់តវីដេអូអាជីព
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { VideoCanvasPlayer } from './components/VideoCanvasPlayer';
import { TimelineTracks } from './components/TimelineTracks';
import { VideoEditorTab } from './components/tabs/VideoEditorTab';
import { SrtEditorTab } from './components/tabs/SrtEditorTab';
import { TtsVoiceoverTab } from './components/tabs/TtsVoiceoverTab';
import { AiRecapTab } from './components/tabs/AiRecapTab';
import { VocalRemoverTab } from './components/tabs/VocalRemoverTab';
import { TranslatorTab } from './components/tabs/TranslatorTab';
import { ExportModal } from './components/ExportModal';

import { VideoProject, SubtitleCue, SubtitleStyleConfig, TTSSettings, AspectRatio } from './types';
import { parseSrt } from './utils/srtParser';
import { 
  INITIAL_PROJECT, 
  DEMO_SRT_TEXT, 
  INITIAL_SUBTITLE_STYLE, 
  createDemoMovieVideo 
} from './utils/demoData';
import { useSubtitleHistory } from './hooks/useSubtitleHistory';
import { Undo2, Redo2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'editor' | 'srt' | 'tts' | 'ai' | 'vocal' | 'translate'>('editor');
  const [project, setProject] = useState<VideoProject>(INITIAL_PROJECT);
  const [subtitleConfig, setSubtitleConfig] = useState<SubtitleStyleConfig>(INITIAL_SUBTITLE_STYLE);

  // Global Undo / Redo History Stack for Subtitles (starts clean without old data)
  const {
    cues,
    setCues,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    lastAction,
    resetCuesAndHistory,
  } = useSubtitleHistory([]);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedCueId, setSelectedCueId] = useState<string | undefined>(undefined);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Synchronize subtitle config into project
  useEffect(() => {
    setProject((prev) => ({ ...prev, subtitleConfig }));
  }, [subtitleConfig]);

  // Flash subtle action toast when lastAction changes
  useEffect(() => {
    if (lastAction) {
      setActionToast(lastAction);
      const timer = setTimeout(() => setActionToast(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  // TTS Settings
  const [ttsSettings, setTtsSettings] = useState<TTSSettings>({
    engine: 'gemini',
    narratorVoice: 'Charon',
    maleVoice: 'Fenrir',
    femaleVoice: 'Kore',
    pitch: 1.0,
    rate: 1.0,
    dramaticStyle: 'អធិប្បាយរំភើប ភ័យរន្ធត់ កាត់ឆ្មក់ Hook ទាក់ទាញ',
  });

  // Generate procedural demo video clip on first load if videoUrl is empty
  useEffect(() => {
    let active = true;
    if (!project.videoUrl) {
      createDemoMovieVideo().then((url) => {
        if (active && url) {
          setProject((prev) => ({ ...prev, videoUrl: url }));
        }
      });
    }
    return () => {
      active = false;
    };
  }, []);

  // Global Keyboard shortcuts: Spacebar (Play/Pause), Ctrl+Z (Undo), Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput =
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      // Global Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          // Redo: Ctrl+Shift+Z
          if (canRedo) {
            e.preventDefault();
            redo();
          }
        } else {
          // Undo: Ctrl+Z
          if (!isInput && canUndo) {
            e.preventDefault();
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        // Redo: Ctrl+Y
        if (canRedo) {
          e.preventDefault();
          redo();
        }
      } else if (e.code === 'Space') {
        // Spacebar Play/Pause (only when not typing in an input)
        if (!isInput) {
          e.preventDefault();
          setIsPlaying((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  // Custom Video File Upload
  const handleUploadCustomVideo = (file: File) => {
    const videoUrl = URL.createObjectURL(file);
    setProject((prev) => ({
      ...prev,
      videoUrl,
      title: file.name.replace(/\.[^/.]+$/, ''),
    }));
  };

  // Aspect ratio change
  const handleAspectChange = (aspectRatio: AspectRatio) => {
    setProject((prev) => ({ ...prev, aspectRatio }));
  };

  // Clear all old data to start clean
  const handleClearAllData = () => {
    resetCuesAndHistory([]);
    setProject((prev) => ({
      ...prev,
      title: 'KHS STORYLINE - គម្រោងថ្មី',
    }));
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // Reset to demo project with sample video & cues
  const handleResetDemo = async () => {
    const demoVideoUrl = await createDemoMovieVideo();
    setProject({
      ...INITIAL_PROJECT,
      videoUrl: demoVideoUrl,
    });
    resetCuesAndHistory(parseSrt(DEMO_SRT_TEXT));
    setSubtitleConfig(INITIAL_SUBTITLE_STYLE);
    setCurrentTime(0);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-khmer relative">
      {/* Top Application Header with Global Undo / Redo */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        projectTitle={project.title}
        setProjectTitle={(title) => setProject((p) => ({ ...p, title }))}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onResetDemo={handleResetDemo}
        onClearAllData={handleClearAllData}
        cueCount={cues.length}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        undoCount={undoCount}
        redoCount={redoCount}
      />

      {/* Main Studio Workstation */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 space-y-6">
        {/* Top Studio Row: Video Canvas Player (Left) & Active Tools Panel (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Video Player Column */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-4">
            <VideoCanvasPlayer
              project={project}
              cues={cues}
              currentTime={currentTime}
              setCurrentTime={setCurrentTime}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              onUploadCustomVideo={handleUploadCustomVideo}
              onAspectChange={handleAspectChange}
              onVideoLoaded={(dur) => setProject((p) => ({ ...p, duration: dur }))}
            />

            {/* Timeline Multi-Tracks */}
            <TimelineTracks
              project={project}
              cues={cues}
              currentTime={currentTime}
              duration={project.duration}
              onSeek={(time) => {
                setCurrentTime(time);
              }}
              onSelectCue={(cue) => {
                setSelectedCueId(cue.id);
                setActiveTab('srt');
              }}
              selectedCueId={selectedCueId}
            />
          </div>

          {/* Right Column: Active Tab Workstation */}
          <div className="lg:col-span-5 xl:col-span-5 bg-zinc-950/80 rounded-2xl border border-zinc-800/80 p-4 shadow-xl min-h-[580px]">
            {activeTab === 'editor' && (
              <VideoEditorTab
                project={project}
                setProject={setProject}
                onOpenExportModal={() => setIsExportModalOpen(true)}
              />
            )}

            {activeTab === 'srt' && (
              <SrtEditorTab
                cues={cues}
                setCues={setCues}
                currentTime={currentTime}
                onSeek={(t) => setCurrentTime(t)}
                subtitleConfig={subtitleConfig}
                setSubtitleConfig={setSubtitleConfig}
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                undoCount={undoCount}
                redoCount={redoCount}
              />
            )}

            {activeTab === 'tts' && (
              <TtsVoiceoverTab
                cues={cues}
                setCues={setCues}
                ttsSettings={ttsSettings}
                setTtsSettings={setTtsSettings}
                onSeek={(t) => setCurrentTime(t)}
              />
            )}

            {activeTab === 'ai' && (
              <AiRecapTab
                cues={cues}
                setCues={setCues}
                projectTitle={project.title}
                setProjectTitle={(t) => setProject((p) => ({ ...p, title: t }))}
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'vocal' && (
              <VocalRemoverTab videoUrl={project.videoUrl} />
            )}

            {activeTab === 'translate' && (
              <TranslatorTab
                cues={cues}
                setCues={setCues}
                setActiveTab={setActiveTab}
                undo={undo}
                redo={redo}
                canUndo={canUndo}
                canRedo={canRedo}
                undoCount={undoCount}
                redoCount={redoCount}
              />
            )}
          </div>
        </div>
      </main>

      {/* Floating Action Feedback Toast */}
      {actionToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-zinc-700/80 text-zinc-200 px-3.5 py-2 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-khmer animate-in fade-in slide-in-from-bottom-2">
          {actionToast.toLowerCase().includes('undo') ? (
            <Undo2 className="w-3.5 h-3.5 text-amber-400" />
          ) : actionToast.toLowerCase().includes('redo') ? (
            <Redo2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          )}
          <span>{actionToast}</span>
        </div>
      )}

      {/* Global Master Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
        cues={cues}
      />
    </div>
  );
}
