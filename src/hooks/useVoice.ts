import { useCallback, useEffect, useRef } from 'react';
import { OrbState } from '../types/voice';
import { useVoiceStore } from '../store/voiceStore';

const SILENCE_THRESHOLD = 8;   // RMS threshold to detect silence
const SILENCE_TIMEOUT   = 1800; // ms of silence before auto-stop

export function useVoice() {
  const { setOrbState, setAudioLevel, setIsRecording, setTranscript, clearTranscript } = useVoiceStore();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const sourceRef        = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef        = useRef<MediaStream | null>(null);
  const silenceTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef           = useRef<number>(0);
  const isRecording      = useRef(false);

  /* ── Level meter (runs during recording) ────────────────────────────── */
  const startLevelMeter = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.fftSize);

    const loop = () => {
      analyser.getByteTimeDomainData(buf);
      // RMS
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const level = Math.round(Math.min(rms * 500, 100));
      setAudioLevel(level);

      // Silence detection
      if (rms * 500 < SILENCE_THRESHOLD) {
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            if (isRecording.current) stopListening();
          }, SILENCE_TIMEOUT);
        }
      } else {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      }

      if (isRecording.current) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  /* ── Start ───────────────────────────────────────────────────────────── */
  const startListening = useCallback(async () => {
    if (isRecording.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Web Audio setup
      const ctx      = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source   = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioCtxRef.current  = ctx;
      analyserRef.current  = analyser;
      sourceRef.current    = source;

      // MediaRecorder
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100); // collect chunks every 100ms

      mediaRecorderRef.current = mr;
      isRecording.current      = true;

      setIsRecording(true);
      setOrbState(OrbState.LISTENING);
      clearTranscript();
      startLevelMeter();

    } catch (err) {
      console.error('[useVoice] mic error:', err);
      setOrbState(OrbState.ERROR);
      setTimeout(() => setOrbState(OrbState.IDLE), 2500);
    }
  }, [startLevelMeter, setOrbState, setIsRecording, clearTranscript]);

  /* ── Stop ────────────────────────────────────────────────────────────── */
  const stopListening = useCallback(async () => {
    if (!isRecording.current) return;
    isRecording.current = false;

    // Stop meter
    cancelAnimationFrame(rafRef.current);
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    setAudioLevel(0);
    setIsRecording(false);

    // Stop recorder & collect audio
    const mr = mediaRecorderRef.current;
    if (!mr) return;

    const blob: Blob = await new Promise((resolve) => {
      mr.onstop = () => resolve(new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' }));
      mr.stop();
    });

    // Stop stream tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();

    setOrbState(OrbState.THINKING);

    // ── Send to backend ───────────────────────────────────────────────
    try {
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      fd.append('session_id', getOrCreateSessionId());

      const res  = await fetch(`${import.meta.env.VITE_API_BASE_URL}/voice`, {
        method: 'POST',
        body:   fd,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json() as { transcript: string; response: string; audio_url?: string };

      setTranscript({ user: data.transcript, assistant: data.response });
      setOrbState(OrbState.SPEAKING);

      // Play TTS audio if provided
      if (data.audio_url) {
        const audio = new Audio(`${import.meta.env.VITE_API_BASE_URL}${data.audio_url}`);
        audio.onended = () => {
          setOrbState(OrbState.IDLE);
          setTimeout(() => {
            useVoiceStore.getState().clearTranscript();
          }, 1200);
        };
        audio.play().catch(console.error);
      } else {
        // No audio — just show text then reset
        setTimeout(() => {
          setOrbState(OrbState.IDLE);
          setTimeout(() => useVoiceStore.getState().clearTranscript(), 1200);
        }, Math.max(2000, data.response.length * 55));
      }

    } catch (err) {
      console.error('[useVoice] backend error:', err);
      setOrbState(OrbState.ERROR);
      setTimeout(() => setOrbState(OrbState.IDLE), 2500);
    }
  }, [setOrbState, setAudioLevel, setIsRecording, setTranscript]);

  /* ── Toggle ──────────────────────────────────────────────────────────── */
  const toggleListening = useCallback(() => {
    if (isRecording.current) stopListening();
    else                      startListening();
  }, [startListening, stopListening]);

  /* ── Space bar shortcut ───────────────────────────────────────────────── */
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
    analyser: analyserRef.current,
    startListening,
    stopListening,
    toggleListening,
  };
}

/* ── Session ID helper ─────────────────────────────────────────────────── */
function getOrCreateSessionId(): string {
  const KEY = 'reion_session_id';
  let id = sessionStorage.getItem(KEY);
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(KEY, id);
  }
  return id;
}
