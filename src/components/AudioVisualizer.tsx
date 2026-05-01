import React, { useEffect, useRef } from 'react';
import { OrbState } from '../types/voice';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  state:    OrbState;
  size?:    number;
}

const STATE_COLOR: Record<OrbState, [string, string]> = {
  [OrbState.IDLE]:      ['#00d4ff44', '#8b5cf644'],
  [OrbState.LISTENING]: ['#00d4ff',   '#00a8ff'],
  [OrbState.THINKING]:  ['#8b5cf6',   '#c026d3'],
  [OrbState.SPEAKING]:  ['#00d4ff',   '#8b5cf6'],
  [OrbState.ERROR]:     ['#ef4444',   '#dc2626'],
};

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  state,
  size = 340,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const smoothed  = useRef<Float32Array>(new Float32Array(64).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    if (!ctx) return;

    const BAR_COUNT = 48;
    const CENTER_X  = size / 2;
    const CENTER_Y  = size / 2;
    const RADIUS    = size / 2 - 24;
    const [c1, c2]  = STATE_COLOR[state];

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      let dataArray: Uint8Array;
      if (analyser) {
        dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray as any);
      } else {
        // Idle shimmer when no analyser
        dataArray = new Uint8Array(BAR_COUNT * 2).fill(128);
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const angle    = (i / BAR_COUNT) * Math.PI * 2 - Math.PI / 2;
        const srcIdx   = Math.floor((i / BAR_COUNT) * dataArray.length);
        const raw      = analyser
          ? Math.abs(dataArray[srcIdx] - 128) / 128
          : 0.05 + Math.sin(Date.now() / 800 + i * 0.4) * 0.04; // idle shimmer

        // Smooth
        smoothed.current[i] = smoothed.current[i] * 0.75 + raw * 0.25;
        const barH = 6 + smoothed.current[i] * 38;

        const x1  = CENTER_X + Math.cos(angle) * RADIUS;
        const y1  = CENTER_Y + Math.sin(angle) * RADIUS;
        const x2  = CENTER_X + Math.cos(angle) * (RADIUS + barH);
        const y2  = CENTER_Y + Math.sin(angle) * (RADIUS + barH);

        // Gradient per bar
        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 2.5;
        ctx.lineCap     = 'round';
        ctx.stroke();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, state, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        position:      'absolute',
        top:           '50%',
        left:          '50%',
        transform:     'translate(-50%, -50%)',
        pointerEvents: 'none',
        opacity:       state === OrbState.IDLE ? 0.35 : 0.9,
        transition:    'opacity 0.5s',
      }}
    />
  );
};
