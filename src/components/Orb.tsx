import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrbState } from '../types/voice';

interface OrbProps {
  state: OrbState;
  audioLevel?: number; // 0-100
}

/* ─── CONFIG PER STATE ──────────────────────────────────────────────────── */
const STATE_CONFIG = {
  [OrbState.IDLE]: {
    primaryColor:   '#00d4ff',
    secondaryColor: '#8b5cf6',
    glowColor:      'rgba(0,212,255,0.35)',
    glowColor2:     'rgba(139,92,246,0.25)',
    ringOpacity:    0.5,
    particleCount:  0,
    sonarRings:     0,
    arcSpin:        false,
  },
  [OrbState.LISTENING]: {
    primaryColor:   '#00d4ff',
    secondaryColor: '#00a8ff',
    glowColor:      'rgba(0,212,255,0.75)',
    glowColor2:     'rgba(0,168,255,0.45)',
    ringOpacity:    0.85,
    particleCount:  0,
    sonarRings:     3,
    arcSpin:        false,
  },
  [OrbState.THINKING]: {
    primaryColor:   '#8b5cf6',
    secondaryColor: '#c026d3',
    glowColor:      'rgba(139,92,246,0.85)',
    glowColor2:     'rgba(192,38,211,0.45)',
    ringOpacity:    1,
    particleCount:  12,
    sonarRings:     0,
    arcSpin:        true,
  },
  [OrbState.SPEAKING]: {
    primaryColor:   '#00d4ff',
    secondaryColor: '#8b5cf6',
    glowColor:      'rgba(0,212,255,0.70)',
    glowColor2:     'rgba(139,92,246,0.55)',
    ringOpacity:    0.9,
    particleCount:  0,
    sonarRings:     4,
    arcSpin:        false,
  },
  [OrbState.ERROR]: {
    primaryColor:   '#ef4444',
    secondaryColor: '#dc2626',
    glowColor:      'rgba(239,68,68,0.85)',
    glowColor2:     'rgba(220,38,38,0.45)',
    ringOpacity:    0.9,
    particleCount:  0,
    sonarRings:     0,
    arcSpin:        false,
  },
};

/* ─── SONAR RING ─────────────────────────────────────────────────────────── */
function SonarRing({ index, color, total }: { index: number; color: string; total: number }) {
  const delay = (index / total) * 1.6;
  return (
    <motion.div
      key={index}
      style={{
        position: 'absolute',
        inset: 0,
        borderRadius: '50%',
        border: `1.5px solid ${color}`,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0.9, opacity: 0.7 }}
      animate={{ scale: 2.4, opacity: 0 }}
      transition={{
        duration: 1.8,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

/* ─── PARTICLE ───────────────────────────────────────────────────────────── */
function Particle({ index, color }: { index: number; color: string }) {
  const angle = (index / 12) * 360;
  const dist  = 80 + Math.random() * 30;
  const x = Math.cos((angle * Math.PI) / 180) * dist;
  const y = Math.sin((angle * Math.PI) / 180) * dist;
  const size = 2 + Math.random() * 3;
  const delay = Math.random() * 1.5;
  return (
    <motion.div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 6px ${color}`,
        pointerEvents: 'none',
      }}
      initial={{ x: 0, y: 0, opacity: 0 }}
      animate={{
        x: [0, x * 0.5, x],
        y: [0, y * 0.5, y],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 1.6,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

/* ─── MAIN ORB COMPONENT ─────────────────────────────────────────────────── */
export const Orb: React.FC<OrbProps> = ({ state, audioLevel = 0 }) => {
  const cfg   = STATE_CONFIG[state];
  const SIZE  = 260;

  /* Scale pulse driven by audio level */
  const audioScale = state === OrbState.LISTENING || state === OrbState.SPEAKING
    ? 1 + (audioLevel / 100) * 0.12
    : 1;

  /* Outer wrapper animation per state */
  const outerVariants = {
    [OrbState.IDLE]: {
      scale: [1, 1.03, 1],
      transition: { duration: 3.5, repeat: Infinity, ease: 'easeInOut' },
    },
    [OrbState.LISTENING]: {
      scale: audioScale,
      transition: { duration: 0.1 },
    },
    [OrbState.THINKING]: {
      scale: [1, 1.02, 0.99, 1],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
    [OrbState.SPEAKING]: {
      scale: audioScale,
      transition: { duration: 0.08 },
    },
    [OrbState.ERROR]: {
      x: [-8, 8, -6, 6, 0],
      transition: { duration: 0.5, times: [0, 0.25, 0.5, 0.75, 1] },
    },
  };

  const gradientId   = `reion-grad-${state}`;
  const filterIdGlow = `reion-glow-${state}`;

  return (
    <div
      style={{
        position: 'relative',
        width: SIZE,
        height: SIZE,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* ── SONAR RINGS ── */}
      {Array.from({ length: cfg.sonarRings }).map((_, i) => (
        <SonarRing key={i} index={i} color={cfg.primaryColor} total={cfg.sonarRings} />
      ))}

      {/* ── PARTICLES (THINKING) ── */}
      <AnimatePresence>
        {cfg.particleCount > 0 &&
          Array.from({ length: cfg.particleCount }).map((_, i) => (
            <Particle key={`p-${i}`} index={i} color={cfg.primaryColor} />
          ))}
      </AnimatePresence>

      {/* ── OUTER GLOW HALO ── */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -30,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${cfg.glowColor} 0%, ${cfg.glowColor2} 40%, transparent 70%)`,
          pointerEvents: 'none',
          filter: 'blur(12px)',
        }}
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* ── ARC RINGS (THINKING) ── */}
      {cfg.arcSpin && (
        <>
          <motion.div
            style={{
              position: 'absolute',
              width: SIZE + 30,
              height: SIZE + 30,
              borderRadius: '50%',
              border: `2px solid ${cfg.primaryColor}44`,
              borderTop: `2px solid ${cfg.primaryColor}`,
              pointerEvents: 'none',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            style={{
              position: 'absolute',
              width: SIZE + 55,
              height: SIZE + 55,
              borderRadius: '50%',
              border: `1.5px solid ${cfg.secondaryColor}33`,
              borderBottom: `1.5px solid ${cfg.secondaryColor}`,
              pointerEvents: 'none',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}

      {/* ── MAIN SVG LOGO ── */}
      <motion.div
        animate={outerVariants[state] as any}
        style={{
          position: 'relative',
          width: SIZE,
          height: SIZE,
          filter: `drop-shadow(0 0 24px ${cfg.glowColor}) drop-shadow(0 0 48px ${cfg.glowColor2})`,
        }}
      >
        <svg
          viewBox="0 0 260 260"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Primary gradient - cyan to violet */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor={cfg.primaryColor} />
              <stop offset="100%" stopColor={cfg.secondaryColor} />
            </linearGradient>

            {/* Glow filter */}
            <filter id={filterIdGlow} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Hex pattern */}
            <pattern id="hex-pattern" x="0" y="0" width="20" height="17.32" patternUnits="userSpaceOnUse">
              <polygon
                points="10,0 20,5 20,12.32 10,17.32 0,12.32 0,5"
                fill="none"
                stroke={cfg.primaryColor}
                strokeWidth="0.4"
                opacity="0.18"
              />
            </pattern>

            {/* Clip to circle */}
            <clipPath id="circle-clip">
              <circle cx="130" cy="130" r="105" />
            </clipPath>
          </defs>

          {/* ── Background circle fill ── */}
          <circle cx="130" cy="130" r="120" fill="#07071a" />

          {/* ── Hex grid inside ring ── */}
          <motion.rect
            x="25" y="25" width="210" height="210"
            fill="url(#hex-pattern)"
            clipPath="url(#circle-clip)"
            animate={{ rotate: state === OrbState.THINKING ? 360 : 15 }}
            style={{ transformOrigin: '130px 130px' }}
            transition={
              state === OrbState.THINKING
                ? { duration: 8, repeat: Infinity, ease: 'linear' }
                : { duration: 20, repeat: Infinity, ease: 'linear' }
            }
          />

          {/* ── Outer ring ── */}
          {/* @ts-ignore */}
          <motion.circle
            cx="130" cy="130" r="118"
            stroke={`url(#${gradientId})`}
            strokeWidth="3"
            fill="none"
            opacity={cfg.ringOpacity}
            strokeDasharray="740"
            animate={
              state === OrbState.THINKING
                ? { strokeDashoffset: [-740, 0] }
                : { strokeDashoffset: 0 }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />

          {/* ── Inner ring ── */}
          <circle
            cx="130" cy="130" r="102"
            stroke={cfg.primaryColor}
            strokeWidth="1.2"
            fill="none"
            opacity={0.3}
          />

          {/* ── HUD tick marks (4 cardinal points) ── */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = 130 + Math.cos(rad) * 104;
            const y1 = 130 + Math.sin(rad) * 104;
            const x2 = 130 + Math.cos(rad) * 118;
            const y2 = 130 + Math.sin(rad) * 118;
            return (
              <line
                key={deg}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={cfg.primaryColor}
                strokeWidth="3"
                opacity="0.9"
              />
            );
          })}

          {/* ── 3D "R" lettermark ── */}
          {/* Shadow layer */}
          <g transform="translate(4,5)" opacity="0.35">
            <path
              d="M88 170V88h46c14 0 25 4 32 11s11 17 11 29c0 9-2.5 16.5-7.5 22.5S157 160 148 162l38 8H162l-34-7.5V170H88zm24-92v42h22c8 0 14-1.8 18-5.5s6-8.5 6-14.5c0-6.2-2-11-6-14.5S142 80 134 80H112v-2z"
              fill="#000"
            />
          </g>
          {/* Main R body */}
          <path
            d="M88 170V88h46c14 0 25 4 32 11s11 17 11 29c0 9-2.5 16.5-7.5 22.5S157 160 148 162l38 8H162l-34-7.5V170H88zm24-92v42h22c8 0 14-1.8 18-5.5s6-8.5 6-14.5c0-6.2-2-11-6-14.5S142 80 134 80H112v-2z"
            fill={`url(#${gradientId})`}
            filter={`url(#${filterIdGlow})`}
          />
          {/* 3D bevel highlight */}
          <path
            d="M88 88h46c14 0 25 4 32 11"
            stroke="#ffffff"
            strokeWidth="1.5"
            opacity="0.35"
            fill="none"
          />
          <path
            d="M112 88v42h22"
            stroke="#ffffff"
            strokeWidth="1"
            opacity="0.25"
            fill="none"
          />

          {/* ── Center core dot ── */}
          {/* @ts-ignore */}
          <motion.circle
            cx="130" cy="138" r="5"
            fill={cfg.secondaryColor}
            animate={{ r: [4, 6, 4], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <circle cx="130" cy="138" r="3" fill="#ffffff" opacity="0.7" />

          {/* ── Diagonal accent line (logo's slash) ── */}
          <line
            x1="88" y1="170" x2="120" y2="130"
            stroke={`url(#${gradientId})`}
            strokeWidth="3.5"
            opacity="0.85"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
};

export default Orb;
