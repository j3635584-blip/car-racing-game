import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Camera,
  ChevronDown,
  ChevronUp,
  CloudLightning,
  CloudRain,
  Film,
  Flag,
  Flame,
  Gauge,
  Map,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SlidersHorizontal,
  Square,
  Sun,
  Trophy,
  Tv,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CountdownOverlay } from './CountdownOverlay';
import { GameLogo } from './GameLogo';
import { SteeringWheel } from './SteeringWheel';
import { DailyMissionHUD } from './DailyMissionHUD';
import { formatRaceTime } from '../services/leaderboardService';
import { CAR_PRESETS, TRACK_PRESETS, WEATHER_PRESETS } from '../game/constants';
import type { DailyMission } from '../services/dailyMissionsService';
import type {
  CameraMode,
  CarId,
  ControlLayoutMode,
  FloatingCallout,
  GameTelemetry,
  SavedStats,
  TrackId,
  WeatherMode,
} from '../game/types';

interface GameHUDProps {
  telemetry: GameTelemetry;
  callouts: FloatingCallout[];
  savedStats: SavedStats;
  selectedCar: CarId;
  selectedTrack: TrackId;
  selectedWeather: WeatherMode;
  cameraMode: CameraMode;
  muted: boolean;
  latestSubmissionRank: number | null;
  sponsorBonusActive: boolean;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  controlLayout: ControlLayoutMode;
  speedMultiplier: number;
  dailyMissions: DailyMission[];
  onClaimDailyMission: (id: string) => void;
  onSelectCar: (id: CarId) => void;
  onSelectTrack: (id: TrackId) => void;
  onSelectWeather: (mode: WeatherMode) => void;
  onSelectCamera: (mode: CameraMode) => void;
  onStartRace: () => void;
  onStartReplay: () => void;
  onStopReplay: () => void;
  onSetReplaySpeed: (speed: 1 | 2) => void;
  onTogglePause: () => void;
  onReturnToMenu: () => void;
  onToggleMute: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenRoadmap: () => void;
  onOpenAds: () => void;
  onOpenSettings: () => void;
  onTouchInput: (steer: number, boost: boolean, brake: boolean, accel?: boolean) => void;
}

const CAMERA_OPTIONS: Array<{ id: CameraMode; label: string }> = [
  { id: 'chase', label: 'Chase' },
  { id: 'bumper', label: 'Bumper' },
  { id: 'hood', label: 'Hood' },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  telemetry,
  callouts,
  savedStats,
  selectedCar,
  selectedTrack,
  selectedWeather,
  cameraMode,
  muted,
  latestSubmissionRank,
  sponsorBonusActive,
  unlockedAchievementsCount,
  totalAchievementsCount,
  controlLayout,
  speedMultiplier,
  onSelectCar,
  onSelectTrack,
  onSelectWeather,
  onSelectCamera,
  onStartRace,
  onStartReplay,
  onStopReplay,
  onSetReplaySpeed,
  onTogglePause,
  onReturnToMenu,
  onToggleMute,
  onOpenLeaderboard,
  onOpenAchievements,
  onOpenRoadmap,
  onOpenAds,
  onOpenSettings,
  dailyMissions,
  onClaimDailyMission,
  onTouchInput,
}) => {
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [wheelVisible, setWheelVisible] = useState(true);
  const [touchState, setTouchState] = useState({
    wheelSteer: 0,
    arrowLeft: false,
    arrowRight: false,
    accel: false,
    brake: false,
    boost: false,
  });

  const activeCar = CAR_PRESETS.find((c) => c.id === selectedCar) ?? CAR_PRESETS[0];
  const isDriving = telemetry.phase === 'playing' || telemetry.phase === 'countdown';
  const isReplay = telemetry.phase === 'replay';

  useEffect(() => {
    if (!isDriving) {
      setTouchState({
        wheelSteer: 0,
        arrowLeft: false,
        arrowRight: false,
        accel: false,
        brake: false,
        boost: false,
      });
    }
  }, [isDriving]);

  useEffect(() => {
    const arrowSteer = (touchState.arrowRight ? 1 : 0) - (touchState.arrowLeft ? 1 : 0);
    const effectiveSteer =
      Math.abs(touchState.wheelSteer) > 0.02 ? touchState.wheelSteer : arrowSteer;
    onTouchInput(effectiveSteer, touchState.boost, touchState.brake, touchState.accel);
  }, [touchState, onTouchInput]);

  const handleWheelSteer = useCallback((wheelSteer: number) => {
    setTouchState((s) => (s.wheelSteer === wheelSteer ? s : { ...s, wheelSteer }));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const levelPct = Math.min(100, Math.round(telemetry.levelProgress * 100));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Subtle Screen-Space Nitro Speed-Tunnel Framing (compositor opacity only) */}
      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-0 -z-10 transition-opacity duration-200 ${
          telemetry.isBoosting && (isDriving || isReplay) ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          background:
            'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 56%, rgba(6,182,212,0.14) 84%, rgba(239,68,68,0.18) 100%)',
        }}
      />

      {/* Top Bar Telemetry & Controls */}
      <header className="flex items-start justify-between gap-4">
        {/* Top-Left: Brand + Live Score & Unlimited Level */}
        <div className="pointer-events-auto flex flex-col gap-2.5">
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-4 py-2">
            <GameLogo size="sm" showWordmark />
            {savedStats.highScore > 0 && telemetry.phase === 'menu' && (
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 tabular-nums whitespace-nowrap">
                <span aria-hidden="true">·</span>
                <span>Best Lv.{savedStats.bestLevel}</span>
                <span aria-hidden="true">·</span>
                <span>{savedStats.highScore.toLocaleString()}</span>
                <span aria-hidden="true">·</span>
                <span>{savedStats.bestSpeedKmh} km/h</span>
              </div>
            )}
            {telemetry.phase !== 'menu' && (
              <div className="flex items-center gap-3 border-l border-white/10 pl-3 text-xs sm:text-sm tabular-nums whitespace-nowrap">
                <span className="font-display font-bold text-amber-400">
                  Lv.{telemetry.level}
                </span>
                <span className="text-slate-600" aria-hidden="true">
                  ·
                </span>
                <div>
                  <span className="text-slate-400 mr-1.5">Score</span>
                  <span className="font-display font-bold text-white">
                    {telemetry.score.toLocaleString()}
                  </span>
                </div>
                <span className="text-slate-600" aria-hidden="true">
                  /
                </span>
                <div>
                  <span className="font-display font-semibold text-slate-200">
                    {telemetry.distanceKm.toFixed(2)} km
                  </span>
                </div>
                {telemetry.combo > 1 && (
                  <>
                    <span className="text-slate-600" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-display font-bold text-amber-400">
                      ×{telemetry.combo}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <DailyMissionHUD missions={dailyMissions} onClaimReward={onClaimDailyMission} />
          {(isDriving || isReplay) && (
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#0a0c12]/80 px-3 py-1.5 text-xs text-slate-300">
              <Flag className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="font-display font-semibold text-slate-200 whitespace-nowrap tabular-nums">
                {isReplay ? 'Replay' : `Level ${telemetry.level}`}
              </span>
              <div className="h-1.5 flex-1 min-w-[110px] overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-emerald-400 transition-all duration-100"
                  style={{ width: `${isReplay ? Math.round(telemetry.replayProgress * 100) : levelPct}%` }}
                />
              </div>
              <span className="font-display tabular-nums text-slate-200">
                {isReplay
                  ? `${Math.round(telemetry.replayProgress * 100)}%`
                  : `${telemetry.levelTargetKm.toFixed(2)} km`}
              </span>
              {isDriving && telemetry.raceTimeMs > 0 && (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {formatRaceTime(telemetry.raceTimeMs)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Armor Shields & Utility Actions */}
        <div className="pointer-events-auto flex items-center gap-2 shrink-0">
          {telemetry.phase !== 'menu' && (
            <div
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 py-2"
              aria-label={`Shield integrity ${telemetry.shields} of ${telemetry.maxShields}`}
            >
              <Shield className="h-4 w-4 text-slate-300 shrink-0" />
              <div className="flex items-center gap-1">
                {Array.from({ length: telemetry.maxShields }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2.5 w-5 rounded-sm transition-colors duration-150 ${
                      idx < telemetry.shields ? 'bg-amber-500' : 'bg-slate-700/80'
                    }`}
                  />
                ))}
              </div>
              <span className="hidden sm:inline text-xs font-medium text-slate-300 tabular-nums">
                {telemetry.shields}/{telemetry.maxShields}
              </span>
            </div>
          )}

          {!isDriving && (
            <>
              <button
                type="button"
                onClick={onOpenAds}
                title="Watch Game Promo & Sponsor Ads"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Tv className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="hidden sm:inline">Game Ads</span>
              </button>
              <button
                type="button"
                onClick={onOpenAchievements}
                title="Career Achievements"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Award className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="hidden md:inline">Achievements</span>
                <span className="text-slate-400 tabular-nums">
                  {unlockedAchievementsCount}/{totalAchievementsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenRoadmap}
                title="Highway & Feature Roadmap"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Map className="h-4 w-4 text-cyan-400 shrink-0" />
                <span className="hidden lg:inline">Roadmap</span>
              </button>
              <button
                type="button"
                onClick={onOpenLeaderboard}
                title="Global Top 10 Leaderboard"
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Leaderboard</span>
              </button>
            </>
          )}

          {!isReplay && (
            <button
              type="button"
              onClick={onOpenSettings}
              title="Settings & Tuning"
              aria-label="Open Settings"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <SlidersHorizontal className="h-4 w-4 text-slate-300 shrink-0" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const order: CameraMode[] = isReplay
                ? ['cinematic', 'chase', 'bumper', 'hood']
                : ['chase', 'bumper', 'hood'];
              const next = order[(order.indexOf(cameraMode) + 1) % order.length];
              onSelectCamera(next);
            }}
            title="Cycle Camera (C)"
            className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="h-4 w-4 text-slate-300" />
            <span className="hidden sm:inline capitalize">{cameraMode}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Unmute Audio (M)' : 'Mute Audio (M)'}
            aria-label={muted ? 'Unmute Audio' : 'Mute Audio'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#0a0c12]/85 text-slate-200 hover:bg-[#141824] hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            {muted ? <VolumeX className="h-4 w-4 text-rose-400" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {(telemetry.phase === 'playing' || telemetry.phase === 'paused') && (
            <button
              type="button"
              onClick={onTogglePause}
              title={telemetry.phase === 'paused' ? 'Resume (P)' : 'Pause (P)'}
              aria-label={telemetry.phase === 'paused' ? 'Resume Race' : 'Pause Race'}
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 text-xs font-medium text-slate-200 hover:bg-[#141824] hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {telemetry.phase === 'paused' ? (
                <>
                  <Play className="h-4 w-4 text-amber-400" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-4 w-4" />
                  <span className="hidden sm:inline">Pause</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Center Overlays: Countdown, Floating Callouts, Menu / Pause / Game Over */}
      <div className="relative flex flex-1 items-center justify-center">
        {/* Weather Hazard Approaching Warning Banner */}
        {isDriving && telemetry.upcomingHazard && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-xl border border-rose-500/50 bg-[#0a0c12]/92 px-4 py-2 text-xs sm:text-sm font-bold text-rose-200 shadow-xl tabular-nums">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
            <span>
              ⚠️ HAZARD AHEAD: {telemetry.upcomingHazard.kind === 'oil' ? 'OIL SLICK' : 'SAND PATCH'} IN {telemetry.upcomingHazard.distanceMeters}m
            </span>
          </div>
        )}

        {/* 3D Animated Countdown Overlay */}
        {(telemetry.phase === 'countdown' || telemetry.countdownGo) && (
          <CountdownOverlay
            phase={telemetry.phase}
            countdownValue={telemetry.countdownValue}
            countdownGo={telemetry.countdownGo}
          />
        )}

        {/* Near-Miss & Pickup Callouts */}
        {isDriving && callouts.length > 0 && (
          <div className="pointer-events-none absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
            {callouts.slice(-2).map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#0a0c12]/85 px-3.5 py-1.5 text-sm font-semibold tabular-nums"
              >
                <span
                  className={
                    c.tone === 'amber'
                      ? 'text-amber-400'
                      : c.tone === 'cyan'
                        ? 'text-cyan-400'
                        : 'text-rose-400'
                  }
                >
                  {c.label}
                </span>
                <span className="text-slate-400" aria-hidden="true">
                  ·
                </span>
                <span className="font-display text-white">{c.points}</span>
              </div>
            ))}
          </div>
        )}

        {/* Menu Launch Card (Positioned cleanly to keep car visible) */}
        {telemetry.phase === 'menu' && (
          <div className="pointer-events-auto mb-24 flex flex-col items-center text-center max-w-lg px-6 py-6 rounded-2xl border border-white/10 bg-[#0a0c12]/82">
            <GameLogo size="lg" className="mb-3" />
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white [text-wrap:balance]">
              Highway Pursuit
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
              Weave through highway traffic at 300 km/h, thread near-misses for combo multipliers, and
              ignite nitro on open straights.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 tabular-nums">
              <span>{activeCar.name}</span>
              <span aria-hidden="true">·</span>
              <span>Top {activeCar.topSpeedKmh} km/h</span>
              <span aria-hidden="true">·</span>
              <span>W / Arrows Drive</span>
              <span aria-hidden="true">·</span>
              <span>Space Nitro</span>
            </div>

            {/* Weather Condition Toggle inside Game Menu */}
            <div className="mt-4 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
              {WEATHER_PRESETS.map((w) => {
                const active = w.id === selectedWeather;
                const Icon =
                  w.id === 'sunny' ? Sun : w.id === 'rainy' ? CloudRain : CloudLightning;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onSelectWeather(w.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                        : 'text-slate-400 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{w.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={onStartRace}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-7 py-3 text-sm font-bold text-slate-950 hover:bg-amber-400 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{sponsorBonusActive ? 'Start (+1,500)' : 'Start Race'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Top 10</span>
              </button>
              <button
                type="button"
                onClick={onOpenAchievements}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer tabular-nums"
              >
                <Award className="h-4 w-4 text-amber-400" />
                <span>
                  Badges {unlockedAchievementsCount}/{totalAchievementsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenRoadmap}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Map className="h-4 w-4 text-cyan-400" />
                <span>Roadmap</span>
              </button>
              <button
                type="button"
                onClick={onOpenAds}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Tv className="h-4 w-4 text-cyan-300" />
                <span>Watch Ad</span>
              </button>
            </div>
            {sponsorBonusActive && (
              <p className="mt-3 text-xs font-medium text-emerald-400 tabular-nums">
                Sponsor bonus active · +1,500 starting score ready
              </p>
            )}
          </div>
        )}

        {/* Pause Modal */}
        {telemetry.phase === 'paused' && (
          <div className="pointer-events-auto mb-16 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0a0c12]/92 p-6 text-center">
            <h2 className="font-display text-2xl font-bold text-white">Race Paused</h2>
            <p className="mt-1.5 text-sm text-slate-400 tabular-nums">
              Score {telemetry.score.toLocaleString()} · {telemetry.distanceKm.toFixed(2)} km
            </p>
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTogglePause}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={onStartRace}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Restart</span>
              </button>
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Settings</span>
              </button>
              <button
                type="button"
                onClick={onReturnToMenu}
                className="flex w-full items-center justify-center rounded-xl px-5 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Return to Garage
              </button>
            </div>
          </div>
        )}

        {/* Game Over / Run Summary Modal */}
        {telemetry.phase === 'gameover' && (
          <div className="pointer-events-auto mb-16 w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0c12]/92 p-6">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold text-white">
                Level {telemetry.level} Reached
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {telemetry.score >= savedStats.highScore && telemetry.score > 0
                  ? 'New personal best recorded'
                  : telemetry.sprintTimeMs !== null
                    ? `1.50 km split ${formatRaceTime(telemetry.sprintTimeMs)}${latestSubmissionRank !== null ? ` · #${latestSubmissionRank} Global` : ''}`
                    : 'Final session telemetry'}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4 text-left">
              <div>
                <div className="text-xs text-slate-400">Final Score</div>
                <div className="font-display text-2xl font-bold text-amber-400 tabular-nums">
                  {telemetry.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Distance</div>
                <div className="font-display text-2xl font-bold text-white tabular-nums">
                  {telemetry.distanceKm.toFixed(2)} km
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Top Speed</div>
                <div className="font-display text-lg font-semibold text-slate-200 tabular-nums">
                  {telemetry.topSpeedReached} km/h
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Near Misses</div>
                <div className="font-display text-lg font-semibold text-slate-200 tabular-nums">
                  {telemetry.nearMisses}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={onStartRace}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Play Again</span>
              </button>
              {telemetry.hasReplay && (
                <button
                  type="button"
                  onClick={onStartReplay}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/25 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Film className="h-4 w-4" />
                  <span>Watch Replay</span>
                </button>
              )}
              <button
                type="button"
                onClick={onOpenAchievements}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer tabular-nums"
              >
                <Award className="h-4 w-4 text-amber-400" />
                <span>
                  Achievements {unlockedAchievementsCount}/{totalAchievementsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trophy className="h-4 w-4 text-amber-400" />
                <span>Leaderboard</span>
              </button>
              <button
                type="button"
                onClick={onOpenRoadmap}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Map className="h-4 w-4 text-cyan-400" />
                <span>Roadmap</span>
              </button>
              <button
                type="button"
                onClick={onOpenAds}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-200 hover:bg-cyan-500/20 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Tv className="h-4 w-4 text-cyan-300" />
                <span>{sponsorBonusActive ? 'Bonus Ready' : 'Ad (+1,500)'}</span>
              </button>
              <button
                type="button"
                onClick={onReturnToMenu}
                className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                Garage
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Area: Driving HUD, Replay Broadcast Bar, OR Collapsible Garage Dock */}
      {isReplay ? (
        <div className="flex items-end justify-between gap-4">
          <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-[#0a0c12]/88 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 whitespace-nowrap">
              <Film className="h-4 w-4" />
              <span>Race Replay</span>
            </div>

            <div className="h-1.5 w-32 sm:w-44 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-cyan-400 transition-all duration-75"
                style={{ width: `${Math.round(telemetry.replayProgress * 100)}%` }}
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-white/5 p-0.5">
              {([1, 2] as const).map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onSetReplaySpeed(spd)}
                  className={`rounded-md px-2 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    telemetry.replaySpeed === spd
                      ? 'bg-cyan-500/25 text-cyan-200'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}×
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onStopReplay}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/15 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Exit Replay</span>
            </button>
          </div>

          <div className="pointer-events-auto min-w-[180px] sm:min-w-[220px] rounded-xl border border-white/10 bg-[#0a0c12]/85 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold tracking-tight text-white tabular-nums">
                  {telemetry.speedKmh}
                </span>
                <span className="text-xs font-medium text-slate-400">km/h</span>
              </div>
              <span className="font-display text-sm font-bold text-amber-400 tabular-nums">
                G{telemetry.gear}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-75 ${
                  telemetry.rpmRatio > 0.86 ? 'bg-red-500' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.round(telemetry.rpmRatio * 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : isDriving ? (
        <div className="flex items-end justify-between gap-2 sm:gap-4">
          {/* Bottom-Left: Steering Wheel + Left/Right Buttons + Desktop Legend */}
          <div className="flex items-end gap-2.5 sm:gap-3">
            {(controlLayout === 'both' || controlLayout === 'wheel') &&
              (wheelVisible ? (
                <div className="pointer-events-auto flex flex-col items-start gap-1">
                  <SteeringWheel
                    externalSteer={telemetry.steerInput}
                    onSteerChange={handleWheelSteer}
                    disabled={telemetry.phase !== 'playing'}
                  />
                  <button
                    type="button"
                    onClick={() => setWheelVisible(false)}
                    className="hidden md:inline-flex items-center gap-1 rounded-lg border border-white/10 bg-[#0a0c12]/80 px-2.5 py-1 text-[11px] font-medium text-slate-400 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Hide Wheel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setWheelVisible(true)}
                  className="pointer-events-auto rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Show Wheel
                </button>
              ))}

            {/* Left / Right Directional Steering Buttons */}
            {(controlLayout === 'both' || controlLayout === 'buttons') && (
              <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2 mb-5 sm:mb-6">
                <button
                  type="button"
                  aria-label="Steer Left"
                  onPointerDown={() => setTouchState((s) => ({ ...s, arrowLeft: true }))}
                  onPointerUp={() => setTouchState((s) => ({ ...s, arrowLeft: false }))}
                  onPointerLeave={() => setTouchState((s) => ({ ...s, arrowLeft: false }))}
                  onPointerCancel={() => setTouchState((s) => ({ ...s, arrowLeft: false }))}
                  className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border transition-colors select-none touch-none cursor-pointer ${
                    touchState.arrowLeft
                      ? 'border-amber-300 bg-amber-500 text-slate-950'
                      : 'border-white/15 bg-[#0a0c12]/85 text-white hover:bg-[#141824]'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Steer Right"
                  onPointerDown={() => setTouchState((s) => ({ ...s, arrowRight: true }))}
                  onPointerUp={() => setTouchState((s) => ({ ...s, arrowRight: false }))}
                  onPointerLeave={() => setTouchState((s) => ({ ...s, arrowRight: false }))}
                  onPointerCancel={() => setTouchState((s) => ({ ...s, arrowRight: false }))}
                  className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border transition-colors select-none touch-none cursor-pointer ${
                    touchState.arrowRight
                      ? 'border-amber-300 bg-amber-500 text-slate-950'
                      : 'border-white/15 bg-[#0a0c12]/85 text-white hover:bg-[#141824]'
                  }`}
                >
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>
            )}

            {/* Desktop Subtle Controls Legend */}
            <div className="hidden xl:flex items-center gap-2 mb-6 rounded-xl border border-white/10 bg-[#0a0c12]/78 px-3.5 py-2 text-xs text-slate-400">
              <span>Wheel / L·R / A·D Steer</span>
              <span aria-hidden="true">·</span>
              <span>W / Speed+</span>
              <span aria-hidden="true">·</span>
              <span>Space Nitro</span>
              <span aria-hidden="true">·</span>
              <span>C Camera</span>
            </div>
          </div>

          {/* Right Cluster: Brake, Speed+ & Nitro Pedals + Speedometer */}
          <div className="flex flex-col sm:flex-row items-end gap-2 sm:gap-3">
            <div className="pointer-events-auto flex items-end gap-1.5 sm:gap-2">
              <button
                type="button"
                aria-label="Brake"
                onPointerDown={() => setTouchState((s) => ({ ...s, brake: true }))}
                onPointerUp={() => setTouchState((s) => ({ ...s, brake: false }))}
                onPointerLeave={() => setTouchState((s) => ({ ...s, brake: false }))}
                onPointerCancel={() => setTouchState((s) => ({ ...s, brake: false }))}
                className={`flex h-12 sm:h-14 items-center justify-center rounded-xl border px-2.5 sm:px-3.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 select-none touch-none cursor-pointer ${
                  touchState.brake
                    ? 'border-rose-400 bg-rose-500 text-white'
                    : 'border-white/15 bg-[#0a0c12]/85 text-slate-200 hover:bg-[#141824]'
                }`}
              >
                <span>Brake</span>
              </button>

              <button
                type="button"
                aria-label="Increase Speed"
                onPointerDown={() => setTouchState((s) => ({ ...s, accel: true }))}
                onPointerUp={() => setTouchState((s) => ({ ...s, accel: false }))}
                onPointerLeave={() => setTouchState((s) => ({ ...s, accel: false }))}
                onPointerCancel={() => setTouchState((s) => ({ ...s, accel: false }))}
                className={`flex h-13 sm:h-16 items-center justify-center gap-1 rounded-xl border px-3 sm:px-4 text-xs font-bold transition-colors whitespace-nowrap shrink-0 select-none touch-none cursor-pointer ${
                  touchState.accel
                    ? 'border-amber-300 bg-amber-500 text-slate-950'
                    : 'border-amber-400/40 bg-[#0a0c12]/85 text-amber-300 hover:bg-[#141824]'
                }`}
              >
                <Gauge className="h-4 w-4 shrink-0" />
                <span>Speed +</span>
              </button>

              <button
                type="button"
                aria-label="Activate Nitro"
                onPointerDown={() => setTouchState((s) => ({ ...s, boost: true }))}
                onPointerUp={() => setTouchState((s) => ({ ...s, boost: false }))}
                onPointerLeave={() => setTouchState((s) => ({ ...s, boost: false }))}
                onPointerCancel={() => setTouchState((s) => ({ ...s, boost: false }))}
                className={`flex h-12 sm:h-14 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3.5 text-xs font-bold transition-colors whitespace-nowrap shrink-0 select-none touch-none cursor-pointer ${
                  telemetry.isBoosting || touchState.boost
                    ? 'border-cyan-300 bg-cyan-400 text-slate-950'
                    : 'border-cyan-400/35 bg-[#0a0c12]/85 text-cyan-300 hover:bg-[#141824]'
                }`}
              >
                <Flame className="h-4 w-4 shrink-0" />
                <span>Nitro</span>
              </button>
            </div>

            <div className="pointer-events-auto min-w-[165px] sm:min-w-[230px] rounded-xl border border-white/10 bg-[#0a0c12]/85 px-3.5 sm:px-4 py-2.5 sm:py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-white tabular-nums">
                    {telemetry.speedKmh}
                  </span>
                  <span className="text-xs font-medium text-slate-400">km/h</span>
                </div>
                <div className="flex items-center gap-1.5 tabular-nums">
                  {speedMultiplier > 1.01 && (
                    <span className="text-[11px] font-medium text-cyan-300">
                      {speedMultiplier.toFixed(2)}×
                    </span>
                  )}
                  <span className="font-display text-sm font-bold text-amber-400">
                    G{telemetry.gear}
                  </span>
                </div>
              </div>

              {/* RPM Bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    telemetry.rpmRatio > 0.86 ? 'bg-red-500' : 'bg-amber-400'
                  }`}
                  style={{ width: `${Math.round(telemetry.rpmRatio * 100)}%` }}
                />
              </div>

              {/* Nitro Gauge */}
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-medium text-cyan-300">
                  <Flame className="h-3.5 w-3.5" />
                  <span>Nitro</span>
                </span>
                <span className="font-display font-semibold text-slate-200 tabular-nums">
                  {telemetry.nitro}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    telemetry.isBoosting ? 'bg-white' : 'bg-cyan-400'
                  }`}
                  style={{ width: `${telemetry.nitro}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsible Unified Bottom Garage Dock (Menu / Paused / Game Over) */
        <div className="pointer-events-none flex flex-col items-center">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 border-white/10 bg-[#0a0c12]/88 px-3 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Show Garage Dock (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Hide Controls (H)</span>
              </>
            )}
          </button>

          {!dockCollapsed && (
            <div className="pointer-events-auto flex w-full max-w-[1060px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0c12]/88 px-4 py-3">
              {/* Car Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 mr-1 whitespace-nowrap">
                  Vehicle
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                  {CAR_PRESETS.map((car) => {
                    const active = car.id === selectedCar;
                    return (
                      <button
                        key={car.id}
                        type="button"
                        onClick={() => onSelectCar(car.id)}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white/15 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: car.swatchCss }}
                        />
                        <span>{car.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Track Environment Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 mr-1 whitespace-nowrap">
                  Circuit
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                  {TRACK_PRESETS.map((track) => {
                    const active = track.id === selectedTrack;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => onSelectTrack(track.id)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-amber-500 text-slate-950 font-semibold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {track.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Weather Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 mr-1 whitespace-nowrap">
                  Weather
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                  {WEATHER_PRESETS.map((w) => {
                    const active = w.id === selectedWeather;
                    const Icon =
                      w.id === 'sunny' ? Sun : w.id === 'rainy' ? CloudRain : CloudLightning;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onSelectWeather(w.id)}
                        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-cyan-500/25 text-cyan-200'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{w.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Camera Mode Selector */}
              <div className="hidden xl:flex items-center gap-2">
                <span className="text-xs font-medium text-slate-400 mr-1 whitespace-nowrap">
                  View
                </span>
                <div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
                  {CAMERA_OPTIONS.map((opt) => {
                    const active = opt.id === cameraMode;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => onSelectCamera(opt.id)}
                        className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white/15 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
