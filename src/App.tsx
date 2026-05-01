import { motion } from 'framer-motion';
import { Orb } from './components/Orb';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MicButton } from './components/MicButton';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { useVoiceStore } from './store/voiceStore';
import { useVoice } from './hooks/useVoice';
import { OrbState } from './types/voice';
import './index.css';

/* ── Starfield background ─────────────────────────────────────────────── */
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  r:  0.5 + Math.random() * 1.5,
  d:  2 + Math.random() * 4,
}));

function StarField() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {STARS.map((s) => (
        <motion.div
          key={s.id}
          style={{
            position:     'absolute',
            left:         `${s.x}%`,
            top:          `${s.y}%`,
            width:        s.r * 2,
            height:       s.r * 2,
            borderRadius: '50%',
            background:   'rgba(196,202,216,0.7)',
          }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{ duration: s.d, repeat: Infinity, ease: 'easeInOut', delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

/* ── Grid lines ───────────────────────────────────────────────────────── */
function GridLines() {
  return (
    <div
      style={{
        position:   'absolute',
        inset:      0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents:  'none',
      }}
    />
  );
}

/* ── Status badge ─────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<OrbState, string> = {
  [OrbState.IDLE]:      'REION READY',
  [OrbState.LISTENING]: 'LISTENING',
  [OrbState.THINKING]:  'PROCESSING',
  [OrbState.SPEAKING]:  'RESPONDING',
  [OrbState.ERROR]:     'ERROR',
};
const STATUS_COLOR: Record<OrbState, string> = {
  [OrbState.IDLE]:      '#00d4ff',
  [OrbState.LISTENING]: '#00d4ff',
  [OrbState.THINKING]:  '#8b5cf6',
  [OrbState.SPEAKING]:  '#00d4ff',
  [OrbState.ERROR]:     '#ef4444',
};

function StatusBadge({ state }: { state: OrbState }) {
  return (
    <motion.div
      key={state}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        fontFamily:    'var(--font-display)',
        fontSize:      '0.65rem',
        letterSpacing: '0.2em',
        color:         STATUS_COLOR[state],
        textTransform: 'uppercase',
      }}
    >
      <motion.div
        animate={{ opacity: [1, 0.3, 1] }}
        transition={{ duration: 1.2, repeat: Infinity }}
        style={{
          width: 6, height: 6, borderRadius: '50%',
          background: STATUS_COLOR[state],
          boxShadow: `0 0 6px ${STATUS_COLOR[state]}`,
        }}
      />
      {STATUS_LABEL[state]}
    </motion.div>
  );
}

/* ── MAIN APP ─────────────────────────────────────────────────────────── */
export default function App() {
  const { orbState, audioLevel, transcript } = useVoiceStore();
  const { analyser, toggleListening }        = useVoice();

  return (
    <div
      style={{
        position:   'relative',
        width:      '100vw',
        height:     '100vh',
        overflow:   'hidden',
        background: 'var(--bg)',
        display:    'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Background layers */}
      <GridLines />
      <StarField />

      {/* Top brand */}
      <div
        style={{
          position:  'absolute',
          top:       28,
          left:      '50%',
          transform: 'translateX(-50%)',
          display:   'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap:        6,
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-display)',
            fontSize:      '1.5rem',
            fontWeight:    700,
            letterSpacing: '0.35em',
            background:    'linear-gradient(90deg, #00d4ff, #8b5cf6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          R.E.I.O.N
        </span>
        <span
          style={{
            fontFamily:    'var(--font-primary)',
            fontSize:      '0.6rem',
            letterSpacing: '0.18em',
            color:         'rgba(196,202,216,0.4)',
            textTransform: 'uppercase',
          }}
        >
          Responsive · Extensible · Intelligent · Operational · Network
        </span>
      </div>

      {/* ── Central Orb area ── */}
      <div
        style={{
          position:       'relative',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          width:          380,
          height:         380,
        }}
      >
        {/* Audio visualizer ring (behind orb) */}
        <AudioVisualizer analyser={analyser} state={orbState} size={380} />

        {/* The logo orb */}
        <div style={{ position: 'absolute' }}>
          <Orb state={orbState} audioLevel={audioLevel} />
        </div>
      </div>

      {/* Status badge below orb */}
      <div style={{ marginTop: 24 }}>
        <StatusBadge state={orbState} />
      </div>

      {/* Mic button */}
      <div style={{ marginTop: 40 }}>
        <MicButton
          state={orbState}
          onPress={toggleListening}
        />
      </div>

      {/* Keyboard hint */}
      <div
        style={{
          position:  'absolute',
          bottom:    22,
          fontFamily: 'var(--font-primary)',
          fontSize:  '0.65rem',
          letterSpacing: '0.1em',
          color:     'rgba(196,202,216,0.25)',
          textTransform: 'uppercase',
        }}
      >
        Press <kbd style={{ color: 'rgba(0,212,255,0.5)', fontWeight: 600 }}>Space</kbd> or tap mic to speak
      </div>

      {/* Transcript overlay */}
      <TranscriptDisplay
        userText={transcript.user}
        assistantText={transcript.assistant}
        orbState={orbState}
      />
    </div>
  );
}
