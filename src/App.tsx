import { useCallback, useEffect, useRef, useState } from 'react';
import { AchievementToast } from './components/AchievementToast';
import { AchievementsModal } from './components/AchievementsModal';
import { AdShowcaseModal } from './components/AdShowcaseModal';
import { GameHUD } from './components/GameHUD';
import { LeaderboardModal } from './components/LeaderboardModal';
import { RoadmapModal } from './components/RoadmapModal';
import { SettingsModal } from './components/SettingsModal';
import { RacingEngine } from './game/RacingEngine';
import {
  ACHIEVEMENT_DEFINITIONS,
  applyCareerUpdate,
  loadAchievementsStore,
  saveAchievementsStore,
  type AchievementDefinition,
  type AchievementsStore,
} from './services/achievementsService';
import {
  fetchTopLeaderboard,
  getSavedDriverName,
  saveDriverName,
  submitRaceTime,
  type LeaderboardEntry,
} from './services/leaderboardService';
import type {
  CameraMode,
  CarId,
  ControlLayoutMode,
  EngineAudioProfile,
  FloatingCallout,
  GameTelemetry,
  SavedStats,
  TrackId,
  WeatherMode,
} from './game/types';

const STATS_STORAGE_KEY = 'apex_velocity_stats_v1';
const AUDIO_PROFILE_STORAGE_KEY = 'apex_velocity_audio_profile_v1';
const TUNING_STORAGE_KEY = 'apex_velocity_tuning_v1';

const INITIAL_TELEMETRY: GameTelemetry = {
  phase: 'menu',
  weather: 'sunny',
  engineAudioProfile: 'aggressive',
  countdownValue: 3,
  countdownGo: false,
  speedKmh: 0,
  gear: 1,
  rpmRatio: 0.2,
  nitro: 100,
  isBoosting: false,
  score: 0,
  distanceKm: 0,
  combo: 1,
  nearMisses: 0,
  shields: 3,
  maxShields: 3,
  topSpeedReached: 0,
  steerInput: 0,
  raceTimeMs: 0,
  sprintTimeMs: null,
  level: 1,
  levelProgress: 0,
  levelTargetKm: 1.5,
  finishReason: 'none',
  finishDistanceKm: 1.5,
  upcomingHazard: null,
  hasReplay: false,
  replayProgress: 0,
  replaySpeed: 1,
};

function loadSavedStats(): SavedStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return { highScore: 0, bestDistanceKm: 0, bestSpeedKmh: 0, bestLevel: 1 };
    const parsed = JSON.parse(raw) as Partial<SavedStats>;
    return {
      highScore: typeof parsed.highScore === 'number' ? parsed.highScore : 0,
      bestDistanceKm: typeof parsed.bestDistanceKm === 'number' ? parsed.bestDistanceKm : 0,
      bestSpeedKmh: typeof parsed.bestSpeedKmh === 'number' ? parsed.bestSpeedKmh : 0,
      bestLevel: typeof parsed.bestLevel === 'number' ? Math.max(1, parsed.bestLevel) : 1,
    };
  } catch {
    return { highScore: 0, bestDistanceKm: 0, bestSpeedKmh: 0, bestLevel: 1 };
  }
}

function loadAudioProfile(): EngineAudioProfile {
  try {
    const raw = localStorage.getItem(AUDIO_PROFILE_STORAGE_KEY);
    if (raw === 'aggressive' || raw === 'silent' || raw === 'muscle') {
      return raw;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'aggressive';
}

interface TuningSettings {
  controlLayout: ControlLayoutMode;
  steeringSensitivity: number;
  speedMultiplier: number;
  autoAccelerate: boolean;
}

const DEFAULT_TUNING: TuningSettings = {
  controlLayout: 'both',
  steeringSensitivity: 1.0,
  speedMultiplier: 1.0,
  autoAccelerate: false,
};

function loadTuningSettings(): TuningSettings {
  try {
    const raw = localStorage.getItem(TUNING_STORAGE_KEY);
    if (!raw) return DEFAULT_TUNING;
    const parsed = JSON.parse(raw) as Partial<TuningSettings>;
    const controlLayout: ControlLayoutMode =
      parsed.controlLayout === 'both' ||
      parsed.controlLayout === 'wheel' ||
      parsed.controlLayout === 'buttons'
        ? parsed.controlLayout
        : 'both';
    const steeringSensitivity =
      typeof parsed.steeringSensitivity === 'number'
        ? Math.min(1.6, Math.max(0.6, parsed.steeringSensitivity))
        : 1.0;
    const speedMultiplier =
      typeof parsed.speedMultiplier === 'number'
        ? Math.min(1.35, Math.max(0.85, parsed.speedMultiplier))
        : 1.0;
    const autoAccelerate = Boolean(parsed.autoAccelerate);
    return { controlLayout, steeringSensitivity, speedMultiplier, autoAccelerate };
  } catch {
    return DEFAULT_TUNING;
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RacingEngine | null>(null);

  const [selectedCar, setSelectedCar] = useState<CarId>('veloce-gt');
  const [selectedTrack, setSelectedTrack] = useState<TrackId>('sunset-coast');
  const [selectedWeather, setSelectedWeather] = useState<WeatherMode>('sunny');
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [muted, setMuted] = useState(false);
  const [telemetry, setTelemetry] = useState<GameTelemetry>(INITIAL_TELEMETRY);
  const [callouts, setCallouts] = useState<FloatingCallout[]>([]);
  const [savedStats, setSavedStats] = useState<SavedStats>(() => loadSavedStats());
  const [contextLost, setContextLost] = useState(false);

  // Global Leaderboard state (simulated backend)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [leaderboardFilter, setLeaderboardFilter] = useState<TrackId | 'all'>('all');
  const [driverName, setDriverName] = useState<string>(() => getSavedDriverName());
  const [latestPlayerEntryId, setLatestPlayerEntryId] = useState<string | null>(null);
  const [latestSubmissionRank, setLatestSubmissionRank] = useState<number | null>(null);
  const [latestSubmissionTimeMs, setLatestSubmissionTimeMs] = useState<number | null>(null);

  // Game Promo & Sponsor Ad Showcase, Settings & Achievements state
  const [adOpen, setAdOpen] = useState(false);
  const [sponsorBonusActive, setSponsorBonusActive] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [achievementsStore, setAchievementsStore] = useState<AchievementsStore>(() =>
    loadAchievementsStore()
  );
  const achievementsStoreRef = useRef<AchievementsStore>(achievementsStore);
  achievementsStoreRef.current = achievementsStore;
  const runDeltaRef = useRef({ nearMisses: 0, distanceKm: 0 });
  const [toastQueue, setToastQueue] = useState<AchievementDefinition[]>([]);
  const [audioProfile, setAudioProfile] = useState<EngineAudioProfile>(() => loadAudioProfile());
  const [tuning, setTuning] = useState<TuningSettings>(() => loadTuningSettings());

  const selectionRef = useRef({
    car: selectedCar,
    track: selectedTrack,
    weather: selectedWeather,
    driverName,
  });
  selectionRef.current = {
    car: selectedCar,
    track: selectedTrack,
    weather: selectedWeather,
    driverName,
  };

  const loadLeaderboard = useCallback(async (filter: TrackId | 'all') => {
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const entries = await fetchTopLeaderboard(filter);
      setLeaderboardEntries(entries);
    } catch {
      setLeaderboardError('Unable to reach leaderboard service. Please try again.');
    } finally {
      setLeaderboardLoading(false);
    }
  }, []);

  const handleOpenLeaderboard = useCallback(() => {
    setLeaderboardOpen(true);
    void loadLeaderboard(leaderboardFilter);
  }, [leaderboardFilter, loadLeaderboard]);

  const handleCloseLeaderboard = useCallback(() => {
    setLeaderboardOpen(false);
  }, []);

  const handleChangeLeaderboardFilter = useCallback(
    (filter: TrackId | 'all') => {
      setLeaderboardFilter(filter);
      void loadLeaderboard(filter);
    },
    [loadLeaderboard]
  );

  const handleRefreshLeaderboard = useCallback(() => {
    void loadLeaderboard(leaderboardFilter);
  }, [leaderboardFilter, loadLeaderboard]);

  const handleSaveDriverName = useCallback((name: string) => {
    const saved = saveDriverName(name);
    setDriverName(saved);
  }, []);

  const applyAchievementProgress = useCallback(
    (
      update: {
        speedKmh?: number;
        nearMissDelta?: number;
        distanceDeltaKm?: number;
        combo?: number;
        level?: number;
        score?: number;
        raceWon?: boolean;
        weather?: WeatherMode;
      },
      forcePersist = false
    ) => {
      const { nextStore, newlyUnlocked, changed } = applyCareerUpdate(
        achievementsStoreRef.current,
        update
      );
      if (changed) {
        achievementsStoreRef.current = nextStore;
        setAchievementsStore(nextStore);
        if (
          forcePersist ||
          newlyUnlocked.length > 0 ||
          (update.nearMissDelta ?? 0) > 0 ||
          update.raceWon
        ) {
          saveAchievementsStore(nextStore);
        }
      } else if (forcePersist) {
        saveAchievementsStore(achievementsStoreRef.current);
      }
      if (newlyUnlocked.length > 0) {
        engineRef.current?.playAchievementSound();
        setToastQueue((prev) => [...prev, ...newlyUnlocked]);
      }
    },
    []
  );

  const handleOpenAchievements = useCallback(() => {
    setAchievementsOpen(true);
  }, []);

  const handleCloseAchievements = useCallback(() => {
    setAchievementsOpen(false);
  }, []);

  const handleOpenRoadmap = useCallback(() => {
    setRoadmapOpen(true);
  }, []);

  const handleCloseRoadmap = useCallback(() => {
    setRoadmapOpen(false);
  }, []);

  const handleDismissToast = useCallback(() => {
    setToastQueue((prev) => prev.slice(1));
  }, []);

  useEffect(() => {
    if (toastQueue.length === 0) return;
    const timer = window.setTimeout(() => {
      setToastQueue((prev) => prev.slice(1));
    }, 4200);
    return () => window.clearTimeout(timer);
  }, [toastQueue]);

  const handleSprintComplete = useCallback(
    (sprintTelemetry: GameTelemetry) => {
      const current = selectionRef.current;
      applyAchievementProgress(
        {
          speedKmh: sprintTelemetry.topSpeedReached,
          combo: sprintTelemetry.combo,
          level: sprintTelemetry.level,
          score: sprintTelemetry.score,
          raceWon: true,
          weather: current.weather,
        },
        true
      );

      const splitMs = sprintTelemetry.sprintTimeMs ?? sprintTelemetry.raceTimeMs;
      if (splitMs <= 0) return;
      void submitRaceTime({
        driverName: current.driverName,
        timeMs: splitMs,
        trackId: current.track,
        carId: current.car,
        weather: current.weather,
        topSpeedKmh: sprintTelemetry.topSpeedReached,
      })
        .then((result) => {
          setLatestPlayerEntryId(result.entry.id);
          setLatestSubmissionRank(result.globalRank);
          setLatestSubmissionTimeMs(result.entry.timeMs);
        })
        .catch(() => {
          // Non-blocking leaderboard submission error
        });
    },
    [applyAchievementProgress]
  );

  const handleGameOver = useCallback(
    (finalTelemetry: GameTelemetry) => {
      applyAchievementProgress(
        {
          speedKmh: finalTelemetry.topSpeedReached,
          combo: finalTelemetry.combo,
          level: finalTelemetry.level,
          score: finalTelemetry.score,
        },
        true
      );
      setSavedStats((prev) => {
        const next: SavedStats = {
          highScore: Math.max(prev.highScore, finalTelemetry.score),
          bestDistanceKm: Math.max(prev.bestDistanceKm, finalTelemetry.distanceKm),
          bestSpeedKmh: Math.max(prev.bestSpeedKmh, finalTelemetry.topSpeedReached),
          bestLevel: Math.max(prev.bestLevel, finalTelemetry.level),
        };
        try {
          localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    [applyAchievementProgress]
  );

  const handleCallout = useCallback((callout: FloatingCallout) => {
    setCallouts((prev) => [...prev.slice(-3), callout]);
    window.setTimeout(() => {
      setCallouts((prev) => prev.filter((item) => item.id !== callout.id));
    }, 1350);
  }, []);

  const handleTelemetryTick = useCallback(
    (data: GameTelemetry) => {
      setTelemetry(data);
      if (data.phase === 'playing') {
        const nearMissDelta = Math.max(0, data.nearMisses - runDeltaRef.current.nearMisses);
        const distanceDeltaKm = Math.max(0, data.distanceKm - runDeltaRef.current.distanceKm);
        runDeltaRef.current = {
          nearMisses: data.nearMisses,
          distanceKm: data.distanceKm,
        };
        applyAchievementProgress({
          speedKmh: data.topSpeedReached,
          nearMissDelta,
          distanceDeltaKm,
          combo: data.combo,
          level: data.level,
          score: data.score,
        });
      }
    },
    [applyAchievementProgress]
  );

  const callbacksRef = useRef({
    onTelemetry: handleTelemetryTick,
    onCallout: handleCallout,
    onSprintComplete: handleSprintComplete,
    onGameOver: handleGameOver,
    onContextLost: setContextLost,
  });
  callbacksRef.current = {
    onTelemetry: handleTelemetryTick,
    onCallout: handleCallout,
    onSprintComplete: handleSprintComplete,
    onGameOver: handleGameOver,
    onContextLost: setContextLost,
  };

  const lastPhaseRef = useRef(telemetry.phase);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new RacingEngine(mount, 'veloce-gt', 'sunset-coast', 'sunny', {
      onTelemetry: (data) => {
        callbacksRef.current.onTelemetry(data);
        if (lastPhaseRef.current !== data.phase) {
          if (data.phase === 'replay') {
            setCameraMode('cinematic');
          } else if (lastPhaseRef.current === 'replay') {
            setCameraMode((prev) => (prev === 'cinematic' ? 'chase' : prev));
          }
          lastPhaseRef.current = data.phase;
        }
      },
      onCallout: (c) => callbacksRef.current.onCallout(c),
      onSprintComplete: (s) => callbacksRef.current.onSprintComplete(s),
      onGameOver: (finalData) => callbacksRef.current.onGameOver(finalData),
      onContextLost: (lost) => callbacksRef.current.onContextLost(lost),
    });
    engine.setEngineAudioProfile(loadAudioProfile(), false);
    const initialTuning = loadTuningSettings();
    engine.setSteeringSensitivity(initialTuning.steeringSensitivity);
    engine.setSpeedMultiplier(initialTuning.speedMultiplier);
    engine.setAutoAccelerate(initialTuning.autoAccelerate);
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const modalOpenRef = useRef(
    leaderboardOpen || adOpen || settingsOpen || achievementsOpen || roadmapOpen
  );
  modalOpenRef.current =
    leaderboardOpen || adOpen || settingsOpen || achievementsOpen || roadmapOpen;

  // Global keyboard shortcuts for Camera (C), Mute (M), Pause (P / Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (roadmapOpen) {
          setRoadmapOpen(false);
          return;
        }
        if (achievementsOpen) {
          setAchievementsOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (adOpen) {
          setAdOpen(false);
          return;
        }
        if (leaderboardOpen) {
          setLeaderboardOpen(false);
          return;
        }
      }
      const engine = engineRef.current;
      if (!engine || modalOpenRef.current) return;

      if (e.code === 'KeyC') {
        const nextCam = engine.cycleCameraMode();
        setCameraMode(nextCam);
      } else if (e.code === 'KeyM') {
        setMuted((prev) => {
          const next = !prev;
          engine.setMuted(next);
          return next;
        });
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        engine.togglePause();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [achievementsOpen, adOpen, leaderboardOpen, roadmapOpen, settingsOpen]);

  const handleSelectCar = useCallback((id: CarId) => {
    setSelectedCar(id);
    engineRef.current?.setCar(id);
  }, []);

  const handleSelectTrack = useCallback((id: TrackId) => {
    setSelectedTrack(id);
    engineRef.current?.setTrack(id);
  }, []);

  const handleSelectWeather = useCallback((mode: WeatherMode) => {
    setSelectedWeather(mode);
    engineRef.current?.setWeather(mode);
  }, []);

  const handleSelectCamera = useCallback((mode: CameraMode) => {
    setCameraMode(mode);
    engineRef.current?.setCameraMode(mode);
  }, []);

  const handleStartRace = useCallback(() => {
    runDeltaRef.current = { nearMisses: 0, distanceKm: 0 };
    setCallouts([]);
    setCameraMode((prev) => (prev === 'cinematic' ? 'chase' : prev));
    const bonus = sponsorBonusActive ? 1500 : 0;
    if (sponsorBonusActive) {
      setSponsorBonusActive(false);
    }
    engineRef.current?.startRace(bonus);
  }, [sponsorBonusActive]);

  const handleOpenAds = useCallback(() => {
    setAdOpen(true);
  }, []);

  const handleCloseAds = useCallback(() => {
    setAdOpen(false);
  }, []);

  const handleClaimAdBonus = useCallback(() => {
    setSponsorBonusActive(true);
  }, []);

  const handleStartRaceFromAd = useCallback(() => {
    runDeltaRef.current = { nearMisses: 0, distanceKm: 0 };
    setAdOpen(false);
    setSponsorBonusActive(false);
    setCallouts([]);
    setCameraMode((prev) => (prev === 'cinematic' ? 'chase' : prev));
    engineRef.current?.startRace(1500);
  }, []);

  const handleOpenSettings = useCallback(() => {
    if (telemetry.phase === 'playing') {
      engineRef.current?.togglePause();
    }
    setSettingsOpen(true);
  }, [telemetry.phase]);

  const handleCloseSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  const persistTuning = useCallback((next: TuningSettings) => {
    setTuning(next);
    try {
      localStorage.setItem(TUNING_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }, []);

  const handleSelectControlLayout = useCallback(
    (mode: ControlLayoutMode) => {
      persistTuning({ ...tuning, controlLayout: mode });
    },
    [persistTuning, tuning]
  );

  const handleChangeSteeringSensitivity = useCallback(
    (value: number) => {
      const clamped = Math.min(1.6, Math.max(0.6, Number(value.toFixed(1))));
      engineRef.current?.setSteeringSensitivity(clamped);
      persistTuning({ ...tuning, steeringSensitivity: clamped });
    },
    [persistTuning, tuning]
  );

  const handleChangeSpeedMultiplier = useCallback(
    (value: number) => {
      const clamped = Math.min(1.35, Math.max(0.85, Number(value.toFixed(2))));
      engineRef.current?.setSpeedMultiplier(clamped);
      persistTuning({ ...tuning, speedMultiplier: clamped });
    },
    [persistTuning, tuning]
  );

  const handleToggleAutoAccelerate = useCallback(() => {
    const nextVal = !tuning.autoAccelerate;
    engineRef.current?.setAutoAccelerate(nextVal);
    persistTuning({ ...tuning, autoAccelerate: nextVal });
  }, [persistTuning, tuning]);

  const handleResetTuningDefaults = useCallback(() => {
    setAudioProfile('aggressive');
    try {
      localStorage.setItem(AUDIO_PROFILE_STORAGE_KEY, 'aggressive');
    } catch {
      // Ignore storage quota errors
    }
    engineRef.current?.setEngineAudioProfile('aggressive', false);
    engineRef.current?.setSteeringSensitivity(DEFAULT_TUNING.steeringSensitivity);
    engineRef.current?.setSpeedMultiplier(DEFAULT_TUNING.speedMultiplier);
    engineRef.current?.setAutoAccelerate(DEFAULT_TUNING.autoAccelerate);
    persistTuning(DEFAULT_TUNING);
  }, [persistTuning]);

  const handleSelectAudioProfile = useCallback((profile: EngineAudioProfile) => {
    setAudioProfile(profile);
    try {
      localStorage.setItem(AUDIO_PROFILE_STORAGE_KEY, profile);
    } catch {
      // Ignore storage quota errors
    }
    engineRef.current?.setEngineAudioProfile(profile, true);
  }, []);

  const handleStartReplay = useCallback(() => {
    setCallouts([]);
    setCameraMode('cinematic');
    engineRef.current?.startReplay();
  }, []);

  const handleStopReplay = useCallback(() => {
    setCameraMode((prev) => (prev === 'cinematic' ? 'chase' : prev));
    engineRef.current?.stopReplay();
  }, []);

  const handleSetReplaySpeed = useCallback((speed: 1 | 2) => {
    engineRef.current?.setReplaySpeed(speed);
  }, []);

  const handleTogglePause = useCallback(() => {
    engineRef.current?.togglePause();
  }, []);

  const handleReturnToMenu = useCallback(() => {
    setCallouts([]);
    engineRef.current?.returnToMenu();
  }, []);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      engineRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const handleTouchInput = useCallback(
    (steer: number, boost: boolean, brake: boolean, accel = false) => {
      engineRef.current?.setTouchInput(steer, boost, brake, accel);
    },
    []
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#090b10]">
      {/* Dedicated empty WebGL mount container */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Graceful Fallback if WebGL Context Lost / Unavailable */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#090b10]">
          <img
            src="/src/assets/images/racing_sunset_backdrop_1795368263934.jpg"
            alt="Sunset highway racing circuit backdrop"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/60" />
          <div className="relative z-10 max-w-md rounded-2xl border border-white/10 bg-[#0a0c12]/90 p-6 text-center">
            <h2 className="font-display text-2xl font-bold text-white">Graphics Context Interrupted</h2>
            <p className="mt-2 text-sm text-slate-300">
              WebGL rendering paused by your browser. Reload the viewport to resume 3D racing.
            </p>
          </div>
        </div>
      )}

      {/* Semantic HUD Overlay */}
      <GameHUD
        telemetry={telemetry}
        callouts={callouts}
        savedStats={savedStats}
        selectedCar={selectedCar}
        selectedTrack={selectedTrack}
        selectedWeather={selectedWeather}
        cameraMode={cameraMode}
        muted={muted}
        latestSubmissionRank={latestSubmissionRank}
        sponsorBonusActive={sponsorBonusActive}
        unlockedAchievementsCount={Object.keys(achievementsStore.unlocked).length}
        totalAchievementsCount={ACHIEVEMENT_DEFINITIONS.length}
        controlLayout={tuning.controlLayout}
        speedMultiplier={tuning.speedMultiplier}
        onSelectCar={handleSelectCar}
        onSelectTrack={handleSelectTrack}
        onSelectWeather={handleSelectWeather}
        onSelectCamera={handleSelectCamera}
        onStartRace={handleStartRace}
        onStartReplay={handleStartReplay}
        onStopReplay={handleStopReplay}
        onSetReplaySpeed={handleSetReplaySpeed}
        onTogglePause={handleTogglePause}
        onReturnToMenu={handleReturnToMenu}
        onToggleMute={handleToggleMute}
        onOpenLeaderboard={handleOpenLeaderboard}
        onOpenAchievements={handleOpenAchievements}
        onOpenRoadmap={handleOpenRoadmap}
        onOpenAds={handleOpenAds}
        onOpenSettings={handleOpenSettings}
        onTouchInput={handleTouchInput}
      />

      <AchievementToast
        achievement={toastQueue[0] ?? null}
        queueCount={toastQueue.length}
        onDismiss={handleDismissToast}
      />

      <AchievementsModal
        open={achievementsOpen}
        store={achievementsStore}
        onClose={handleCloseAchievements}
      />

      <RoadmapModal
        open={roadmapOpen}
        savedStats={savedStats}
        unlockedAchievementsCount={Object.keys(achievementsStore.unlocked).length}
        totalAchievementsCount={ACHIEVEMENT_DEFINITIONS.length}
        onClose={handleCloseRoadmap}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        entries={leaderboardEntries}
        loading={leaderboardLoading}
        error={leaderboardError}
        trackFilter={leaderboardFilter}
        driverName={driverName}
        latestPlayerEntryId={latestPlayerEntryId}
        latestSubmissionRank={latestSubmissionRank}
        latestSubmissionTimeMs={latestSubmissionTimeMs}
        onClose={handleCloseLeaderboard}
        onRefresh={handleRefreshLeaderboard}
        onChangeFilter={handleChangeLeaderboardFilter}
        onSaveDriverName={handleSaveDriverName}
      />

      <AdShowcaseModal
        open={adOpen}
        bonusActive={sponsorBonusActive}
        onClose={handleCloseAds}
        onClaimBonus={handleClaimAdBonus}
        onStartRaceWithBonus={handleStartRaceFromAd}
      />

      <SettingsModal
        open={settingsOpen}
        audioProfile={audioProfile}
        muted={muted}
        cameraMode={cameraMode}
        controlLayout={tuning.controlLayout}
        steeringSensitivity={tuning.steeringSensitivity}
        speedMultiplier={tuning.speedMultiplier}
        autoAccelerate={tuning.autoAccelerate}
        onSelectAudioProfile={handleSelectAudioProfile}
        onToggleMute={handleToggleMute}
        onSelectCamera={handleSelectCamera}
        onSelectControlLayout={handleSelectControlLayout}
        onChangeSteeringSensitivity={handleChangeSteeringSensitivity}
        onChangeSpeedMultiplier={handleChangeSpeedMultiplier}
        onToggleAutoAccelerate={handleToggleAutoAccelerate}
        onResetDefaults={handleResetTuningDefaults}
        onClose={handleCloseSettings}
      />
    </main>
  );
}
