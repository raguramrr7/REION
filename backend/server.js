import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq, { toFile } from 'groq-sdk';

dotenv.config();

/* ─── Validate API key on startup ──────────────────────────────────────── */
if (!process.env.GROQ_API_KEY) {
  console.error('\n❌  GROQ_API_KEY is missing in backend/.env — please add it and restart.\n');
  process.exit(1);
}

/* ─── Groq client ───────────────────────────────────────────────────────── */
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ─── Per-session conversation memory (lives until server restarts) ────── */
// This gives you the "long context till exiting" behavior you asked for.
const sessions = new Map(); // session_id → Message[]

const SYSTEM_PROMPT = `You are REION — a fast, intelligent, voice-first AI assistant.
Keep responses concise (1-4 sentences) and conversational since they will be spoken aloud.
Do not use markdown formatting, bullet points, or symbols in your response.
Be direct and helpful.`;

/* ─── Express app ───────────────────────────────────────────────────────── */

/* ─── Express app ───────────────────────────────────────────────────────── */
const app = express();

app.use(cors({ origin: '*' })); // Allow all origins for production
app.use(express.json());

/* ─── Multer — audio files into memory buffer ───────────────────────────── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 25 * 1024 * 1024 }, // 25 MB max (Groq limit)
});

/* ═══════════════════════════════════════════════════════════════════════════
   POST /voice  ←  the main pipeline
   Body: FormData { audio: <webm file>, session_id: string }
   ═══════════════════════════════════════════════════════════════════════════ */
app.post('/voice', upload.single('audio'), async (req, res) => {
  const sessionId  = req.body?.session_id || 'default';
  const audioBuffer = req.file?.buffer;

  if (!audioBuffer || audioBuffer.length === 0) {
    return res.status(400).json({ error: 'No audio data received.' });
  }

  console.log(`\n▶ [${sessionId}] Audio received (${(audioBuffer.length / 1024).toFixed(1)} KB)`);

  try {
    /* ── Step 2: STT — Whisper Large V3 Turbo (In Memory) ────────── */
    console.log(`  🎙  Transcribing with Whisper (${req.file.mimetype})...`);
    const fileForGroq = await toFile(audioBuffer, req.file.originalname || 'audio.webm', { type: req.file.mimetype || 'audio/webm' });
    
    const transcription = await groq.audio.transcriptions.create({
      file:            fileForGroq,
      model:           'whisper-large-v3-turbo',
      response_format: 'json',
      language:        'en',
    });

    const transcript = transcription.text.trim();
    if (!transcript) {
      return res.status(400).json({ error: 'Could not understand audio. Please try again.' });
    }
    console.log(`  ✅ Transcript: "${transcript}"`);

    /* ── Step 3: Get or create session history ──────────────────── */
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, [{ role: 'system', content: SYSTEM_PROMPT }]);
      console.log(`  🆕 New session: ${sessionId}`);
    }
    const history = sessions.get(sessionId);
    history.push({ role: 'user', content: transcript });

    /* ── Step 4: LLM — Llama 3.3 70B on Groq ───────────────────── */
    console.log('  🧠  Generating response with Llama 3.3 70B...');
    const chatCompletion = await groq.chat.completions.create({
      model:       'llama-3.3-70b-versatile',
      messages:    history,
      temperature: 0.7,
      max_tokens:  300,
    });
    const responseText = chatCompletion.choices[0].message.content.trim();
    history.push({ role: 'assistant', content: responseText });

    const tokensUsed = chatCompletion.usage?.total_tokens ?? 0;
    console.log(`  ✅ Response (${tokensUsed} tokens): "${responseText.slice(0, 80)}..."`);

    /* ── Step 5: TTS — Groq Orpheus ─────────────────────────────── */
    const voice = process.env.TTS_VOICE || 'aurora';
    console.log(`  🔊  Generating TTS with Orpheus (voice: ${voice})...`);
    const ttsResponse = await groq.audio.speech.create({
      model:           'canopylabs/orpheus-v1-english',
      input:           responseText,
      voice:           voice,
      response_format: 'wav',
    });

    // Convert audio to base64 to send in JSON payload
    const audioBuffer2  = Buffer.from(await ttsResponse.arrayBuffer());
    const audioBase64 = audioBuffer2.toString('base64');
    console.log(`  ✅ Audio generated (${(audioBuffer2.length / 1024).toFixed(1)} KB)`);

    /* ── Send response to frontend ───────────────────────────────── */
    return res.json({
      transcript,
      response:  responseText,
      audio_base64: audioBase64,
      session_history_length: history.length,
    });

  } catch (err) {
    console.error('  ❌ Pipeline error:', err?.message || err);

    // Give the frontend a useful error
    const status  = err?.status || 500;
    const message = err?.error?.message || err?.message || 'Unknown error';
    return res.status(status).json({ error: message });
  }
});

/* ─── DELETE /session/:id — clear a session's memory ──────────────────── */
app.delete('/session/:id', (req, res) => {
  sessions.delete(req.params.id);
  console.log(`🗑  Session ${req.params.id} cleared.`);
  res.json({ ok: true });
});

/* ─── GET /health — quick sanity check ────────────────────────────────── */
app.get('/health', (req, res) => {
  res.json({
    status:       'ok',
    sessions:     sessions.size,
    groq_key_set: !!process.env.GROQ_API_KEY,
    tts_voice:    process.env.TTS_VOICE || 'aurora',
  });
});

/* ─── Start server ─────────────────────────────────────────────────────── */
const PORT = parseInt(process.env.PORT || '8000', 10);
app.listen(PORT, () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║         REION BACKEND  🚀                ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Server:  http://localhost:${PORT}          ║`);
  console.log(`║  Health:  http://localhost:${PORT}/health   ║`);
  console.log(`║  Voice:   POST /voice                    ║`);
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`  STT Model : whisper-large-v3-turbo`);
  console.log(`  LLM Model : llama-3.3-70b-versatile`);
  console.log(`  TTS Model : orpheus-v1-english (${process.env.TTS_VOICE || 'aurora'})`);
  console.log('\n  Waiting for voice requests...\n');
});
