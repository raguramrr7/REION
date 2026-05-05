import { useCallback, useEffect, useRef } from 'react';
import { OrbState } from '../types/voice';
import { useVoiceStore } from '../store/voiceStore';

const SILENCE_THRESHOLD = 6;    // RMS level below which we consider silence
const SILENCE_TIMEOUT   = 2000; // ms of silence before auto-stop

export function useVoice() {
  const store = useVoiceStore();

  /* ── Stable refs — no stale closure issues ───────────────────────────── */
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef           = useRef<number>(0);
  const isRecordingRef   = useRef(false);

  /* stopListening as a stable ref so silence-timer can call it safely */
  const stopListeningRef = useRef<() => Promise<void>>(undefined);

  /* ── Level meter loop (runs while recording) ─────────────────────────── */
  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);

    const loop = () => {
      if (!isRecordingRef.current) return;
      analyser.getByteTimeDomainData(buf);

      // Root Mean Square → 0-100 level
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms   = Math.sqrt(sum / buf.length);
      const level = Math.min(Math.round(rms * 500), 100);
      store.setAudioLevel(level);

      // Silence detection
      if (rms * 500 < SILENCE_THRESHOLD) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (isRecordingRef.current) stopListeningRef.current?.();
          }, SILENCE_TIMEOUT);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  /* ── startListening ──────────────────────────────────────────────────── */
  const startListening = useCallback(async () => {
    if (isRecordingRef.current) return;

    console.log('[REION] Starting voice capture...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio
      const ctx      = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      // Pick a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100);

      mediaRecorderRef.current = mr;
      isRecordingRef.current   = true;

      store.setIsRecording(true);
      store.setOrbState(OrbState.LISTENING);
      store.clearTranscript();
      startLevelMeter();

      console.log('[REION] Recording started, mimeType:', mimeType || 'browser default');
    } catch (err) {
      console.error('[REION] Mic error:', err);
      store.setOrbState(OrbState.ERROR);
      setTimeout(() => store.setOrbState(OrbState.IDLE), 2500);
    }
  }, [startLevelMeter]);

  /* ── stopListening ───────────────────────────────────────────────────── */
  const stopListening = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    console.log('[REION] Stopping recording...');

    // Stop level meter
    cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    store.setAudioLevel(0);
    store.setIsRecording(false);

    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') {
      store.setOrbState(OrbState.IDLE);
      return;
    }

    // Collect audio blob
    const blob: Blob = await new Promise((resolve) => {
      mr.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        resolve(b);
      };
      mr.stop();
    });

    // Cleanup stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});

    console.log(`[REION] Audio captured: ${(blob.size / 1024).toFixed(1)} KB`);

    if (blob.size < 1000) {
      console.warn('[REION] Audio too small — likely silence, skipping.');
      store.setOrbState(OrbState.IDLE);
      return;
    }

    store.setOrbState(OrbState.THINKING);

    // ── Send to backend ────────────────────────────────────────────────
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const sessionId = getOrCreateSessionId();

      const ext = blob.type.includes('mp4') || blob.type.includes('m4a') ? 'm4a' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `recording.${ext}`);
      fd.append('session_id', sessionId);

      console.log(`[REION] Sending to ${apiBase}/voice ...`);

      const res = await fetch(`${apiBase}/voice`, {
        method: 'POST',
        body:   fd,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const data = await res.json() as {
        transcript: string;
        response:   string;
        audio_base64?: string;
      };

      console.log('[REION] Got response:', data.transcript, '→', data.response.slice(0, 60));

      store.setTranscript({ user: data.transcript, assistant: data.response });
      store.setOrbState(OrbState.SPEAKING);

      if (data.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        audio.onended = () => {
          store.setOrbState(OrbState.IDLE);
          setTimeout(() => useVoiceStore.getState().clearTranscript(), 1500);
        };
        audio.onerror = (e) => {
          console.error('[REION] Audio playback error:', e);
          store.setOrbState(OrbState.IDLE);
          setTimeout(() => useVoiceStore.getState().clearTranscript(), 2000);
        };
        audio.play().catch((e) => {
          console.error('[REION] play() blocked:', e);
          // Fallback: auto-dismiss after reading time
          const readMs = Math.max(3000, data.response.length * 50);
          setTimeout(() => {
            store.setOrbState(OrbState.IDLE);
            setTimeout(() => useVoiceStore.getState().clearTranscript(), 1500);
          }, readMs);
        });
      } else {
        const readMs = Math.max(3000, data.response.length * 50);
        setTimeout(() => {
          store.setOrbState(OrbState.IDLE);
          setTimeout(() => useVoiceStore.getState().clearTranscript(), 1500);
        }, readMs);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[REION] Backend error:', msg);
      store.setTranscript({ user: null, assistant: `Error: ${msg}` });
      store.setOrbState(OrbState.ERROR);
      setTimeout(() => {
        store.setOrbState(OrbState.IDLE);
        setTimeout(() => useVoiceStore.getState().clearTranscript(), 1000);
      }, 3000);
    }
  }, []);

  /* Keep stopListeningRef in sync */
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);

  /* ── Toggle ──────────────────────────────────────────────────────────── */
  const toggleListening = useCallback(() => {
    if (isRecordingRef.current) stopListening();
    else                         startListening();
  }, [startListening, stopListening]);

  /* ── Space bar shortcut ──────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleListening]);

  return {
    analyserRef,       // expose as ref so App can read it fresh at any time
    toggleListening,
    startListening,
    stopListening,
  };
}

/* ── Session ID (persists for tab lifetime) ─────────────────────────── */
function getOrCreateSessionId(): string {
  const KEY = 'reion_session_id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
