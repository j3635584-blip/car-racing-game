import React from 'react';
import type { GamePhase } from '../game/types';

interface CountdownOverlayProps {
  phase: GamePhase;
  countdownValue: number;
  countdownGo: boolean;
}

interface StageStyle {
  label: string;
  subtitle: string;
  faceClass: string;
  depthColor: string;
  ringStroke: string;
  activeLamps: number;
  lampClass: string;
}

const STAGE_STYLES: Record<number, StageStyle> = {
  3: {
    label: '3',
    subtitle: 'Engines Armed',
    faceClass: 'from-rose-200 via-red-400 to-rose-600',
    depthColor: '#7f1d1d',
    ringStroke: '#ef4444',
    activeLamps: 1,
    lampClass: 'bg-red-500 border-red-300 shadow-[0_0_16px_rgba(239,68,68,0.85)]',
  },
  2: {
    label: '2',
    subtitle: 'Build Boost',
    faceClass: 'from-amber-100 via-amber-400 to-orange-500',
    depthColor: '#78350f',
    ringStroke: '#f59e0b',
    activeLamps: 2,
    lampClass: 'bg-amber-400 border-amber-200 shadow-[0_0_16px_rgba(245,158,11,0.85)]',
  },
  1: {
    label: '1',
    subtitle: 'Hold The Line',
    faceClass: 'from-yellow-100 via-yellow-300 to-amber-500',
    depthColor: '#713f12',
    ringStroke: '#facc15',
    activeLamps: 3,
    lampClass: 'bg-yellow-300 border-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.9)]',
  },
};

const GO_STAGE: StageStyle = {
  label: 'GO!',
  subtitle: 'Full Throttle',
  faceClass: 'from-emerald-100 via-cyan-300 to-emerald-400',
  depthColor: '#064e3b',
  ringStroke: '#22d3ee',
  activeLamps: 3,
  lampClass: 'bg-emerald-400 border-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.95)]',
};

const EXTRUSION_OFFSETS = [4, 8, 12, 16, 20];

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  phase,
  countdownValue,
  countdownGo,
}) => {
  const showGo = phase === 'playing' && countdownGo;
  const showNumber = phase === 'countdown' && countdownValue >= 1;

  if (!showNumber && !showGo) {
    return null;
  }

  const stageKey = showGo ? 'go' : Math.min(3, Math.max(1, countdownValue));
  const stage = showGo
    ? GO_STAGE
    : STAGE_STYLES[Math.min(3, Math.max(1, countdownValue))] ?? STAGE_STYLES[3];

  return (
    <div
      aria-live="polite"
      className="pointer-events-none flex flex-col items-center justify-center select-none"
    >
      {/* 3-Lamp Motorsport Gantry Sequencer */}
      <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/15 bg-[#0a0c12]/88 px-4 py-2 shadow-xl">
        {[1, 2, 3].map((lampIdx) => {
          const lit = lampIdx <= stage.activeLamps;
          return (
            <div
              key={lampIdx}
              className={`h-4 w-4 sm:h-4.5 sm:w-4.5 rounded-full border transition-all duration-150 ${
                lit ? stage.lampClass : 'border-white/10 bg-slate-800/90'
              }`}
            />
          );
        })}
      </div>

      {/* 3D Perspective Stage */}
      <div
        key={stageKey}
        className="relative flex h-48 w-64 sm:h-56 sm:w-80 items-center justify-center"
        style={{ perspective: '900px', transformStyle: 'preserve-3d' }}
      >
        {/* Tilted 3D Orbital Starting Ring */}
        <svg
          viewBox="0 0 220 220"
          aria-hidden="true"
          className="animate-countdown-ring pointer-events-none absolute h-52 w-52 sm:h-64 sm:w-64"
        >
          <circle
            cx="110"
            cy="110"
            r="92"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="3"
          />
          <circle
            cx="110"
            cy="110"
            r="82"
            fill="none"
            stroke={stage.ringStroke}
            strokeWidth="5"
            strokeDasharray="120 28 45 28"
            strokeLinecap="round"
            opacity="0.92"
          />
          <circle
            cx="110"
            cy="110"
            r="68"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.5"
            strokeDasharray="6 10"
          />
        </svg>

        {/* Extruded 3D Numeral Stack */}
        <div
          className={`relative flex items-center justify-center ${
            showGo ? 'animate-countdown-go' : 'animate-countdown-3d'
          }`}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {EXTRUSION_OFFSETS.map((depth, idx) => (
            <span
              key={depth}
              aria-hidden="true"
              className="pointer-events-none absolute font-display font-bold leading-none tracking-tight tabular-nums select-none text-[7.25rem] sm:text-[9.5rem]"
              style={{
                color: stage.depthColor,
                opacity: 0.9 - idx * 0.14,
                transform: `translate3d(${idx * 1.5}px, ${depth * 0.65}px, ${-depth * 2.2}px)`,
              }}
            >
              {stage.label}
            </span>
          ))}

          {/* Front Metallic-Bevel 3D Face */}
          <span
            className={`relative font-display font-bold leading-none tracking-tight tabular-nums text-[7.25rem] sm:text-[9.5rem] bg-gradient-to-b ${stage.faceClass} bg-clip-text text-transparent`}
            style={{
              WebkitTextStroke: '1.5px rgba(255,255,255,0.38)',
              filter: 'drop-shadow(0 16px 28px rgba(0, 0, 0, 0.85))',
              transform: 'translate3d(0, 0, 14px)',
            }}
          >
            {stage.label}
          </span>
        </div>
      </div>

      {/* Stage Sub-caption & Compact Controls Hint */}
      <div className="mt-1 flex flex-col items-center gap-1.5 text-center">
        <span className="font-display text-sm sm:text-base font-bold tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          {stage.subtitle}
        </span>
        {showNumber && (
          <p className="text-xs sm:text-sm font-medium text-slate-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Wheel / L·R / A·D to Steer · W / Speed+ to Drive · Space Nitro
          </p>
        )}
      </div>
    </div>
  );
};
