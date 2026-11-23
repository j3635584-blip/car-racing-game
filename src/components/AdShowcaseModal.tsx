import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Play, Shield, Tv, X, Zap } from 'lucide-react';
import { GameLogo } from './GameLogo';

interface AdSpot {
  id: string;
  sponsor: string;
  category: string;
  headline: string;
  tagline: string;
  metrics: string;
  accentColor: string;
  ctaLabel: string;
  rewardText: string;
}

const AD_SPOTS: AdSpot[] = [
  {
    id: 'apex-promo',
    sponsor: 'Apex Velocity',
    category: 'Game Promo · 0:05',
    headline: 'Rule the Highway at 305 km/h',
    tagline:
      'Three supercars, dynamic Sunny, Rainy, and Stormy circuits, live analog steering wheel, and instant broadcast replay.',
    metrics: '1.50 km Sprint · 305 km/h Peak · Global Top 10',
    accentColor: '#f59e0b',
    ctaLabel: 'Play Now',
    rewardText: '+1,500 Starting Score Bonus',
  },
  {
    id: 'voltcharge-nitro',
    sponsor: 'VoltCharge Nitro',
    category: 'Sponsored Ad · 0:05',
    headline: 'Peak Thermal Surge On Demand',
    tagline:
      'High-output twin-chamber nitro cells engineered for straight-line overtakes and supersonic slipstream escapes.',
    metrics: '+28% Boost Acceleration · Instant Recharge Pickups',
    accentColor: '#06b6d4',
    ctaLabel: 'Test Nitro',
    rewardText: '+1,500 Starting Score Bonus',
  },
  {
    id: 'veloce-tires',
    sponsor: 'Veloce Motorsport Tires',
    category: 'Sponsored Ad · 0:05',
    headline: 'Zero Slip In Storm Conditions',
    tagline:
      'Silica-infused directional tread compounds built to hold tight highway lines through torrential rain and crosswinds.',
    metrics: 'All-Weather Compound · High Lateral Grip',
    accentColor: '#ef4444',
    ctaLabel: 'Hit the Track',
    rewardText: '+1,500 Starting Score Bonus',
  },
  {
    id: 'apex-broadcast',
    sponsor: 'Apex Broadcast Cam',
    category: 'Feature Spotlight · 0:05',
    headline: 'Every Near-Miss Recorded Live',
    tagline:
      'Relive your fastest sprint from Cinematic, Chase, Bumper, and Hood cameras at 1× or 2× speed right after the finish line.',
    metrics: '25 Hz Trajectory · 4 Camera Angles',
    accentColor: '#10b981',
    ctaLabel: 'Start Sprint',
    rewardText: '+1,500 Starting Score Bonus',
  },
];

const AD_DURATION_SEC = 5;

interface AdShowcaseModalProps {
  open: boolean;
  bonusActive: boolean;
  onClose: () => void;
  onClaimBonus: () => void;
  onStartRaceWithBonus: () => void;
}

export const AdShowcaseModal: React.FC<AdShowcaseModalProps> = ({
  open,
  bonusActive,
  onClose,
  onClaimBonus,
  onStartRaceWithBonus,
}) => {
  const [spotIndex, setSpotIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SEC);
  const [claimedThisView, setClaimedThisView] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(AD_DURATION_SEC);
    setClaimedThisView(false);
  }, [open, spotIndex]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, secondsLeft]);

  if (!open) return null;

  const spot = AD_SPOTS[spotIndex];
  const progressPct = Math.round(((AD_DURATION_SEC - secondsLeft) / AD_DURATION_SEC) * 100);
  const canSkip = secondsLeft <= 2;
  const completed = secondsLeft === 0;

  const handleClaim = () => {
    if (!completed) return;
    setClaimedThisView(true);
    onClaimBonus();
  };

  const handleLaunchRace = () => {
    if (completed && !bonusActive) {
      onClaimBonus();
    }
    onStartRaceWithBonus();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-showcase-title"
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/75 p-4 sm:p-6"
    >
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0c12]/96 text-slate-100 shadow-2xl">
        {/* Top Ad Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <Tv className="h-4 w-4 text-amber-400 shrink-0" />
            <span id="ad-showcase-title" className="font-display font-bold text-white">
              {spot.sponsor}
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-400 tabular-nums">{spot.category}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {completed ? (
              <span className="text-xs font-medium text-emerald-400">Reward Ready</span>
            ) : (
              <span className="text-xs font-medium text-slate-400 tabular-nums">
                {canSkip ? 'Skip ready' : `Ad · ${secondsLeft}s`}
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={!canSkip && !completed}
              aria-label="Close Advertisement"
              className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-200 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
            >
              {completed ? (
                <>
                  <X className="h-3.5 w-3.5" />
                  <span>Close</span>
                </>
              ) : (
                <span>{canSkip ? 'Skip Ad' : `Wait ${Math.max(1, secondsLeft - 2)}s`}</span>
              )}
            </button>
          </div>
        </div>

        {/* 16:9 Commercial Visual Stage */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
          <img
            src="/src/assets/images/racing_sunset_backdrop_1795368263934.jpg"
            alt={`${spot.sponsor} racing promotion`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0c12] via-[#0a0c12]/55 to-black/35" />

          {/* Clean Accent Line & Motorsport Silhouette Graphic */}
          <div
            className="absolute left-0 top-0 h-1 w-full"
            style={{ backgroundColor: spot.accentColor }}
          />

          <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                {spot.id === 'apex-promo' && <GameLogo size="sm" />}
                <span
                  className="font-display text-xs font-semibold tracking-wide"
                  style={{ color: spot.accentColor }}
                >
                  {spot.sponsor}
                </span>
              </div>
              <span className="font-mono text-xs text-slate-300 tabular-nums">
                {spotIndex + 1} / {AD_SPOTS.length}
              </span>
            </div>

            <div className="max-w-xl">
              <h3 className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
                {spot.headline}
              </h3>
              <p className="mt-2.5 text-sm sm:text-base text-slate-200 leading-relaxed">
                {spot.tagline}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-300 tabular-nums">
                <span>{spot.metrics}</span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <span style={{ color: spot.accentColor }}>{spot.rewardText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Simulated Commercial Timeline Progress */}
        <div className="h-1.5 w-full bg-slate-900">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${progressPct}%`,
              backgroundColor: spot.accentColor,
            }}
          />
        </div>

        {/* Bottom Controls: Switch Ad + Claim Bonus / Play */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSpotIndex((prev) => (prev - 1 + AD_SPOTS.length) % AD_SPOTS.length)
              }
              aria-label="Previous Ad"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSpotIndex((prev) => (prev + 1) % AD_SPOTS.length)}
              aria-label="Next Ad"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="ml-1 text-xs text-slate-400">
              Browse Game & Sponsor Ads
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {bonusActive || claimedThisView ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <Shield className="h-4 w-4" />
                <span>+1,500 Race Bonus Active</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClaim}
                disabled={!completed}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-amber-400/35 bg-amber-500/15 px-4 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                <span>{completed ? 'Claim +1,500 Bonus' : `Reward in ${secondsLeft}s`}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLaunchRace}
              disabled={!completed && !bonusActive}
              className="flex h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-4 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-45 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer"
            >
              {spot.id === 'voltcharge-nitro' ? (
                <Flame className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              <span>{spot.ctaLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
