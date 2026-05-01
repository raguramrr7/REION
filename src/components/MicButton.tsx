import { motion } from 'framer-motion';
import React from 'react';
import { OrbState } from '../types/voice';

interface MicButtonProps {
  state:      OrbState;
  onPress:    () => void;
  onRelease?: () => void;
  disabled?:  boolean;
}

const LABEL: Record<OrbState, string> = {
  [OrbState.IDLE]:      'Hold to speak',
  [OrbState.LISTENING]: 'Listening…',
  [OrbState.THINKING]:  'Thinking…',
  [OrbState.SPEAKING]:  'Speaking…',
  [OrbState.ERROR]:     'Error – tap to retry',
};

const BG_COLOR: Record<OrbState, string> = {
  [OrbState.IDLE]:      'rgba(0,212,255,0.10)',
  [OrbState.LISTENING]: 'rgba(0,212,255,0.25)',
  [OrbState.THINKING]:  'rgba(139,92,246,0.25)',
  [OrbState.SPEAKING]:  'rgba(0,212,255,0.15)',
  [OrbState.ERROR]:     'rgba(239,68,68,0.20)',
};

const BORDER_COLOR: Record<OrbState, string> = {
  [OrbState.IDLE]:      'rgba(0,212,255,0.40)',
  [OrbState.LISTENING]: 'rgba(0,212,255,0.85)',
  [OrbState.THINKING]:  'rgba(139,92,246,0.85)',
  [OrbState.SPEAKING]:  'rgba(0,212,255,0.60)',
  [OrbState.ERROR]:     'rgba(239,68,68,0.85)',
};

export const MicButton: React.FC<MicButtonProps> = ({ state, onPress, disabled }) => {
  const active = state === OrbState.LISTENING;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {/* Button */}
      <motion.button
        onClick={onPress}
        disabled={disabled || state === OrbState.THINKING || state === OrbState.SPEAKING}
        aria-label={LABEL[state]}
        whileTap={{ scale: 0.93 }}
        whileHover={{ scale: 1.05 }}
        animate={active ? { scale: [1, 1.05, 1] } : { scale: 1 }}
        transition={active ? { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } : {}}
        style={{
          width: 68,
          height: 68,
          borderRadius: '50%',
          border: `2px solid ${BORDER_COLOR[state]}`,
          background: BG_COLOR[state],
          backdropFilter: 'blur(12px)',
          cursor: (state === OrbState.THINKING || state === OrbState.SPEAKING) ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? `0 0 24px ${BORDER_COLOR[state]}, 0 0 48px rgba(0,212,255,0.2)` : 'none',
          transition: 'background 0.3s, border-color 0.3s, box-shadow 0.3s',
          outline: 'none',
        }}
      >
        {/* Mic SVG icon */}
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          {state === OrbState.THINKING || state === OrbState.SPEAKING ? (
            /* Spinner dots */
            <>
              {[0,1,2].map((i) => (
                // @ts-ignore - framer-motion v10 type conflict with React 19
                <motion.circle
                  key={i}
                  cx={8 + i * 4} cy={12} r={1.8}
                  fill={state === OrbState.THINKING ? '#8b5cf6' : '#00d4ff'}
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                />
              ))}
            </>
          ) : state === OrbState.ERROR ? (
            <path
              d="M12 2a9 9 0 100 18A9 9 0 0012 2zm0 5v5m0 3v1"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : (
            /* Normal mic */
            <>
              <rect x="9" y="2" width="6" height="11" rx="3"
                fill={active ? '#00d4ff' : 'rgba(196,202,216,0.7)'}
              />
              <path
                d="M5 10a7 7 0 0014 0"
                stroke={active ? '#00d4ff' : 'rgba(196,202,216,0.6)'}
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <line
                x1="12" y1="17" x2="12" y2="21"
                stroke={active ? '#00d4ff' : 'rgba(196,202,216,0.6)'}
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="9" y1="21" x2="15" y2="21"
                stroke={active ? '#00d4ff' : 'rgba(196,202,216,0.6)'}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>
      </motion.button>

      {/* Label */}
      <motion.span
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          fontFamily:    'var(--font-primary)',
          fontSize:      '0.72rem',
          fontWeight:    500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         BORDER_COLOR[state],
        }}
      >
        {LABEL[state]}
      </motion.span>
    </div>
  );
};
