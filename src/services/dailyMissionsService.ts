export interface DailyMission {
  id: string;
  type: 'distance' | 'near_misses' | 'speed' | 'level';
  title: string;
  target: number;
  progress: number;
  rewardXP: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyMissionsStore {
  lastGeneratedTimestamp: number;
  missions: DailyMission[];
}

const STORAGE_KEY = 'apex_velocity_daily_missions_v1';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const MISSION_POOL: Omit<DailyMission, 'progress' | 'completed' | 'claimed'>[] = [
  { id: 'm_dist', type: 'distance', title: 'Drive 4.0 km total in races', target: 4.0, rewardXP: 500 },
  { id: 'm_near', type: 'near_misses', title: 'Earn 5 near misses with traffic', target: 5, rewardXP: 400 },
  { id: 'm_speed', type: 'speed', title: 'Hit 280 km/h top speed', target: 280, rewardXP: 450 },
  { id: 'm_level', type: 'level', title: 'Advance to Level 3 or higher', target: 3, rewardXP: 600 },
];

function getRandomMissions(): DailyMission[] {
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((m) => ({
    ...m,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

export function loadDailyMissionsStore(): DailyMissionsStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (raw) {
      const parsed = JSON.parse(raw) as DailyMissionsStore;
      // Refresh if older than 24 hours
      if (parsed && parsed.lastGeneratedTimestamp && now - parsed.lastGeneratedTimestamp < ONE_DAY_MS && Array.isArray(parsed.missions) && parsed.missions.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }

  // Generate fresh daily missions
  const fresh: DailyMissionsStore = {
    lastGeneratedTimestamp: Date.now(),
    missions: getRandomMissions(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  } catch {
    // Ignore storage errors
  }
  return fresh;
}

export function saveDailyMissionsStore(store: DailyMissionsStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors
  }
}

export function updateDailyMissionsProgress(
  store: DailyMissionsStore,
  updates: {
    distanceDeltaKm?: number;
    nearMissesDelta?: number;
    currentSpeed?: number;
    currentLevel?: number;
  }
): { store: DailyMissionsStore; newlyCompleted: DailyMission[] } {
  let changed = false;
  const newlyCompleted: DailyMission[] = [];

  const nextMissions = store.missions.map((m) => {
    if (m.completed) return m;
    let newProg = m.progress;

    if (m.type === 'distance' && updates.distanceDeltaKm) {
      newProg = Math.min(m.target, m.progress + updates.distanceDeltaKm);
    } else if (m.type === 'near_misses' && updates.nearMissesDelta) {
      newProg = Math.min(m.target, m.progress + updates.nearMissesDelta);
    } else if (m.type === 'speed' && updates.currentSpeed) {
      newProg = Math.max(m.progress, updates.currentSpeed);
    } else if (m.type === 'level' && updates.currentLevel) {
      newProg = Math.max(m.progress, updates.currentLevel);
    }

    if (newProg !== m.progress) {
      changed = true;
      const completed = newProg >= m.target;
      const updatedMission: DailyMission = {
        ...m,
        progress: Number(newProg.toFixed(2)),
        completed,
      };
      if (completed && !m.completed) {
        newlyCompleted.push(updatedMission);
      }
      return updatedMission;
    }
    return m;
  });

  const nextStore = changed ? { ...store, missions: nextMissions } : store;
  if (changed) {
    saveDailyMissionsStore(nextStore);
  }
  return { store: nextStore, newlyCompleted };
}
