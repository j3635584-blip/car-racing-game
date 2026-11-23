import type { CarId, TrackId, WeatherMode } from '../game/types';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  driverName: string;
  timeMs: number;
  trackId: TrackId;
  carId: CarId;
  weather: WeatherMode;
  topSpeedKmh: number;
  recordedAt: string;
  isPlayer?: boolean;
}

export interface SubmitRaceTimePayload {
  driverName: string;
  timeMs: number;
  trackId: TrackId;
  carId: CarId;
  weather: WeatherMode;
  topSpeedKmh: number;
}

export interface SubmitRaceTimeResult {
  entry: LeaderboardEntry;
  globalRank: number;
  isTopTen: boolean;
  top10: LeaderboardEntry[];
}

const LEADERBOARD_STORAGE_KEY = 'apex_velocity_global_leaderboard_v1';
const DRIVER_NAME_STORAGE_KEY = 'apex_velocity_driver_name_v1';

interface RawLeaderboardRecord {
  id: string;
  driverName: string;
  timeMs: number;
  trackId: TrackId;
  carId: CarId;
  weather: WeatherMode;
  topSpeedKmh: number;
  recordedAt: string;
  isPlayer?: boolean;
}

const SEED_RECORDS: RawLeaderboardRecord[] = [
  {
    id: 'seed-01',
    driverName: 'K. Takahashi',
    timeMs: 19420,
    trackId: 'midnight-express',
    carId: 'apex-aero',
    weather: 'sunny',
    topSpeedKmh: 334,
    recordedAt: '2026-11-18T14:22:00Z',
  },
  {
    id: 'seed-02',
    driverName: 'L. Lindqvist',
    timeMs: 20180,
    trackId: 'sunset-coast',
    carId: 'apex-aero',
    weather: 'sunny',
    topSpeedKmh: 329,
    recordedAt: '2026-11-19T09:10:00Z',
  },
  {
    id: 'seed-03',
    driverName: 'M. Castellano',
    timeMs: 20750,
    trackId: 'alpine-dawn',
    carId: 'veloce-gt',
    weather: 'sunny',
    topSpeedKmh: 318,
    recordedAt: '2026-11-19T18:45:00Z',
  },
  {
    id: 'seed-04',
    driverName: 'S. Moreau',
    timeMs: 21340,
    trackId: 'midnight-express',
    carId: 'stealth-rs',
    weather: 'rainy',
    topSpeedKmh: 312,
    recordedAt: '2026-11-20T06:30:00Z',
  },
  {
    id: 'seed-05',
    driverName: 'A. Verma',
    timeMs: 21960,
    trackId: 'sunset-coast',
    carId: 'veloce-gt',
    weather: 'sunny',
    topSpeedKmh: 315,
    recordedAt: '2026-11-20T12:15:00Z',
  },
  {
    id: 'seed-06',
    driverName: 'R. Kowalski',
    timeMs: 22480,
    trackId: 'alpine-dawn',
    carId: 'apex-aero',
    weather: 'rainy',
    topSpeedKmh: 322,
    recordedAt: '2026-11-20T19:05:00Z',
  },
  {
    id: 'seed-07',
    driverName: 'E. Vance',
    timeMs: 23110,
    trackId: 'sunset-coast',
    carId: 'stealth-rs',
    weather: 'sunny',
    topSpeedKmh: 306,
    recordedAt: '2026-11-21T08:40:00Z',
  },
  {
    id: 'seed-08',
    driverName: 'D. Okafor',
    timeMs: 23890,
    trackId: 'midnight-express',
    carId: 'veloce-gt',
    weather: 'stormy',
    topSpeedKmh: 304,
    recordedAt: '2026-11-21T15:18:00Z',
  },
  {
    id: 'seed-09',
    driverName: 'H. Sato',
    timeMs: 24540,
    trackId: 'alpine-dawn',
    carId: 'stealth-rs',
    weather: 'sunny',
    topSpeedKmh: 298,
    recordedAt: '2026-11-21T21:02:00Z',
  },
  {
    id: 'seed-10',
    driverName: 'N. Becker',
    timeMs: 25280,
    trackId: 'sunset-coast',
    carId: 'veloce-gt',
    weather: 'rainy',
    topSpeedKmh: 294,
    recordedAt: '2026-11-22T02:14:00Z',
  },
  {
    id: 'seed-11',
    driverName: 'C. Alvarez',
    timeMs: 26120,
    trackId: 'midnight-express',
    carId: 'stealth-rs',
    weather: 'sunny',
    topSpeedKmh: 291,
    recordedAt: '2026-11-22T04:50:00Z',
  },
  {
    id: 'seed-12',
    driverName: 'T. Nguyen',
    timeMs: 26890,
    trackId: 'alpine-dawn',
    carId: 'veloce-gt',
    weather: 'stormy',
    topSpeedKmh: 287,
    recordedAt: '2026-11-22T06:25:00Z',
  },
];

let memoryFallbackStore: RawLeaderboardRecord[] | null = null;

function readStore(): RawLeaderboardRecord[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    if (!raw) {
      const initial = [...SEED_RECORDS];
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as RawLeaderboardRecord[];
    }
  } catch {
    // Fall back to in-memory store if storage is blocked
  }
  if (!memoryFallbackStore) {
    memoryFallbackStore = [...SEED_RECORDS];
  }
  return memoryFallbackStore;
}

function writeStore(records: RawLeaderboardRecord[]): void {
  memoryFallbackStore = records;
  try {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function rankRecords(
  records: RawLeaderboardRecord[],
  trackFilter: TrackId | 'all'
): LeaderboardEntry[] {
  const filtered =
    trackFilter === 'all' ? records : records.filter((r) => r.trackId === trackFilter);
  const sorted = [...filtered].sort((a, b) => a.timeMs - b.timeMs);
  return sorted.slice(0, 10).map((rec, index) => ({
    ...rec,
    rank: index + 1,
  }));
}

export function getSavedDriverName(): string {
  try {
    const saved = localStorage.getItem(DRIVER_NAME_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim().slice(0, 20);
    }
  } catch {
    // Ignore storage access errors
  }
  return 'You';
}

export function saveDriverName(name: string): string {
  const cleaned = name.trim().slice(0, 20) || 'You';
  try {
    localStorage.setItem(DRIVER_NAME_STORAGE_KEY, cleaned);
  } catch {
    // Ignore storage quota errors
  }
  return cleaned;
}

export function formatRaceTime(timeMs: number): string {
  const clamped = Math.max(0, Math.round(timeMs));
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((clamped % 1000) / 10);
  const secStr = seconds.toString().padStart(2, '0');
  const csStr = centiseconds.toString().padStart(2, '0');
  return `${minutes}:${secStr}.${csStr}`;
}

/**
 * Simulated backend GET /api/leaderboard?track=...
 * Returns the top 10 fastest 1.50 km sprint race times.
 */
export async function fetchTopLeaderboard(
  trackFilter: TrackId | 'all' = 'all'
): Promise<LeaderboardEntry[]> {
  await delay(260 + Math.round(Math.random() * 140));
  const records = readStore();
  return rankRecords(records, trackFilter);
}

/**
 * Simulated backend POST /api/leaderboard
 * Persists a completed race time and returns the updated top 10 leaderboard.
 */
export async function submitRaceTime(
  payload: SubmitRaceTimePayload
): Promise<SubmitRaceTimeResult> {
  await delay(220 + Math.round(Math.random() * 100));

  const driverName = payload.driverName.trim().slice(0, 20) || 'You';
  const records = readStore();
  const newRecord: RawLeaderboardRecord = {
    id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    driverName,
    timeMs: Math.max(5000, Math.round(payload.timeMs)),
    trackId: payload.trackId,
    carId: payload.carId,
    weather: payload.weather,
    topSpeedKmh: Math.round(payload.topSpeedKmh),
    recordedAt: new Date().toISOString(),
    isPlayer: true,
  };

  const nextRecords = [...records, newRecord]
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, 50);

  writeStore(nextRecords);

  const globalRank = nextRecords.findIndex((r) => r.id === newRecord.id) + 1;
  const top10 = rankRecords(nextRecords, 'all');

  return {
    entry: {
      ...newRecord,
      rank: globalRank,
    },
    globalRank,
    isTopTen: globalRank > 0 && globalRank <= 10,
    top10,
  };
}
