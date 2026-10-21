import { VideoProject, SubtitleCue } from '../types';

export const INITIAL_SUBTITLE_STYLE = {
  fontFamily: 'Kantumruy Pro' as const,
  fontSize: 28,
  color: '#FFE600', // Yellow cinematic subtitle color
  strokeColor: '#000000',
  strokeWidth: 4,
  bgColor: '#000000',
  bgOpacity: 0.65,
  positionY: 'bottom' as const,
  yOffset: 45,
  isBold: true,
  boxPadding: 10,
  boxRadius: 6,
};

export const DEMO_SRT_TEXT = `1
00:00:01,000 --> 00:00:05,200
[អ្នករៀបរាប់] តើអ្នកធ្លាប់គិតទេថា នៅលើពិភពលោកយើងនេះ មានកោះមួយដែលគ្មាននរណាហ៊ានទៅជិត?

2
00:00:05,500 --> 00:00:09,800
[ប្រុស] កុំទៅជិតច្រាំងថ្មនោះឱ្យសោះ! មានអ្វីមួយកំពុងសំលឹងមើលមកពួកយើងពីក្នុងព្រៃ...

3
00:00:10,200 --> 00:00:14,600
[ស្រី] ខ្ញុំរកឃើញសញ្ញាប្រេកង់វិទ្យុសម្ងាត់ហើយ! មើលចុះ សញ្ញានេះបានផ្ញើចេញតាំងពី ៥០ឆ្នាំមុនម្ល៉េះ!

4
00:00:15,000 --> 00:00:19,800
[អ្នករៀបរាប់] ក្រុមរុករកទាំងបីនាក់ មិនបានដឹងខ្លួនទេថា ការបោះជំហានចូលកោះនេះ គឺជាការសម្រេចចិត្តខុសឆ្គងបំផុតក្នុងឆាកជីវិត!

5
00:00:20,200 --> 00:00:25,500
[ប្រុស] រត់ទៅ! កុំងាកក្រោយឱ្យសោះ ទ្វារល្អាងកំពុងតែបិទជិតហើយ!

6
00:00:26,000 --> 00:00:30,000
[អ្នករៀបរាប់] តើពួកគេអាចរួចរស់ជីវិតចេញពីកោះមរណៈនេះបានដោយរបៀបណា? សូមចុច Like និង Subscribe ដើម្បីទស្សនាភាគបន្ត!`;

export const INITIAL_PROJECT: VideoProject = {
  id: 'proj_sample_01',
  title: 'សម្រាយរឿង៖ អាថ៌កំបាំងកោះមរណៈ (Death Island Recap)',
  videoUrl: '', // Will be initialized with generated cinematic canvas video
  duration: 32,
  aspectRatio: '16:9',
  videoVolume: 0.7,
  voiceoverVolume: 1.0,
  bgmVolume: 0.35,
  filter: 'cinematic',
  watermarkText: 'KHS STORYLINE',
  subtitleConfig: INITIAL_SUBTITLE_STYLE,
  trimStart: 0,
  trimEnd: 32,
};

/**
 * Generates an animated cinematic demo movie clip directly in browser
 * using Canvas + MediaRecorder and returns a playable Blob URL.
 */
export async function createDemoMovieVideo(): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      resolve('');
      return;
    }

    const stream = canvas.captureStream(30);
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch {
        resolve('');
        return;
      }
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };

    recorder.start();

    const totalFrames = 30 * 12; // 12 seconds loop
    let frame = 0;

    const interval = setInterval(() => {
      frame++;
      const t = frame / 30;

      // Draw dramatic cinematic backdrop
      const grad = ctx.createRadialGradient(
        640 + Math.sin(t * 0.8) * 120,
        360 + Math.cos(t * 0.5) * 60,
        50,
        640,
        360,
        700
      );
      grad.addColorStop(0, '#1e1b4b'); // deep indigo
      grad.addColorStop(0.5, '#0f172a'); // slate
      grad.addColorStop(1, '#020617'); // dark midnight
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Atmospheric fog / mystery silhouettes
      ctx.save();
      ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
      ctx.beginPath();
      ctx.moveTo(0, 720);
      for (let x = 0; x <= 1280; x += 40) {
        const y = 480 + Math.sin(x * 0.008 + t * 0.3) * 35 + Math.cos(x * 0.02) * 20;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1280, 720);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Atmospheric floating particles
      for (let p = 0; p < 35; p++) {
        const px = (p * 47 + t * 30 * (1 + (p % 3))) % 1280;
        const py = 720 - (((p * 61 + t * 45) % 650) + 30);
        const pSize = 1.5 + (p % 4);
        ctx.fillStyle = `rgba(224, 231, 255, ${0.15 + (p % 5) * 0.1})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cinematic Letterbox & Center badge
      ctx.fillStyle = 'rgba(244, 63, 94, 0.12)';
      ctx.beginPath();
      ctx.arc(640, 320, 140 + Math.sin(t * 2) * 10, 0, Math.PI * 2);
      ctx.fill();

      // Movie Scene Title in Khmer & English
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px Kantumruy Pro, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 12;
      ctx.fillText('🎬 ឈុតភាពយន្តគំរូ ៖ អាថ៌កំបាំងកោះមរណៈ', 640, 310);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 20px Inter, Kantumruy Pro, sans-serif';
      ctx.fillText(`SCENE 01 / RECAP PREVIEW  •  TIMECODE: 00:00:${('0' + Math.floor(t)).slice(-2)}`, 640, 355);

      // Camera HUD overlay
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(60, 50, 1160, 620);

      // REC indicator
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(100, 90, 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f87171';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('REC 4K UHD 60FPS', 120, 96);

      ctx.fillStyle = '#38bdf8';
      ctx.textAlign = 'right';
      ctx.fillText('AUDIO: STEREO 48kHz', 1180, 96);

      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 1000 / 30);
  });
}
