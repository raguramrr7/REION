import { motion, AnimatePresence } from 'framer-motion';
import { useRef, useEffect } from 'react';
import { Orb } from './components/Orb';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MicButton } from './components/MicButton';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { useVoiceStore } from './store/voiceStore';
import { useVoice } from './hooks/useVoice';
import { OrbState } from './types/voice';
import './index.css';

/* ── Starfield ────────────────────────────────────────────────────────── */
const STARS = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  r:  0.4 + Math.random() * 1.2,
  d:  2.5 + Math.random() * 4,
  delay: Math.random() * 3,
}));

function StarField() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r * 2,
            height: s.r * 2,
            borderRadius: '50%',
            background: 'rgba(196,202,216,0.8)',
          }}
          animate={{ opacity: [0.15, 0.85, 0.15] }}
          transition={{ duration: s.d, repeat: Infinity, ease: 'easeInOut', delay: s.delay }}
        />
      ))}
    </div>
  );
}

/* ── Grid ─────────────────────────────────────────────────────────────── */
function GridLines() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.035) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.035) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

/* ── Top vignette ─────────────────────────────────────────────────────── */
function Vignette() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background:
          'radial-gradient(ellipse at center, transparent 40%, rgba(4,4,12,0.85) 100%)',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
}

/* ── Status badge ─────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<OrbState, string> = {
  [OrbState.IDLE]:      'REION  READY',
  [OrbState.LISTENING]: 'LISTENING',
  [OrbState.THINKING]:  'PROCESSING',
  [OrbState.SPEAKING]:  'RESPONDING',
  [OrbState.ERROR]:     'ERROR',
};
const STATUS_COLOR: Record<OrbState, string> = {
  [OrbState.IDLE]:      '#00d4ff',
  [OrbState.LISTENING]: '#00ffcc',
  [OrbState.THINKING]:  '#8b5cf6',
  [OrbState.SPEAKING]:  '#00d4ff',
  [OrbState.ERROR]:     '#ef4444',
};

function StatusBadge({ state }: { state: OrbState }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state}
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: 'var(--font-display)',
          fontSize: '0.6rem',
          letterSpacing: '0.25em',
          color: STATUS_COLOR[state],
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        <motion.span
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.0, repeat: Infinity }}
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: STATUS_COLOR[state],
            boxShadow: `0 0 8px ${STATUS_COLOR[state]}, 0 0 16px ${STATUS_COLOR[state]}88`,
            flexShrink: 0,
          }}
        />
        {STATUS_LABEL[state]}
      </motion.div>
    </AnimatePresence>
  );
}

/* ── MAIN APP ─────────────────────────────────────────────────────────── */
export default function App() {
  const { orbState, audioLevel, transcript } = useVoiceStore();
  const { analyser, toggleListening } = useVoice();

  /* Keep analyser ref fresh for AudioVisualizer */
  const analyserRef = useRef(analyser);
  useEffect(() => { analyserRef.current = analyser; }, [analyser]);

  /* Orb size — responsive */
  const ORB_SIZE   = Math.min(260, window.innerWidth * 0.55);
  const VIZ_SIZE   = ORB_SIZE + 120;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto auto auto',
        alignItems: 'center',
        justifyItems: 'center',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Layer 0: background effects */}
      <GridLines />
      <StarField />
      <Vignette />

      {/* ─── Row 0: Top brand ─────────────────────────────────────────── */}
      <header
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 5,
          paddingTop: 28,
          paddingBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(1rem, 4vw, 1.6rem)',
            fontWeight: 800,
            letterSpacing: '0.38em',
            background: 'linear-gradient(90deg, #00d4ff 0%, #8b5cf6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1,
          }}
        >
          R.E.I.O.N
        </span>
        <span
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'clamp(0.45rem, 1.2vw, 0.58rem)',
            letterSpacing: '0.15em',
            color: 'rgba(196,202,216,0.35)',
            textTransform: 'uppercase',
          }}
        >
          Responsive · Extensible · Intelligent · Operational · Network
        </span>
      </header>

      {/* ─── Row 1: Central orb stage ─────────────────────────────────── */}
      <main
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: VIZ_SIZE,
          height: VIZ_SIZE,
        }}
      >
        {/* Frequency ring — behind the orb */}
        <AudioVisualizer analyser={analyser} state={orbState} size={VIZ_SIZE} />

        {/* The 3D logo orb */}
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Orb state={orbState} audioLevel={audioLevel} size={ORB_SIZE} />
        </div>
      </main>

      {/* ─── Row 2: Status badge ──────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: 16 }}>
        <StatusBadge state={orbState} />
      </div>

      {/* ─── Row 3: Mic button ────────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 2, marginTop: 20, marginBottom: 8 }}>
        <MicButton state={orbState} onPress={toggleListening} />
      </div>

      {/* ─── Row 4: Keyboard hint ─────────────────────────────────────── */}
      <footer
        style={{
          position: 'relative',
          zIndex: 2,
          paddingBottom: 20,
          fontFamily: 'var(--font-primary)',
          fontSize: '0.6rem',
          letterSpacing: '0.1em',
          color: 'rgba(196,202,216,0.2)',
          textTransform: 'uppercase',
        }}
      >
        Press{' '}
        <kbd style={{ color: 'rgba(0,212,255,0.45)', fontWeight: 600, fontStyle: 'normal' }}>
          Space
        </kbd>{' '}
        or tap mic · hold to push-to-talk
      </footer>

      {/* ─── Transcript overlay (floats above everything) ─────────────── */}
      <TranscriptDisplay
        userText={transcript.user}
        assistantText={transcript.assistant}
        orbState={orbState}
      />
    </div>
  );
}
