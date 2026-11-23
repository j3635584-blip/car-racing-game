import React, { useState } from 'react';
import { CheckCircle2, Circle, Compass, Flag, Map, X } from 'lucide-react';
import type { SavedStats } from '../game/types';

interface RoadmapModalProps {
  open: boolean;
  savedStats: SavedStats;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  onClose: () => void;
}

interface HighwayStage {
  level: number;
  title: string;
  segmentKm: string;
  trafficNote: string;
  reward: string;
}

const HIGHWAY_STAGES: HighwayStage[] = [
  {
    level: 1,
    title: 'Opening Sprint',
    segmentKm: '1.50 km',
    trafficNote: 'Standard highway flow · Official Global Top 10 split',
    reward: '+3,000 Bonus · +35% Nitro',
  },
  {
    level: 2,
    title: 'Slipstream Surge',
    segmentKm: '1.75 km',
    trafficNote: 'Faster traffic packs · Dual-lane overtakes',
    reward: '+3,000 Bonus · +1 Shield',
  },
  {
    level: 3,
    title: 'Redline Corridor',
    segmentKm: '2.00 km',
    trafficNote: 'Dense mid-highway traffic · Combo windows tighten',
    reward: '+4,500 Bonus · +1 Shield',
  },
  {
    level: 4,
    title: 'Velocity Gauntlet',
    segmentKm: '2.25 km',
    trafficNote: 'High-speed convoy waves · Precision steering',
    reward: '+6,000 Bonus · +1 Shield',
  },
  {
    level: 5,
    title: 'Endless Runner Milestone',
    segmentKm: '2.50 km',
    trafficNote: 'Unlocks Endless Runner Achievement · Pro traffic pace',
    reward: '+7,500 Bonus · Milestone Badge',
  },
  {
    level: 7,
    title: 'Apex Endurance',
    segmentKm: '3.00 km',
    trafficNote: 'Max checkpoint span · Peak traffic speed scaling',
    reward: '+10,500+ Bonus · +1 Shield',
  },
  {
    level: 10,
    title: 'Unlimited Legend Tier',
    segmentKm: '3.00 km / Lv',
    trafficNote: 'Infinite procedural highway checkpoints beyond Level 10',
    reward: '+15,000+ Bonus per Level',
  },
];

interface FeaturePhase {
  phase: string;
  status: 'Live' | 'Planned';
  title: string;
  items: string[];
}

const FEATURE_ROADMAP: FeaturePhase[] = [
  {
    phase: 'Phase 1',
    status: 'Live',
    title: '3D Driving Core & Visual FX',
    items: [
      'Three.js PBR supercars across Sunset Coast, Midnight Express & Alpine Dawn',
      'Dynamic Sunny, Rainy & Stormy weather with wet asphalt & lightning',
      '3D-extruded 3-2-1-GO launch countdown & Nitro screen-space blur + chromatic aberration',
    ],
  },
  {
    phase: 'Phase 2',
    status: 'Live',
    title: 'Controls, Audio & Progression',
    items: [
      'Dual steering (Analog Wheel + Left/Right buttons), Speed+ pedal & Tuning Settings',
      'Three engine sound profiles (Aggressive, Silent, Muscle) & 25 Hz Broadcast Replay',
      'Unlimited Levels, Global Top 10 Leaderboard, Career Achievements & Sponsor Ads',
    ],
  },
  {
    phase: 'Phase 3',
    status: 'Planned',
    title: 'Upcoming Expansions',
    items: [
      'Asynchronous Ghost Rivals & head-to-head sprint challenges',
      'Custom Car Paint, Caliper & Aero Wing Garage Workshop',
      'Time-Attack Weather Championships & Cloud Profile Sync',
    ],
  },
];

export const RoadmapModal: React.FC<RoadmapModalProps> = ({
  open,
  savedStats,
  unlockedAchievementsCount,
  totalAchievementsCount,
  onClose,
}) => {
  const [tab, setTab] = useState<'highway' | 'features'>('highway');

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roadmap-title"
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 sm:p-6"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0a0c12]/96 p-5 sm:p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Map className="h-5 w-5 text-cyan-400 shrink-0" />
              <h2
                id="roadmap-title"
                className="font-display text-2xl font-bold tracking-tight text-white"
              >
                Highway & Feature Roadmap
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 tabular-nums">
              Best Level {savedStats.bestLevel}
              <span className="mx-2 text-slate-600" aria-hidden="true">
                ·
              </span>
              {savedStats.bestDistanceKm.toFixed(2)} km Best Run
              <span className="mx-2 text-slate-600" aria-hidden="true">
                ·
              </span>
              {unlockedAchievementsCount}/{totalAchievementsCount} Badges
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Roadmap"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="mt-4 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setTab('highway')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'highway'
                ? 'bg-amber-500 text-slate-950'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flag className="h-3.5 w-3.5 shrink-0" />
            <span>Unlimited Level Route</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('features')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              tab === 'features'
                ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/35'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Compass className="h-3.5 w-3.5 shrink-0" />
            <span>Development Roadmap</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
          {tab === 'highway' ? (
            <div className="space-y-2.5">
              {HIGHWAY_STAGES.map((stage) => {
                const cleared = savedStats.bestLevel > stage.level;
                const current = savedStats.bestLevel === stage.level;
                return (
                  <div
                    key={stage.level}
                    className={`flex items-start gap-3.5 rounded-xl border p-3.5 transition-colors ${
                      cleared
                        ? 'border-emerald-400/30 bg-emerald-500/10'
                        : current
                          ? 'border-amber-400/45 bg-amber-500/10'
                          : 'border-white/10 bg-white/[0.03]'
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl border font-display text-sm font-bold shrink-0 tabular-nums ${
                        cleared
                          ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-300'
                          : current
                            ? 'border-amber-400/45 bg-amber-500/20 text-amber-300'
                            : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      L{stage.level}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm sm:text-base font-bold text-white">
                            {stage.title}
                          </span>
                          <span className="text-xs text-slate-500" aria-hidden="true">
                            ·
                          </span>
                          <span className="font-mono text-xs text-cyan-300 tabular-nums">
                            {stage.segmentKm}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            cleared
                              ? 'text-emerald-300'
                              : current
                                ? 'text-amber-300'
                                : 'text-slate-400'
                          }`}
                        >
                          {cleared ? 'Cleared' : current ? 'Personal Best' : 'Upcoming'}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-300">{stage.trafficNote}</p>
                      <div className="mt-1.5 text-xs font-medium text-amber-300 tabular-nums">
                        {stage.reward}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {FEATURE_ROADMAP.map((block) => {
                const isLive = block.status === 'Live';
                return (
                  <div
                    key={block.phase}
                    className={`rounded-xl border p-4 ${
                      isLive
                        ? 'border-emerald-400/25 bg-emerald-500/[0.06]'
                        : 'border-cyan-400/25 bg-cyan-500/[0.06]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {isLive ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-cyan-300 shrink-0" />
                        )}
                        <span className="font-display text-base font-bold text-white">
                          {block.phase}: {block.title}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          isLive ? 'text-emerald-300' : 'text-cyan-300'
                        }`}
                      >
                        {block.status}
                      </span>
                    </div>

                    <ul className="mt-2.5 space-y-1.5 text-xs sm:text-sm text-slate-300">
                      {block.items.map((line) => (
                        <li key={line} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-500 shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3.5 text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Flag className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Checkpoints continue infinitely past Level 10</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg bg-amber-500 px-5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
