import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Voice-note transcription for the WhatsApp bot (VN-01/02).
 *
 * Flow: Meta gives us a media *id* in the webhook. We resolve it to a
 * short-lived download URL, fetch the audio (OGG/Opus), then transcribe with
 * Groq's free Whisper endpoint (`whisper-large-v3`, OpenAI-compatible API).
 *
 * Returns null when unconfigured (no GROQ/WA token) or on any failure, so the
 * caller can fall back to a friendly "please type it" message.
 */
@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly waToken: string;
  private readonly groqKey: string;
  private static readonly GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';
  private static readonly GRAPH = 'https://graph.facebook.com/v19.0';
  // Meta caps voice notes; we also refuse anything over ~16MB (~5 min Opus).
  private static readonly MAX_BYTES = 16 * 1024 * 1024;

  constructor(private config: ConfigService) {
    this.waToken = config.get<string>('WA_ACCESS_TOKEN', '');
    this.groqKey = config.get<string>('GROQ_API_KEY', '');
  }

  get isConfigured(): boolean {
    return !!this.waToken && !!this.groqKey;
  }

  async transcribe(mediaId: string): Promise<string | null> {
    if (!this.isConfigured) {
      this.logger.warn('Voice transcription skipped — WA_ACCESS_TOKEN or GROQ_API_KEY not set');
      return null;
    }
    try {
      const audio = await this.downloadMedia(mediaId);
      if (!audio) return null;
      return await this.transcribeWithGroq(audio);
    } catch (err) {
      this.logger.error('Voice transcription failed', err as Error);
      return null;
    }
  }

  private async downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mime: string } | null> {
    // Step 1: resolve media id → temporary URL
    const metaRes = await fetch(`${VoiceService.GRAPH}/${mediaId}`, {
      headers: { Authorization: `Bearer ${this.waToken}` },
    });
    if (!metaRes.ok) {
      this.logger.warn(`Failed to resolve media ${mediaId}: HTTP ${metaRes.status}`);
      return null;
    }
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!meta.url) return null;
    if (meta.file_size && meta.file_size > VoiceService.MAX_BYTES) {
      this.logger.warn(`Voice note too large: ${meta.file_size} bytes`);
      return null;
    }

    // Step 2: download the binary (same bearer token required)
    const binRes = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${this.waToken}` },
    });
    if (!binRes.ok) {
      this.logger.warn(`Failed to download media: HTTP ${binRes.status}`);
      return null;
    }
    const arrayBuf = await binRes.arrayBuffer();
    if (arrayBuf.byteLength > VoiceService.MAX_BYTES) return null;
    return { buffer: Buffer.from(arrayBuf), mime: meta.mime_type ?? 'audio/ogg' };
  }

  private async transcribeWithGroq(audio: { buffer: Buffer; mime: string }): Promise<string | null> {
    const form = new FormData();
    form.append('model', 'whisper-large-v3');
    form.append('language', 'id');
    form.append('response_format', 'text');
    const ext = audio.mime.includes('mpeg') ? 'mp3' : 'ogg';
    form.append(
      'file',
      new Blob([new Uint8Array(audio.buffer)], { type: audio.mime }),
      `voice.${ext}`,
    );

    const res = await fetch(VoiceService.GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.groqKey}` },
      body: form,
    });
    if (!res.ok) {
      this.logger.warn(`Groq transcription failed: HTTP ${res.status}`);
      return null;
    }
    const text = (await res.text()).trim();
    return text || null;
  }
}
