import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// 1. API: Generate Movie Recap Script (Tool សម្រាយរឿង)
app.post('/api/gemini/recap-script', async (req, res) => {
  try {
    const { title, genre, synopsis, tone, durationMinutes = 3 } = req.body;

    const prompt = `You are a legendary movie recap screenwriter and voiceover director (អ្នកជំនាញសម្រាយរឿង និងនិពន្ធស្គ្រីបអធិប្បាយភាពយន្តលំដាប់អាជីពជាភាសាខ្មែរ).
Create a complete, captivating movie recap script for:
Movie Title: "${title || 'ភាពយន្តអាថ៌កំបាំង'}"
Genre: "${genre || 'Action / Thriller'}"
Plot / Key Notes: "${synopsis || 'សាច់រឿងគួរឱ្យចាប់អារម្មណ៍'}"
Tone: "${tone || 'អធិប្បាយរំភើប ភ័យរន្ធត់ កាត់ឆ្មក់ Hook ទាក់ទាញ'}"
Target Duration: approx ${durationMinutes} minutes.

Requirements:
1. Write the script entirely in natural, expressive, modern Khmer language (ភាសាខ្មែរ).
2. Start with a viral, psychological hook ("តើអ្នកធ្លាប់គិតទេថា...", "រឿងរ៉ាវមិនគួរឱ្យជឿមួយបានកើតឡើង...", etc.).
3. Structure dialogues and narration by clearly tagging speakers:
   - [អ្នករៀបរាប់] (Main recap storyteller / Narrator)
   - [ប្រុស] (Male character dialogue / Main male lead)
   - [ស្រី] (Female character dialogue / Female lead)
4. Provide structured JSON output with:
   - "title": Title in Khmer
   - "hook": The hook opening statement
   - "summary": Quick 2-sentence synopsis
   - "fullScriptText": Complete clean script text with speaker tags
   - "cues": Array of subtitle cues, each with:
     - "index": number
     - "speaker": "អ្នករៀបរាប់" | "ប្រុស" | "ស្រី"
     - "startTime": "00:00:00,000" formatted string
     - "endTime": "00:00:04,500" formatted string
     - "text": Khmer speech line
Return pure JSON only without markdown code blocks.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Fallback clean markdown if any
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      data = JSON.parse(cleaned);
    }

    res.json({ success: true, data });
  } catch (err: any) {
    console.error('Error in /api/gemini/recap-script:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to generate recap script' });
  }
});

// 2. API: Transcribe Audio using Gemini (Audio to Text & SRT)
app.post('/api/gemini/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/mp3', language = 'Khmer' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ success: false, error: 'audioBase64 is required' });
    }

    const audioPart = {
      inlineData: {
        mimeType: mimeType,
        data: audioBase64,
      },
    };

    const promptText = `Listen carefully to this audio. Transcribe everything spoken word-for-word into ${language} (or detect original speech and translate/transcribe into natural Khmer if specified).
Format the output as a valid SRT subtitle string with index numbers, accurate timestamps (HH:MM:SS,mmm --> HH:MM:SS,mmm), speaker tag prefix like [ប្រុស], [ស្រី], or [អ្នករៀបរាប់], and the spoken Khmer text.
Also return a JSON object with:
{
  "fullTranscript": "complete text",
  "srt": "1\\n00:00:01,000 --> 00:00:04,500\\n[អ្នករៀបរាប់] សួស្តីប្រិយមិត្ត...\\n\\n2\\n..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [audioPart, { text: promptText }],
      },
    });

    const raw = response.text || '';
    let parsed: any = null;
    try {
      const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { fullTranscript: raw, srt: raw };
    }

    res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error('Error in /api/gemini/transcribe:', err);
    res.status(500).json({ success: false, error: err.message || 'Transcription failed' });
  }
});

// 3. API: Universal SRT & Text Translator (បកប្រែ SRT & Text File)
app.post('/api/gemini/translate-srt', async (req, res) => {
  try {
    const { srtContent, targetLang = 'Khmer', sourceLang = 'Auto', tone = 'Natural Cinematic Movie Recap' } = req.body;

    if (!srtContent) {
      return res.status(400).json({ success: false, error: 'srtContent is required' });
    }

    const prompt = `You are a professional film localization translator and subtitle master.
Translate the following SRT subtitles from ${sourceLang} into ${targetLang} (ភាសាខ្មែរ if target is Khmer).
Style / Tone: ${tone}. Keep dialogues conversational, lively, dramatic, and natural for movie recaps and movie dubbing.

CRITICAL INSTRUCTIONS:
1. You MUST strictly preserve all cue numbers and timestamp lines EXACTLY as they are (e.g. "00:01:23,456 --> 00:01:27,890"). Do NOT alter the timestamps or sequence numbers.
2. If speaker tags exist (e.g. [ប្រុស], [ស្រី], [អ្នករៀបរាប់], [Man], [Woman]), preserve or adapt them into natural speaker tags.
3. Return ONLY the translated SRT text content, without markdown code fences or conversational explanation.

INPUT SRT CONTENT:
${srtContent}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    const translatedSrt = (response.text || '').replace(/^```srt\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();

    res.json({ success: true, translatedSrt });
  } catch (err: any) {
    console.error('Error in /api/gemini/translate-srt:', err);
    res.status(500).json({ success: false, error: err.message || 'Translation failed' });
  }
});

// 3.1 API: Bulk Translate Subtitle Cues (structured array)
app.post('/api/gemini/translate-cues', async (req, res) => {
  try {
    const {
      cues = [],
      targetLang = 'Khmer (ភាសាខ្មែរ)',
      sourceLang = 'Auto Detect',
      tone = 'Natural Cinematic Movie Recap',
      aiProvider = 'gemini-3.8-flash',
    } = req.body;

    if (!Array.isArray(cues) || cues.length === 0) {
      return res.status(400).json({ success: false, error: 'cues array is required' });
    }

    const prompt = `You are an elite film localization translator and subtitle master.
Translate all of the following subtitle cues from ${sourceLang} into ${targetLang}.
If target is Khmer, translate into natural, modern, captivating conversational Khmer (ភាសាខ្មែរ) suitable for movie recaps and dubbing.
Style / Tone: ${tone}.

Input Cues:
${JSON.stringify(cues.map((c: any) => ({ id: c.id, index: c.index, speaker: c.speakerLabel || c.speaker, text: c.text })))}

CRITICAL REQUIREMENTS:
1. Translate each cue faithfully according to context and tone.
2. Adapt speaker labels if helpful (e.g., [Narrator] -> [អ្នករៀបរាប់], [Male] -> [ប្រុស], [Female] -> [ស្រី], or target language equivalent).
3. Return a JSON array of objects in the EXACT same order and with the exact matching "id":
[
  {
    "id": "cue_id",
    "translatedSpeaker": "speaker name in target language",
    "translatedText": "translated text line"
  }
]
Return pure JSON array only without markdown backticks.`;

    const modelName = aiProvider === 'gemini-3.1-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '[]';
    let results: any[] = [];
    try {
      results = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      results = JSON.parse(cleaned);
    }

    res.json({ success: true, results });
  } catch (err: any) {
    console.error('Error in /api/gemini/translate-cues:', err);
    res.status(500).json({ success: false, error: err.message || 'Bulk cues translation failed' });
  }
});

// 4. API: High-Quality Gemini TTS (Text To Speech)
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      speakerRole = 'narrator',
      style = 'Clear, engaging movie recap narrator with cinematic rhythm',
    } = req.body;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, error: 'Text is required for TTS' });
    }

    // Voice options: 'Kore' (Female/Warm), 'Puck' (Energetic Male), 'Charon' (Deep Male Dramatic), 'Fenrir' (Intense Male), 'Zephyr' (Calm Female)
    const validVoices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voiceName) ? voiceName : (speakerRole === 'male' ? 'Charon' : speakerRole === 'female' ? 'Kore' : 'Puck');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: style,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.status(500).json({ success: false, error: 'No audio returned from Gemini TTS' });
    }

    res.json({
      success: true,
      audioBase64: base64Audio,
      mimeType: 'audio/wav',
      voiceName: chosenVoice,
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/tts:', err);
    res.status(500).json({ success: false, error: err.message || 'TTS generation failed' });
  }
});

// Vite or Static handling
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CineRecap Studio server running on http://0.0.0.0:${port}`);
  });
}

startServer();
