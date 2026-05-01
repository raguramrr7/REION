import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import { OrbState } from '../types/voice';

interface TranscriptDisplayProps {
  userText:      string | null;
  assistantText: string | null;
  orbState:      OrbState;
}

/* Shows:
 *  LISTENING  → user transcript fading in
 *  THINKING   → user text stays, spinner dots
 *  SPEAKING   → assistant response fades in, user fades out
 *  IDLE       → nothing (or last exchange faded out)
 */
export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({
  userText,
  assistantText,
  orbState,
}) => {
  const showUser      = !!userText && (orbState === OrbState.LISTENING || orbState === OrbState.THINKING);
  const showAssistant = !!assistantText && orbState === OrbState.SPEAKING;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(680px, 90vw)',
        textAlign: 'center',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* User transcript */}
      <AnimatePresence mode="wait">
        {showUser && (
          <motion.p
            key="user-text"
            initial={{ opacity: 0, y: 10, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
            exit={{    opacity: 0, y: -8, filter: 'blur(6px)' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              fontFamily:  'var(--font-primary)',
              fontSize:    'clamp(1rem, 2.2vw, 1.25rem)',
              fontWeight:  400,
              color:       'rgba(196, 202, 216, 0.85)',
              lineHeight:  1.55,
              marginBottom: 8,
            }}
          >
            {userText}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Assistant response */}
      <AnimatePresence mode="wait">
        {showAssistant && (
          <motion.p
            key="assistant-text"
            initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
            exit={{    opacity: 0, y: -10,filter: 'blur(8px)' }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{
              fontFamily:  'var(--font-primary)',
              fontSize:    'clamp(1.1rem, 2.5vw, 1.4rem)',
              fontWeight:  300,
              color:       'rgba(255, 255, 255, 0.92)',
              lineHeight:  1.65,
              letterSpacing: '0.01em',
            }}
          >
            {assistantText}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
