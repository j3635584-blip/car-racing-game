import type { CarPreset, EngineAudioPreset, TrackPreset, WeatherPreset } from './types';

export const ROAD_WIDTH = 15.0; // 4 lanes of ~3.75m
export const LANE_WIDTH = 3.6;
export const LANE_CENTERS = [-5.4, -1.8, 1.8, 5.4];
export const ROAD_LIMIT_X = 6.35;
export const SEGMENT_LENGTH = 60;
export const SEGMENT_COUNT = 7;
export const FINISH_DISTANCE_METERS = 1500;

export const CAR_PRESETS: CarPreset[] = [
  {
    id: 'veloce-gt',
    name: 'Veloce GT',
    paintHex: 0xef4444,
    swatchCss: '#EF4444',
    accentHex: 0x111827,
    topSpeedKmh: 285,
    acceleration: 1.0,
    handling: 1.05,
    nitroCapacity: 100,
  },
  {
    id: 'apex-aero',
    name: 'Apex Aero',
    paintHex: 0xf59e0b,
    swatchCss: '#F59E0B',
    accentHex: 0x18181b,
    topSpeedKmh: 305,
    acceleration: 0.96,
    handling: 0.95,
    nitroCapacity: 120,
  },
  {
    id: 'stealth-rs',
    name: 'Stealth RS',
    paintHex: 0x06b6d4,
    swatchCss: '#06B6D4',
    accentHex: 0x0f172a,
    topSpeedKmh: 278,
    acceleration: 1.1,
    handling: 1.18,
    nitroCapacity: 105,
  },
];

export const TRACK_PRESETS: TrackPreset[] = [
  {
    id: 'sunset-coast',
    name: 'Sunset Coast',
    skyHex: 0x2b1d28,
    fogHex: 0x4b2a31,
    fogDensity: 0.0052,
    sunHex: 0xffb36b,
    sunIntensity: 2.35,
    hemiSkyHex: 0xfb923c,
    hemiGroundHex: 0x3b261d,
    hemiIntensity: 0.9,
    groundHex: 0x5c3e2c,
    foliageHex: 0x3b5229,
    isNight: false,
  },
  {
    id: 'midnight-express',
    name: 'Midnight Express',
    skyHex: 0x080c16,
    fogHex: 0x0b101d,
    fogDensity: 0.0068,
    sunHex: 0x7aa2f7,
    sunIntensity: 1.15,
    hemiSkyHex: 0x334155,
    hemiGroundHex: 0x0f172a,
    hemiIntensity: 0.65,
    groundHex: 0x161b26,
    foliageHex: 0x1e293b,
    isNight: true,
  },
  {
    id: 'alpine-dawn',
    name: 'Alpine Dawn',
    skyHex: 0x7c9eb8,
    fogHex: 0x8daec4,
    fogDensity: 0.0046,
    sunHex: 0xfff0d4,
    sunIntensity: 2.4,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x3f4a3c,
    hemiIntensity: 1.05,
    groundHex: 0x3d4d3a,
    foliageHex: 0x22402b,
    isNight: false,
  },
];

export const WEATHER_PRESETS: WeatherPreset[] = [
  {
    id: 'sunny',
    name: 'Sunny',
    gripMultiplier: 1.0,
    lateralDamping: 11.5,
    fogBoost: 0,
    sunMultiplier: 1.0,
    hemiMultiplier: 1.0,
    skyDarken: 1.0,
    roadRoughness: 0.78,
    roadMetalness: 0.08,
    rainDrops: 0,
  },
  {
    id: 'rainy',
    name: 'Rainy',
    gripMultiplier: 0.87,
    lateralDamping: 7.8,
    fogBoost: 0.0024,
    sunMultiplier: 0.48,
    hemiMultiplier: 0.75,
    skyDarken: 0.64,
    roadRoughness: 0.22,
    roadMetalness: 0.28,
    rainDrops: 380,
  },
  {
    id: 'stormy',
    name: 'Stormy',
    gripMultiplier: 0.76,
    lateralDamping: 6.1,
    fogBoost: 0.0044,
    sunMultiplier: 0.24,
    hemiMultiplier: 0.52,
    skyDarken: 0.42,
    roadRoughness: 0.14,
    roadMetalness: 0.36,
    rainDrops: 720,
  },
];

export const ENGINE_AUDIO_PRESETS: EngineAudioPreset[] = [
  {
    id: 'aggressive',
    name: 'Aggressive',
    description: 'High-revving twin-scroll GT screamer with sharp intake bite',
  },
  {
    id: 'silent',
    name: 'Silent',
    description: 'Whisper-quiet stealth electric drivetrain hum',
  },
  {
    id: 'muscle',
    name: 'Muscle',
    description: 'Deep low-end V8 rumble and throaty exhaust growl',
  },
];

export const TRAFFIC_COLORS = [
  0xd1d5db, // silver
  0x3b82f6, // cobalt blue
  0xf8fafc, // pearl white
  0x475569, // slate gray
  0x10b981, // racing emerald
  0xf97316, // tangerine
  0x334155, // charcoal
];
