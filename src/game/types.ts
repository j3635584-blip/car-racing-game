export type CarId = 'veloce-gt' | 'apex-aero' | 'stealth-rs';
export type TrackId = 'sunset-coast' | 'midnight-express' | 'alpine-dawn';
export type WeatherMode = 'sunny' | 'rainy' | 'stormy';
export type EngineAudioProfile = 'aggressive' | 'silent' | 'muscle';
export type ControlLayoutMode = 'both' | 'wheel' | 'buttons';
export type CameraMode = 'chase' | 'bumper' | 'hood' | 'rear' | 'cinematic';
export type GamePhase = 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'replay';
export type FinishReason = 'none' | 'finished' | 'wrecked';

export interface EngineAudioPreset {
  id: EngineAudioProfile;
  name: string;
  description: string;
}

export interface CarPreset {
  id: CarId;
  name: string;
  paintHex: number;
  swatchCss: string;
  accentHex: number;
  topSpeedKmh: number;
  acceleration: number;
  handling: number;
  nitroCapacity: number;
}

export interface TrackPreset {
  id: TrackId;
  name: string;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  sunHex: number;
  sunIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  groundHex: number;
  foliageHex: number;
  isNight: boolean;
}

export interface WeatherPreset {
  id: WeatherMode;
  name: string;
  gripMultiplier: number;
  lateralDamping: number;
  fogBoost: number;
  sunMultiplier: number;
  hemiMultiplier: number;
  skyDarken: number;
  roadRoughness: number;
  roadMetalness: number;
  rainDrops: number;
}

export interface FloatingCallout {
  id: number;
  label: string;
  points: string;
  tone: 'amber' | 'cyan' | 'red';
}

export interface GameTelemetry {
  phase: GamePhase;
  weather: WeatherMode;
  engineAudioProfile: EngineAudioProfile;
  countdownValue: number;
  countdownGo: boolean;
  speedKmh: number;
  gear: number;
  rpmRatio: number;
  nitro: number;
  isBoosting: boolean;
  score: number;
  distanceKm: number;
  combo: number;
  nearMisses: number;
  shields: number;
  maxShields: number;
  topSpeedReached: number;
  steerInput: number;
  raceTimeMs: number;
  sprintTimeMs: number | null;
  level: number;
  levelProgress: number;
  levelTargetKm: number;
  finishReason: FinishReason;
  finishDistanceKm: number;
  upcomingHazard: { kind: 'oil' | 'sand'; distanceMeters: number } | null;
  hasReplay: boolean;
  replayProgress: number;
  replaySpeed: number;
}

export interface SavedStats {
  highScore: number;
  bestDistanceKm: number;
  bestSpeedKmh: number;
  bestLevel: number;
}
