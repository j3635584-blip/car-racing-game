import type { WeatherMode } from '../game/types';

export type AchievementCategory = 'Speed' | 'Skill' | 'Career' | 'Endurance' | 'Weather';

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  target: number;
  unit: string;
  getValue: (progress: CareerProgress) => number;
}

export interface CareerProgress {
  bestSpeedKmh: number;
  totalNearMisses: number;
  racesWon: number;
  highestLevel: number;
  highestCombo: number;
  highestScore: number;
  totalDistanceKm: number;
  stormWins: number;
}

export interface AchievementRecord {
  id: string;
  unlockedAt: number;
}

export interface AchievementsStore {
  progress: CareerProgress;
  unlocked: Record<string, AchievementRecord>;
}

export interface AchievementViewItem extends AchievementDefinition {
  currentValue: number;
  progressRatio: number;
  isUnlocked: boolean;
  unlockedAt: number | null;
}

const ACHIEVEMENTS_STORAGE_KEY = 'apex_velocity_achievements_v1';

export const DEFAULT_CAREER_PROGRESS: CareerProgress = {
  bestSpeedKmh: 0,
  totalNearMisses: 0,
  racesWon: 0,
  highestLevel: 1,
  highestCombo: 1,
  highestScore: 0,
  totalDistanceKm: 0,
  stormWins: 0,
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-300',
    title: 'First 300 km/h',
    description: 'Break the 300 km/h barrier on the open highway.',
    category: 'Speed',
    target: 300,
    unit: 'km/h',
    getValue: (p) => Math.floor(p.bestSpeedKmh),
  },
  {
    id: 'hyper-360',
    title: 'Hyper Velocity',
    description: 'Reach 360 km/h using Nitro or Sport/Hyper tuning.',
    category: 'Speed',
    target: 360,
    unit: 'km/h',
    getValue: (p) => Math.floor(p.bestSpeedKmh),
  },
  {
    id: 'near-miss-25',
    title: 'Close Shave',
    description: 'Thread 25 near-miss traffic passes across all runs.',
    category: 'Skill',
    target: 25,
    unit: 'passes',
    getValue: (p) => p.totalNearMisses,
  },
  {
    id: 'near-miss-100',
    title: '100 Near Misses',
    description: 'Record 100 cumulative high-speed near misses.',
    category: 'Skill',
    target: 100,
    unit: 'passes',
    getValue: (p) => p.totalNearMisses,
  },
  {
    id: 'combo-6',
    title: 'Flow State',
    description: 'Chain near misses up to a ×6 combo multiplier.',
    category: 'Skill',
    target: 6,
    unit: 'combo',
    getValue: (p) => p.highestCombo,
  },
  {
    id: 'win-1',
    title: 'Checkered Flag',
    description: 'Complete your first 1.50 km highway sprint.',
    category: 'Career',
    target: 1,
    unit: 'wins',
    getValue: (p) => p.racesWon,
  },
  {
    id: 'win-5',
    title: 'Win 5 Races',
    description: 'Cross the 1.50 km finish arch 5 times.',
    category: 'Career',
    target: 5,
    unit: 'wins',
    getValue: (p) => p.racesWon,
  },
  {
    id: 'level-5',
    title: 'Endless Runner',
    description: 'Advance to Level 5 in a single highway run.',
    category: 'Endurance',
    target: 5,
    unit: 'level',
    getValue: (p) => p.highestLevel,
  },
  {
    id: 'storm-master',
    title: 'Storm Chaser',
    description: 'Win a 1.50 km sprint during Stormy weather.',
    category: 'Weather',
    target: 1,
    unit: 'win',
    getValue: (p) => p.stormWins,
  },
];

export function loadAchievementsStore(): AchievementsStore {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) {
      return { progress: { ...DEFAULT_CAREER_PROGRESS }, unlocked: {} };
    }
    const parsed = JSON.parse(raw) as Partial<AchievementsStore>;
    const rawProg: Partial<CareerProgress> = parsed.progress ?? {};
    const progress: CareerProgress = {
      bestSpeedKmh: typeof rawProg.bestSpeedKmh === 'number' ? rawProg.bestSpeedKmh : 0,
      totalNearMisses: typeof rawProg.totalNearMisses === 'number' ? rawProg.totalNearMisses : 0,
      racesWon: typeof rawProg.racesWon === 'number' ? rawProg.racesWon : 0,
      highestLevel: typeof rawProg.highestLevel === 'number' ? Math.max(1, rawProg.highestLevel) : 1,
      highestCombo: typeof rawProg.highestCombo === 'number' ? Math.max(1, rawProg.highestCombo) : 1,
      highestScore: typeof rawProg.highestScore === 'number' ? rawProg.highestScore : 0,
      totalDistanceKm: typeof rawProg.totalDistanceKm === 'number' ? rawProg.totalDistanceKm : 0,
      stormWins: typeof rawProg.stormWins === 'number' ? rawProg.stormWins : 0,
    };
    const unlocked: Record<string, AchievementRecord> =
      parsed.unlocked && typeof parsed.unlocked === 'object' ? parsed.unlocked : {};
    return { progress, unlocked };
  } catch {
    return { progress: { ...DEFAULT_CAREER_PROGRESS }, unlocked: {} };
  }
}

export function saveAchievementsStore(store: AchievementsStore): void {
  try {
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors
  }
}

export function evaluateAchievementUnlocks(
  store: AchievementsStore,
  now = Date.now()
): { nextStore: AchievementsStore; newlyUnlocked: AchievementDefinition[] } {
  const newlyUnlocked: AchievementDefinition[] = [];
  let unlockedChanged = false;
  const nextUnlocked = { ...store.unlocked };

  for (const def of ACHIEVEMENT_DEFINITIONS) {
    if (nextUnlocked[def.id]) continue;
    const val = def.getValue(store.progress);
    if (val >= def.target) {
      nextUnlocked[def.id] = { id: def.id, unlockedAt: now };
      newlyUnlocked.push(def);
      unlockedChanged = true;
    }
  }

  return {
    nextStore: unlockedChanged ? { ...store, unlocked: nextUnlocked } : store,
    newlyUnlocked,
  };
}

export function applyCareerUpdate(
  store: AchievementsStore,
  update: {
    speedKmh?: number;
    nearMissDelta?: number;
    distanceDeltaKm?: number;
    combo?: number;
    level?: number;
    score?: number;
    raceWon?: boolean;
    weather?: WeatherMode;
  }
): {
  nextStore: AchievementsStore;
  newlyUnlocked: AchievementDefinition[];
  changed: boolean;
} {
  const prev = store.progress;
  const nextSpeed = Math.max(prev.bestSpeedKmh, update.speedKmh ?? 0);
  const nextNearMisses = prev.totalNearMisses + Math.max(0, update.nearMissDelta ?? 0);
  const nextDistance = Number((prev.totalDistanceKm + Math.max(0, update.distanceDeltaKm ?? 0)).toFixed(3));
  const nextCombo = Math.max(prev.highestCombo, update.combo ?? 1);
  const nextLevel = Math.max(prev.highestLevel, update.level ?? 1);
  const nextScore = Math.max(prev.highestScore, update.score ?? 0);
  const nextWins = prev.racesWon + (update.raceWon ? 1 : 0);
  const nextStormWins = prev.stormWins + (update.raceWon && update.weather === 'stormy' ? 1 : 0);

  const progressChanged =
    nextSpeed !== prev.bestSpeedKmh ||
    nextNearMisses !== prev.totalNearMisses ||
    nextDistance !== prev.totalDistanceKm ||
    nextCombo !== prev.highestCombo ||
    nextLevel !== prev.highestLevel ||
    nextScore !== prev.highestScore ||
    nextWins !== prev.racesWon ||
    nextStormWins !== prev.stormWins;

  if (!progressChanged) {
    return { nextStore: store, newlyUnlocked: [], changed: false };
  }

  const updatedStore: AchievementsStore = {
    ...store,
    progress: {
      bestSpeedKmh: nextSpeed,
      totalNearMisses: nextNearMisses,
      racesWon: nextWins,
      highestLevel: nextLevel,
      highestCombo: nextCombo,
      highestScore: nextScore,
      totalDistanceKm: nextDistance,
      stormWins: nextStormWins,
    },
  };

  const { nextStore, newlyUnlocked } = evaluateAchievementUnlocks(updatedStore);
  return { nextStore, newlyUnlocked, changed: true };
}

export function getAchievementViewItems(store: AchievementsStore): AchievementViewItem[] {
  return ACHIEVEMENT_DEFINITIONS.map((def) => {
    const record = store.unlocked[def.id];
    const rawVal = def.getValue(store.progress);
    const currentValue = record ? Math.max(def.target, rawVal) : Math.min(def.target, rawVal);
    const progressRatio = record ? 1 : Math.min(1, Math.max(0, rawVal / def.target));
    return {
      ...def,
      currentValue,
      progressRatio,
      isUnlocked: Boolean(record),
      unlockedAt: record?.unlockedAt ?? null,
    };
  });
}
