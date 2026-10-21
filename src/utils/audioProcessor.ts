/**
 * Audio processing tools for Vocal Separation, Web Audio DSP, and Voiceover Synthesis
 */

let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
}

/**
 * Converts an AudioBuffer into a standard 16-bit PCM WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array[];
  if (numChannels === 2) {
    result = [buffer.getChannelData(0), buffer.getChannelData(1)];
  } else {
    result = [buffer.getChannelData(0), buffer.getChannelData(0)];
  }

  const length = buffer.length * 2 * 2; // 2 channels * 2 bytes per sample
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  /* RIFF chunk descriptor */
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  /* fmt sub-chunk */
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, 2, true); // 2 channels
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 4, true); // byte rate (sampleRate * 2 * 16/8)
  view.setUint16(32, 4, true); // block align
  view.setUint16(34, bitDepth, true);
  /* data sub-chunk */
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write interleaved 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < 2; channel++) {
      let sample = result[channel][i];
      // clamp to [-1, 1]
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Real-time Vocal Separator Processor
 * Uses Center-Channel Extraction & Cancellation (Mid/Side processing)
 * with low-frequency bass preservation.
 */
export function processVocalSeparation(
  sourceBuffer: AudioBuffer,
  options: {
    mode: 'karaoke' | 'vocals_only' | 'all';
    vocalGain?: number;
    bgmGain?: number;
    centerCut?: number;
  }
): AudioBuffer {
  const ctx = getAudioContext();
  const sampleRate = sourceBuffer.sampleRate;
  const numChannels = sourceBuffer.numberOfChannels;
  const length = sourceBuffer.length;

  const leftChannel = sourceBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? sourceBuffer.getChannelData(1) : sourceBuffer.getChannelData(0);

  const outBuffer = ctx.createBuffer(2, length, sampleRate);
  const outL = outBuffer.getChannelData(0);
  const outR = outBuffer.getChannelData(1);

  const mode = options.mode;
  const vocalGain = options.vocalGain ?? 1.0;
  const bgmGain = options.bgmGain ?? 1.0;

  // Simple IIR low-pass filter to preserve bass/kick in karaoke mode (under ~180Hz)
  let prevL = 0;
  let prevR = 0;
  const alpha = 0.08; // cutoff approx 150-200Hz

  for (let i = 0; i < length; i++) {
    const l = leftChannel[i];
    const r = rightChannel[i];

    // Low-frequency component (bass/kick drum is usually center panned but should be retained)
    const bassL = prevL + alpha * (l - prevL);
    const bassR = prevR + alpha * (r - prevR);
    prevL = bassL;
    prevR = bassR;

    // Mid = center channel (where lead vocals reside)
    const mid = (l + r) * 0.5;
    // Side = stereo wide instrumentals
    const side = (l - r) * 0.5;

    if (mode === 'karaoke') {
      // Remove center vocal, keep stereo sides and preserved low-end bass
      outL[i] = (side + bassL * 0.8) * bgmGain;
      outR[i] = (-side + bassR * 0.8) * bgmGain;
    } else if (mode === 'vocals_only') {
      // Isolate center vocals and subtract side instruments
      const cleanVocal = (mid - Math.abs(side) * 0.5) * vocalGain;
      outL[i] = cleanVocal;
      outR[i] = cleanVocal;
    } else {
      // Custom mix
      const vocalComponent = mid * vocalGain;
      const bgmComponent = (side + (l - mid) * 0.5) * bgmGain;
      outL[i] = bgmComponent + vocalComponent;
      outR[i] = -bgmComponent + vocalComponent;
    }
  }

  return outBuffer;
}

/**
 * Free Local Browser Speech Synthesis (Fast STT & TTS for low-spec machines)
 */
export function speakLocalText(
  text: string,
  options: {
    speakerRole?: 'narrator' | 'male' | 'female' | string;
    rate?: number;
    pitch?: number;
    lang?: string;
  } = {}
): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported in this browser');
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();

    // Find suitable voice
    const khmerVoice = voices.find((v) => v.lang.startsWith('km') || v.lang.includes('Khmer'));
    const englishVoice = voices.find((v) => v.lang.startsWith('en'));

    utterance.voice = khmerVoice || englishVoice || voices[0] || null;

    // Adjust pitch and rate depending on speaker role
    const role = options.speakerRole || 'narrator';
    let basePitch = options.pitch || 1.0;
    let baseRate = options.rate || 1.0;

    if (role === 'male') {
      basePitch = 0.85; // Deeper male pitch
      baseRate = 0.95;
    } else if (role === 'female') {
      basePitch = 1.25; // Higher female pitch
      baseRate = 1.05;
    } else if (role === 'narrator') {
      basePitch = 0.92; // Narrative resonance
      baseRate = 1.0;
    }

    utterance.pitch = basePitch;
    utterance.rate = baseRate;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Play a base64 WAV or Audio URL
 */
export function playAudioUrl(url: string, volume = 1.0): HTMLAudioElement {
  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.play().catch((e) => console.warn('Audio play prevented:', e));
  return audio;
}

/**
 * Creates a procedural cinematic ambient BGM loop for movie recaps using Web Audio
 */
export function generateProceduralBgm(ctx: AudioContext, durationSeconds = 30): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, sampleRate * durationSeconds, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Cinematic drone chords (D minor: D2, A2, F3, C4)
  const freqs = [73.42, 110.0, 174.61, 261.63];

  for (let i = 0; i < buffer.length; i++) {
    const t = i / sampleRate;
    let valL = 0;
    let valR = 0;

    for (let f = 0; f < freqs.length; f++) {
      const freq = freqs[f];
      // Slow pulse modulation
      const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.15 * t + f);
      // Saw/Sine blend with slight detune between left and right
      const oscL = Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(2 * Math.PI * (freq * 1.003) * t) * 0.4;
      const oscR = Math.sin(2 * Math.PI * (freq * 0.997) * t) * 0.6 + Math.sin(2 * Math.PI * freq * t) * 0.4;

      valL += oscL * mod * 0.08;
      valR += oscR * mod * 0.08;
    }

    // Add cinematic low heart-beat thud every 2 seconds
    const beatPhase = (t % 2.0);
    if (beatPhase < 0.2) {
      const beatEnv = Math.exp(-beatPhase * 15);
      const sub = Math.sin(2 * Math.PI * 45 * beatPhase) * beatEnv * 0.25;
      valL += sub;
      valR += sub;
    }

    left[i] = Math.max(-0.9, Math.min(0.9, valL));
    right[i] = Math.max(-0.9, Math.min(0.9, valR));
  }

  return buffer;
}
