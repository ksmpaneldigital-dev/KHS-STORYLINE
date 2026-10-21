import { SubtitleCue, SpeakerRole } from '../types';

/**
 * Converts seconds to SRT time format: "00:01:23,456"
 */
export function secondsToSrtTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const millis = Math.floor((seconds % 1) * 1000);

  const pad = (n: number, z = 2) => ('00' + n).slice(-z);
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(millis, 3)}`;
}

/**
 * Converts SRT time format "00:01:23,456" or "00:01:23.456" to seconds
 */
export function srtTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().replace('.', ',');
  const parts = clean.split(':');
  if (parts.length < 3) return 0;

  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const secParts = parts[2].split(',');
  const seconds = parseInt(secParts[0], 10) || 0;
  const millis = parseInt(secParts[1], 10) || 0;

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}

/**
 * Detects speaker role from text e.g. "[ប្រុស] សួស្តី", "[ស្រី] ចាស", "[អ្នករៀបរាប់]..."
 */
export function detectSpeaker(text: string): { speaker: SpeakerRole | string; label: string; cleanText: string } {
  const match = text.match(/^\[(.*?)\]\s*(.*)$/s) || text.match(/^【(.*?)】\s*(.*)$/s) || text.match(/^(ប្រុស|ស្រី|អ្នករៀបរាប់|អ្នកនិទាន|តួឯក|Narrator|Male|Female):\s*(.*)$/is);

  if (match) {
    const rawTag = match[1].trim();
    const clean = match[2].trim();
    const lower = rawTag.toLowerCase();

    if (rawTag.includes('ស្រី') || lower.includes('female') || lower.includes('woman') || lower.includes('girl')) {
      return { speaker: 'female', label: rawTag || 'ស្រី', cleanText: clean };
    }
    if (rawTag.includes('ប្រុស') || lower.includes('male') || lower.includes('man') || lower.includes('boy')) {
      return { speaker: 'male', label: rawTag || 'ប្រុស', cleanText: clean };
    }
    if (rawTag.includes('រៀបរាប់') || rawTag.includes('និទាន') || lower.includes('narrat') || lower.includes('voiceover')) {
      return { speaker: 'narrator', label: rawTag || 'អ្នករៀបរាប់', cleanText: clean };
    }
    return { speaker: 'character', label: rawTag, cleanText: clean };
  }

  return { speaker: 'narrator', label: 'អ្នករៀបរាប់', cleanText: text.trim() };
}

/**
 * Parses raw SRT string into SubtitleCue objects
 */
export function parseSrt(srtContent: string): SubtitleCue[] {
  if (!srtContent || !srtContent.trim()) return [];

  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/).filter((b) => b.trim().length > 0);

  const cues: SubtitleCue[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIndex = 1;
    let indexNumber = parseInt(lines[0].trim(), 10);
    if (isNaN(indexNumber)) {
      // Sometimes block doesn't start with index number
      timeLineIndex = 0;
      indexNumber = i + 1;
    }

    const timeLine = lines[timeLineIndex];
    if (!timeLine || !timeLine.includes('-->')) continue;

    const [startStr, endStr] = timeLine.split('-->').map((s) => s.trim());
    const startSec = srtTimeToSeconds(startStr);
    const endSec = srtTimeToSeconds(endStr);

    const textLines = lines.slice(timeLineIndex + 1).join('\n').trim();
    const { speaker, label, cleanText } = detectSpeaker(textLines);

    cues.push({
      id: 'cue_' + Math.random().toString(36).substr(2, 9),
      index: i + 1,
      startTime: secondsToSrtTime(startSec),
      endTime: secondsToSrtTime(endSec),
      startSeconds: startSec,
      endSeconds: endSec,
      speaker: speaker,
      speakerLabel: label,
      text: cleanText || textLines,
    });
  }

  return cues;
}

/**
 * Formats SubtitleCue[] back to standard SRT string
 */
export function formatToSrt(cues: SubtitleCue[], includeSpeakerTags = true): string {
  return cues
    .map((cue, idx) => {
      const speakerPrefix = includeSpeakerTags && cue.speakerLabel ? `[${cue.speakerLabel}] ` : '';
      return `${idx + 1}\n${cue.startTime} --> ${cue.endTime}\n${speakerPrefix}${cue.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Formats SubtitleCue[] to WebVTT string
 */
export function formatToVtt(cues: SubtitleCue[]): string {
  const srtBody = cues
    .map((cue, idx) => {
      const vttStart = cue.startTime.replace(',', '.');
      const vttEnd = cue.endTime.replace(',', '.');
      const speakerPrefix = cue.speakerLabel ? `[${cue.speakerLabel}] ` : '';
      return `${idx + 1}\n${vttStart} --> ${vttEnd}\n${speakerPrefix}${cue.text.trim()}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${srtBody}`;
}

/**
 * Formats SubtitleCue[] to clean script text
 */
export function formatToScriptText(cues: SubtitleCue[]): string {
  return cues
    .map((cue) => {
      return `[${cue.speakerLabel || 'អ្នករៀបរាប់'}] (${cue.startTime.slice(3, 8)}): ${cue.text}`;
    })
    .join('\n\n');
}

/**
 * Shifts all cues by deltaSeconds (can be positive or negative)
 */
export function shiftCuesTime(cues: SubtitleCue[], deltaSeconds: number): SubtitleCue[] {
  return cues.map((cue) => {
    const newStart = Math.max(0, cue.startSeconds + deltaSeconds);
    const newEnd = Math.max(newStart + 0.5, cue.endSeconds + deltaSeconds);
    return {
      ...cue,
      startSeconds: newStart,
      endSeconds: newEnd,
      startTime: secondsToSrtTime(newStart),
      endTime: secondsToSrtTime(newEnd),
    };
  });
}
