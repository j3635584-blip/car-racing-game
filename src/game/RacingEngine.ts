import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CAR_PRESETS,
  FINISH_DISTANCE_METERS,
  LANE_CENTERS,
  ROAD_LIMIT_X,
  TRACK_PRESETS,
  TRAFFIC_COLORS,
  WEATHER_PRESETS,
} from './constants';
import {
  buildFinishLineArch,
  buildNitroPickup,
  buildOilSlickMesh,
  buildPlayerCar,
  buildSandPatchMesh,
  buildTrafficVehicle,
  type PlayerCarRig,
  type TrafficKind,
} from './models';
import { createNitroPostRig, type NitroPostRig } from './postprocessing';
import { SoundEngine } from './sound';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import type {
  CameraMode,
  CarId,
  CarPreset,
  EngineAudioProfile,
  FinishReason,
  FloatingCallout,
  GamePhase,
  GameTelemetry,
  TrackId,
  WeatherMode,
  WeatherPreset,
} from './types';
import { HighwayWorld } from './world';

interface TrafficEntity {
  id: number;
  kind: TrafficKind;
  color: number;
  mesh: THREE.Group;
  x: number;
  z: number;
  speedMs: number;
  halfW: number;
  halfL: number;
  nearMissed: boolean;
}

interface ReplayTrafficSnapshot {
  id: number;
  kind: TrafficKind;
  color: number;
  x: number;
  z: number;
}

interface ReplayFrame {
  t: number;
  playerX: number;
  yaw: number;
  roll: number;
  pitch: number;
  steerDir: number;
  speedMs: number;
  distanceMeters: number;
  score: number;
  combo: number;
  nitro: number;
  isBoosting: boolean;
  braking: boolean;
  shields: number;
  level: number;
  traffic: ReplayTrafficSnapshot[];
}

interface PickupEntity {
  mesh: THREE.Group;
  x: number;
  z: number;
  phaseOffset: number;
}

interface HazardEntity {
  mesh: THREE.Group;
  kind: 'oil' | 'sand';
  x: number;
  z: number;
}

interface SparkParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onTelemetry: (data: GameTelemetry) => void;
  onCallout: (callout: FloatingCallout) => void;
  onSprintComplete?: (sprintTelemetry: GameTelemetry) => void;
  onGameOver: (finalTelemetry: GameTelemetry) => void;
  onContextLost: (lost: boolean) => void;
}

// Pre-allocated math helpers outside render loop (Zero-GC discipline)
const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();
const _camCurrentLook = new THREE.Vector3(0, 1.0, -10);
const _exhaustWorld = new THREE.Vector3();

export class RacingEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private world!: HighwayWorld;
  private textures!: ProceduralTextureSet;
  private playerRig!: PlayerCarRig;
  private finishArch!: THREE.Group;
  private postRig: NitroPostRig | null = null;
  private sound: SoundEngine;

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();

  // Game configuration
  private carPreset: CarPreset = CAR_PRESETS[0];
  private trackId: TrackId = TRACK_PRESETS[0].id;
  private weatherPreset: WeatherPreset = WEATHER_PRESETS[0];
  private engineAudioProfile: EngineAudioProfile = 'aggressive';
  private steeringSensitivity = 1.0;
  private speedMultiplier = 1.0;
  private autoAccelerate = false;
  private adaptiveDifficulty = false;
  private cameraMode: CameraMode = 'chase';
  private preReplayCameraMode: CameraMode = 'chase';

  // Simulation state
  private phase: GamePhase = 'menu';
  private finishReason: FinishReason = 'none';
  private autoReplayTimer = 0;
  private countdownTimer = 0;
  private lastCountdownInt = 0;
  private goFlashTimer = 0;
  private playerX = 0;
  private lateralVel = 0;
  private speedMs = 0;
  private nitro = 100;
  private isBoosting = false;
  private score = 0;
  private distanceMeters = 0;
  private level = 1;
  private levelStartMeters = 0;
  private nextLevelDistanceMeters = FINISH_DISTANCE_METERS;
  private sprintTimeMs: number | null = null;
  private combo = 1;
  private comboTimer = 0;
  private nearMisses = 0;
  private shields = 3;
  private readonly maxShields = 3;
  private invulnTimer = 0;
  private shakeIntensity = 0;
  private topSpeedReached = 0;
  private calloutSeq = 1;
  private trafficSeq = 1;

  // Entities
  private traffic: TrafficEntity[] = [];
  private pickups: PickupEntity[] = [];
  private hazards: HazardEntity[] = [];
  private spawnTrafficTimer = 0.8;
  private spawnPickupTimer = 3.5;
  private spawnHazardTimer = 4.5;

  // Replay recording & playback
  private recordedFrames: ReplayFrame[] = [];
  private raceElapsed = 0;
  private recordAccum = 0;
  private replayTime = 0;
  private replayCursor = 0;
  private replayPrevDistance = 0;
  private replaySpeed = 1;
  private replayTrafficMap = new Map<number, THREE.Group>();

  // Spark particle pool
  private readonly maxSparks = 80;
  private sparks: SparkParticle[] = [];
  private sparkPositions = new Float32Array(80 * 3);
  private sparkGeo!: THREE.BufferGeometry;
  private sparkPoints!: THREE.Points;

  // Nitro motion blur, chromatic aberration, lens flare & velocity streak FX
  private nitroFxStrength = 0;
  private nitroIgnitePulse = 0;
  private wasBoosting = false;
  private readonly maxNitroStreaks = 44;
  private nitroStreakPositions = new Float32Array(44 * 6);
  private nitroStreakSeeds = new Float32Array(44 * 3);
  private nitroStreakGeo!: THREE.BufferGeometry;
  private nitroStreakMat!: THREE.LineBasicMaterial;
  private nitroSpeedLines!: THREE.LineSegments;

  // Input state
  private keys = new Set<string>();
  private touchSteer = 0; // -1..1 continuous analog steer
  private touchAccel = false;
  private touchBoost = false;
  private touchBrake = false;
  private currentSteerInput = 0;
  private telemetryElapsed = 0;
  private menuOrbitAngle = 0;

  constructor(
    container: HTMLElement,
    initialCar: CarId,
    initialTrack: TrackId,
    initialWeather: WeatherMode,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.carPreset = CAR_PRESETS.find((c) => c.id === initialCar) ?? CAR_PRESETS[0];
    this.trackId = initialTrack;
    this.weatherPreset = WEATHER_PRESETS.find((w) => w.id === initialWeather) ?? WEATHER_PRESETS[0];
    this.sound = new SoundEngine();
    this.sound.setWeather(this.weatherPreset.id);

    this.initRenderer();
    this.initScene();
    this.initSparks();
    this.initNitroFx();
    this.bindEvents();

    // Warm up shaders on hardware GPUs
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.emitTelemetry();
    this.startLoop();
  }

  private detectSoftwareWebGL(): boolean {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  }

  private initRenderer(): void {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();

    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(62, w / h, 0.1, 380);
    this.camera.position.set(4.5, 2.8, 7.5);

    // Mandatory studio environment map for PBR car paint & chrome
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(maxAniso);

    this.world = new HighwayWorld(
      this.scene,
      this.textures,
      this.trackId,
      this.weatherPreset.id
    );

    this.playerRig = buildPlayerCar(this.carPreset, this.textures.contactShadowMap, this.isSoftwareGl);
    this.playerRig.root.position.set(0, 0, 0);
    this.scene.add(this.playerRig.root);

    this.finishArch = buildFinishLineArch();
    this.finishArch.visible = false;
    this.scene.add(this.finishArch);

    this.syncHeadlightsForTrack();
  }

  private initSparks(): void {
    for (let i = 0; i < this.maxSparks; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
      });
      this.sparkPositions[i * 3 + 1] = -50;
    }
    this.sparkGeo = new THREE.BufferGeometry();
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(this.sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      size: 0.48,
      map: this.textures.sparkMap,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xfbbf24,
    });
    this.sparkPoints = new THREE.Points(this.sparkGeo, sparkMat);
    this.sparkPoints.frustumCulled = false;
    this.scene.add(this.sparkPoints);
  }

  private initNitroFx(): void {
    // Hardware GPU post-processing composer (radial motion blur + lens flare distortion)
    if (!this.isSoftwareGl) {
      this.postRig = createNitroPostRig(this.renderer, this.scene, this.camera);
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.postRig.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.postRig.composer.setSize(w, h);
    }

    // Lightweight 3D velocity streaks around camera tunnel (all devices)
    for (let i = 0; i < this.maxNitroStreaks; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 2.6 + Math.random() * 4.5;
      const sx = Math.cos(angle) * radius;
      const sy = 1.2 + Math.sin(angle) * radius * 0.65;
      const sz = -4 - Math.random() * 46;
      this.nitroStreakSeeds[i * 3] = sx;
      this.nitroStreakSeeds[i * 3 + 1] = sy;
      this.nitroStreakSeeds[i * 3 + 2] = sz;

      const idx = i * 6;
      this.nitroStreakPositions[idx] = sx;
      this.nitroStreakPositions[idx + 1] = sy;
      this.nitroStreakPositions[idx + 2] = sz;
      this.nitroStreakPositions[idx + 3] = sx;
      this.nitroStreakPositions[idx + 4] = sy;
      this.nitroStreakPositions[idx + 5] = sz + 3.8;
    }

    this.nitroStreakGeo = new THREE.BufferGeometry();
    this.nitroStreakGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(this.nitroStreakPositions, 3)
    );
    this.nitroStreakMat = new THREE.LineBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.nitroSpeedLines = new THREE.LineSegments(this.nitroStreakGeo, this.nitroStreakMat);
    this.nitroSpeedLines.frustumCulled = false;
    this.nitroSpeedLines.visible = false;
    this.scene.add(this.nitroSpeedLines);
  }

  private spawnSparkBurst(x: number, y: number, z: number, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this.maxSparks && spawned < count; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        s.active = true;
        s.x = x + (Math.random() - 0.5) * 0.8;
        s.y = y + Math.random() * 0.5;
        s.z = z + (Math.random() - 0.5) * 1.2;
        s.vx = (Math.random() - 0.5) * 11;
        s.vy = 2 + Math.random() * 6;
        s.vz = (Math.random() - 0.5) * 8 + 4;
        s.life = 0;
        s.maxLife = 0.25 + Math.random() * 0.3;
        spawned++;
      }
    }
  }

  private syncHeadlightsForTrack(): void {
    const preset = TRACK_PRESETS.find((t) => t.id === this.trackId);
    const active = Boolean(preset?.isNight) || this.weatherPreset.id !== 'sunny';
    const intensity = preset?.isNight ? 44 : active ? 28 : 0;
    for (const hl of this.playerRig.headlights) {
      hl.intensity = intensity;
    }
  }

  // Public Controls
  public setCar(carId: CarId): void {
    const next = CAR_PRESETS.find((c) => c.id === carId);
    if (!next) return;
    this.carPreset = next;
    this.playerRig.paintMaterial.color.setHex(next.paintHex);
    this.nitro = Math.min(this.nitro, next.nitroCapacity);
    this.emitTelemetry();
  }

  public setTrack(trackId: TrackId): void {
    this.trackId = trackId;
    this.world.applyTrack(trackId);
    this.syncHeadlightsForTrack();
  }

  public setWeather(weather: WeatherMode): void {
    const next = WEATHER_PRESETS.find((w) => w.id === weather) ?? WEATHER_PRESETS[0];
    this.weatherPreset = next;
    this.world.applyWeather(next.id);
    this.sound.setWeather(next.id);
    this.syncHeadlightsForTrack();
    this.emitTelemetry();
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
  }

  public cycleCameraMode(): CameraMode {
    const order: CameraMode[] =
      this.phase === 'replay'
        ? ['cinematic', 'chase', 'bumper', 'hood', 'rear']
        : ['chase', 'bumper', 'hood', 'rear'];
    const idx = order.indexOf(this.cameraMode);
    const next = order[(idx + 1) % order.length];
    this.cameraMode = next;
    return next;
  }

  public setMuted(muted: boolean): void {
    this.sound.setMuted(muted);
  }

  public setEngineAudioProfile(profile: EngineAudioProfile, preview = true): void {
    this.sound.unlock();
    this.engineAudioProfile = profile;
    this.sound.setProfile(profile, preview);
    this.emitTelemetry();
  }

  public getEngineAudioProfile(): EngineAudioProfile {
    return this.engineAudioProfile;
  }

  public setSteeringSensitivity(value: number): void {
    this.steeringSensitivity = THREE.MathUtils.clamp(value, 0.6, 1.6);
  }

  public setSpeedMultiplier(value: number): void {
    this.speedMultiplier = THREE.MathUtils.clamp(value, 0.85, 1.35);
  }

  public setAutoAccelerate(enabled: boolean): void {
    this.autoAccelerate = enabled;
  }

  public setAdaptiveDifficulty(val: boolean): void {
    this.adaptiveDifficulty = val;
  }

  public playAchievementSound(): void {
    this.sound.unlock();
    this.sound.playAchievementUnlock();
  }

  public setTouchInput(
    steer: number,
    boost: boolean,
    brake: boolean,
    accel = false
  ): void {
    this.sound.unlock();
    this.touchSteer = THREE.MathUtils.clamp(steer, -1, 1);
    this.touchBoost = boost;
    this.touchBrake = brake;
    this.touchAccel = accel;
  }

  public startRace(startBonus = 0): void {
    this.sound.unlock();
    this.clearEntities();

    this.recordedFrames = [];
    this.raceElapsed = 0;
    this.recordAccum = 0;
    this.finishReason = 'none';
    this.autoReplayTimer = 0;
    this.replayTime = 0;
    this.replayCursor = 0;
    if (this.cameraMode === 'cinematic') {
      this.cameraMode = 'chase';
    }

    this.playerX = 0;
    this.lateralVel = 0;
    this.speedMs = 0;
    this.nitro = this.carPreset.nitroCapacity;
    this.isBoosting = false;
    this.wasBoosting = false;
    this.nitroIgnitePulse = 0;
    this.nitroFxStrength = 0;
    this.score = Math.max(0, Math.floor(startBonus));
    this.distanceMeters = 0;
    this.level = 1;
    this.levelStartMeters = 0;
    this.nextLevelDistanceMeters = FINISH_DISTANCE_METERS;
    this.sprintTimeMs = null;
    this.combo = 1;
    this.comboTimer = 0;
    this.nearMisses = 0;
    this.shields = this.maxShields;
    this.invulnTimer = 0;
    this.shakeIntensity = 0;
    this.topSpeedReached = 0;
    this.spawnTrafficTimer = 0.6;
    this.spawnPickupTimer = 3.0;
    this.spawnHazardTimer = 4.5;

    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.playerRig.root.visible = true;
    this.finishArch.visible = false;

    this.phase = 'countdown';
    this.countdownTimer = 2.85;
    this.lastCountdownInt = 3;
    this.goFlashTimer = 0;
    this.sound.playCountdownBeep(false);
    this.emitTelemetry();
  }

  public startReplay(): void {
    if (this.recordedFrames.length < 2) return;
    this.sound.unlock();
    this.clearEntities();

    this.autoReplayTimer = 0;
    this.replayTime = this.recordedFrames[0].t;
    this.replayCursor = 0;
    this.replayPrevDistance = this.recordedFrames[0].distanceMeters;
    this.preReplayCameraMode = this.cameraMode === 'cinematic' ? 'chase' : this.cameraMode;
    this.cameraMode = 'cinematic';
    this.playerRig.root.visible = true;
    this.phase = 'replay';
    this.emitTelemetry();
  }

  public stopReplay(): void {
    if (this.phase !== 'replay') return;
    this.clearReplayTraffic();
    this.phase = 'gameover';
    this.cameraMode = this.preReplayCameraMode;
    this.sound.updateEngine(0, 0, false, false);
    this.emitTelemetry();
  }

  public setReplaySpeed(speed: 1 | 2): void {
    this.replaySpeed = speed;
    this.emitTelemetry();
  }

  public togglePause(): GamePhase {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.sound.updateEngine(0, 0, false, false);
    } else if (this.phase === 'paused') {
      this.phase = 'playing';
      this.clock.getDelta();
    }
    this.emitTelemetry();
    return this.phase;
  }

  public returnToMenu(): void {
    this.clearEntities();
    this.autoReplayTimer = 0;
    this.finishArch.visible = false;
    if (this.cameraMode === 'cinematic') {
      this.cameraMode = 'chase';
    }
    this.phase = 'menu';
    this.goFlashTimer = 0;
    this.isBoosting = false;
    this.wasBoosting = false;
    this.nitroIgnitePulse = 0;
    this.nitroFxStrength = 0;
    this.speedMs = 0;
    this.playerX = 0;
    this.playerRig.root.position.set(0, 0, 0);
    this.playerRig.root.rotation.set(0, 0, 0);
    this.playerRig.root.visible = true;
    this.sound.updateEngine(0, 0, false, false);
    this.emitTelemetry();
  }

  private clearReplayTraffic(): void {
    for (const mesh of this.replayTrafficMap.values()) {
      this.scene.remove(mesh);
    }
    this.replayTrafficMap.clear();
  }

  private clearEntities(): void {
    for (const t of this.traffic) {
      this.scene.remove(t.mesh);
    }
    this.traffic = [];
    for (const p of this.pickups) {
      this.scene.remove(p.mesh);
    }
    this.pickups = [];
    for (const h of this.hazards) {
      this.scene.remove(h.mesh);
    }
    this.hazards = [];
    this.clearReplayTraffic();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const pr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(pr);
    if (this.postRig) {
      this.postRig.composer.setPixelRatio(pr);
      this.postRig.composer.setSize(w, h);
    }
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.sound.unlock();
    this.keys.add(e.code);
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost(false);
  };

  private startLoop(): void {
    this.clock.start();
    const tick = () => {
      if (this.disposed) return;
      const rawDelta = this.clock.getDelta();
      const dt = Math.min(rawDelta, 0.05);

      this.step(dt);
      if (!this.isSoftwareGl && this.postRig) {
        this.postRig.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private step(dt: number): void {
    if (this.phase === 'paused') {
      return;
    }

    // Update spark particles and Nitro visual FX
    this.updateSparks(dt);
    this.updateNitroFx(dt);

    if (this.phase === 'menu') {
      this.menuOrbitAngle += dt * 0.38;
      if (this.world.update(dt * 12, dt, 12)) {
        this.sound.playThunder();
      }
      this.spinPlayerWheels(dt * 12);

      _camTargetPos.set(
        Math.sin(this.menuOrbitAngle) * 5.6,
        2.15 + Math.sin(this.menuOrbitAngle * 0.7) * 0.25,
        Math.cos(this.menuOrbitAngle) * 5.8
      );
      this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-4 * dt));
      _camTargetLook.set(0, 0.85, -0.4);
      _camCurrentLook.lerp(_camTargetLook, 1 - Math.exp(-6 * dt));
      this.camera.lookAt(_camCurrentLook);
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, 54, 4, dt);
      this.camera.updateProjectionMatrix();
      return;
    }

    if (this.phase === 'countdown') {
      this.countdownTimer -= dt;
      const countInt = Math.max(0, Math.ceil(this.countdownTimer));
      if (countInt !== this.lastCountdownInt && countInt >= 1) {
        this.lastCountdownInt = countInt;
        this.sound.playCountdownBeep(false);
        this.emitTelemetry();
      }

      // Smoothly position camera behind car during countdown
      this.updateCamera(dt, 0);
      if (this.countdownTimer <= 0) {
        this.phase = 'playing';
        this.speedMs = 26; // Rolling launch start (~94 km/h)
        this.goFlashTimer = 0.75;
        this.sound.playCountdownBeep(true);
        this.emitTelemetry();
      }
      return;
    }

    if (this.phase === 'replay') {
      this.stepReplay(dt);
      return;
    }

    if (this.phase === 'gameover') {
      const coastStep = this.speedMs * dt;
      this.speedMs = THREE.MathUtils.damp(this.speedMs, 0, 2.5, dt);
      this.distanceMeters += coastStep;
      this.updateFinishArch(this.distanceMeters);
      if (this.world.update(coastStep, dt, this.speedMs)) {
        this.sound.playThunder();
      }
      this.spinPlayerWheels(coastStep);
      this.sound.updateEngine(0, 0, false, false);
      this.updateCamera(dt, 0);

      if (this.autoReplayTimer > 0) {
        this.autoReplayTimer -= dt;
        if (this.autoReplayTimer <= 0) {
          this.startReplay();
        }
      }
      return;
    }

    if (this.goFlashTimer > 0) {
      this.goFlashTimer = Math.max(0, this.goFlashTimer - dt);
    }

    // Active 'playing' simulation
    const keySteer =
      (this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0) -
      (this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? 1 : 0);
    const accelPressed =
      this.keys.has('ArrowUp') ||
      this.keys.has('KeyW') ||
      this.touchAccel ||
      (this.autoAccelerate && !this.keys.has('ArrowDown') && !this.keys.has('KeyS') && !this.touchBrake);
    const brakePressed = this.keys.has('ArrowDown') || this.keys.has('KeyS') || this.touchBrake;
    const boostPressed =
      this.keys.has('Space') ||
      this.keys.has('ShiftLeft') ||
      this.keys.has('ShiftRight') ||
      this.touchBoost;

    const maxBaseMs = (this.carPreset.topSpeedKmh * this.speedMultiplier) / 3.6;
    const cruiseMs = maxBaseMs * 0.58;

    this.isBoosting = boostPressed && this.nitro > 4 && !brakePressed;
    if (this.isBoosting) {
      this.nitro = Math.max(0, this.nitro - 26 * dt);
    } else {
      this.nitro = Math.min(this.carPreset.nitroCapacity, this.nitro + 4.5 * dt);
    }

    let targetSpeed = cruiseMs;
    if (this.isBoosting) {
      targetSpeed = maxBaseMs * 1.24;
    } else if (accelPressed) {
      targetSpeed = maxBaseMs;
    } else if (brakePressed) {
      targetSpeed = 16; // ~58 km/h min highway speed
    }

    const accelRate = (this.isBoosting
      ? 3.8 * this.carPreset.acceleration
      : brakePressed
        ? 4.6
        : accelPressed
          ? 1.9 * this.carPreset.acceleration
          : 1.1) * (this.speedMultiplier > 1 ? 1 + (this.speedMultiplier - 1) * 0.6 : 1);
    this.speedMs = THREE.MathUtils.damp(this.speedMs, targetSpeed, accelRate, dt);

    const speedKmh = this.speedMs * 3.6;
    if (speedKmh > this.topSpeedReached) {
      this.topSpeedReached = speedKmh;
    }

    // Continuous analog lateral steering physics (steering wheel + keyboard/buttons)
    const rawSteer =
      Math.abs(this.touchSteer) > 0.02 ? this.touchSteer : keySteer;
    const steerDir = THREE.MathUtils.clamp(rawSteer, -1, 1);
    this.currentSteerInput = THREE.MathUtils.damp(this.currentSteerInput, steerDir, 16, dt);
    const steerSensitivity =
      (13.5 + this.speedMs * 0.12) *
      this.carPreset.handling *
      this.weatherPreset.gripMultiplier *
      this.steeringSensitivity;
    const stormGust =
      this.weatherPreset.id === 'stormy'
        ? Math.sin(this.clock.elapsedTime * 2.1) * 1.15 * (this.speedMs / 60)
        : 0;
    const targetLatVel = steerDir * steerSensitivity + stormGust;
    this.lateralVel = THREE.MathUtils.damp(
      this.lateralVel,
      targetLatVel,
      this.weatherPreset.lateralDamping,
      dt
    );
    this.playerX += this.lateralVel * dt;

    // Guardrail boundary bounce
    if (this.playerX < -ROAD_LIMIT_X) {
      this.playerX = -ROAD_LIMIT_X;
      this.lateralVel = Math.max(0, -this.lateralVel * 0.35);
      this.spawnSparkBurst(this.playerX - 0.9, 0.35, 0.5, 4);
    } else if (this.playerX > ROAD_LIMIT_X) {
      this.playerX = ROAD_LIMIT_X;
      this.lateralVel = Math.min(0, -this.lateralVel * 0.35);
      this.spawnSparkBurst(this.playerX + 0.9, 0.35, 0.5, 4);
    }

    // Visual body dynamics: yaw, roll tilt, suspension pitch
    this.playerRig.root.position.x = this.playerX;
    const yawAngle = -this.lateralVel * 0.018;
    const rollAngle = -this.lateralVel * 0.014;
    const pitchAngle = this.isBoosting ? -0.025 : brakePressed ? 0.028 : 0;

    this.playerRig.root.rotation.y = THREE.MathUtils.damp(
      this.playerRig.root.rotation.y,
      yawAngle,
      14,
      dt
    );
    this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.damp(
      this.playerRig.bodyGroup.rotation.z,
      rollAngle,
      12,
      dt
    );
    this.playerRig.bodyGroup.rotation.x = THREE.MathUtils.damp(
      this.playerRig.bodyGroup.rotation.x,
      pitchAngle,
      10,
      dt
    );

    // Front wheel steering & wheel spin
    for (const pivot of this.playerRig.frontSteerPivots) {
      pivot.rotation.y = THREE.MathUtils.damp(pivot.rotation.y, -steerDir * 0.32, 16, dt);
    }
    this.spinPlayerWheels(this.speedMs * dt);

    // Taillight braking glow & Nitro flame flicker
    this.playerRig.tailLightMat.emissiveIntensity = brakePressed ? 4.2 : 1.5;
    for (const flame of this.playerRig.nitroFlames) {
      flame.visible = this.isBoosting;
      if (this.isBoosting) {
        flame.scale.set(1, 1, 0.75 + Math.random() * 0.6);
      }
    }

    // Invulnerability blink & decay
    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      this.playerRig.root.visible = Math.floor(this.invulnTimer * 18) % 2 === 0;
      if (this.invulnTimer <= 0) {
        this.playerRig.root.visible = true;
      }
    }

    // Combo decay
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 1;
      }
    }

    // Distance & Score progression
    const distStep = this.speedMs * dt;
    this.distanceMeters += distStep;
    this.score += distStep * (this.isBoosting ? 2.8 : 1.4) * this.combo;

    // Update 3D Finish Line Arch visibility & position
    this.updateFinishArch(this.distanceMeters);

    // World scrolling & weather updates
    if (this.world.update(distStep, dt, this.speedMs)) {
      this.sound.playThunder();
    }

    // Traffic & Pickups & Hazards
    this.updateTraffic(dt);
    this.updatePickups(dt);
    this.updateHazards(dt);

    // Record Replay Keyframe (~25 Hz)
    this.raceElapsed += dt;
    this.recordAccum += dt;
    if (this.recordAccum >= 0.04) {
      this.recordAccum = 0;
      this.recordFrame(steerDir, brakePressed);
    }

    // Check Level Checkpoint Crossing (Unlimited Level Progression)
    if (this.distanceMeters >= this.nextLevelDistanceMeters) {
      this.advanceToNextLevel(steerDir, brakePressed);
    }

    // Engine Audio
    const speedRatio = THREE.MathUtils.clamp(speedKmh / this.carPreset.topSpeedKmh, 0, 1.25);
    const { rpmRatio } = this.computeGearAndRpm(speedKmh);
    this.sound.updateEngine(speedRatio, rpmRatio, this.isBoosting, true);

    // Camera follow & dynamic FOV
    this.updateCamera(dt, steerDir);

    // Throttled HUD telemetry update (~20 Hz)
    this.telemetryElapsed += dt;
    if (this.telemetryElapsed >= 0.05) {
      this.telemetryElapsed = 0;
      this.emitTelemetry();
    }
  }

  private getLevelLengthMeters(lvl: number): number {
    return Math.min(3000, FINISH_DISTANCE_METERS + (lvl - 1) * 250);
  }

  private getCheckpointMetersForDistance(distMeters: number): number {
    let cursor = 0;
    let lvl = 1;
    while (lvl < 9999) {
      cursor += this.getLevelLengthMeters(lvl);
      if (cursor >= distMeters - 45) {
        return cursor;
      }
      lvl += 1;
    }
    return cursor;
  }

  private updateFinishArch(currentDistanceMeters: number): void {
    const checkpointMeters = this.getCheckpointMetersForDistance(currentDistanceMeters);
    const remaining = checkpointMeters - currentDistanceMeters;
    if (remaining < 240 && remaining > -45) {
      this.finishArch.visible = true;
      this.finishArch.position.z = -remaining;
    } else {
      this.finishArch.visible = false;
    }
  }

  private recordFrame(steerDir: number, braking: boolean): void {
    if (this.recordedFrames.length >= 4500) {
      this.recordedFrames.shift();
    }
    this.recordedFrames.push({
      t: this.raceElapsed,
      playerX: this.playerX,
      yaw: this.playerRig.root.rotation.y,
      roll: this.playerRig.bodyGroup.rotation.z,
      pitch: this.playerRig.bodyGroup.rotation.x,
      steerDir,
      speedMs: this.speedMs,
      distanceMeters: this.distanceMeters,
      score: this.score,
      combo: this.combo,
      nitro: this.nitro,
      isBoosting: this.isBoosting,
      braking,
      shields: this.shields,
      level: this.level,
      traffic: this.traffic.map((t) => ({
        id: t.id,
        kind: t.kind,
        color: t.color,
        x: t.x,
        z: t.z,
      })),
    });
  }

  private advanceToNextLevel(steerDir: number, brakePressed: boolean): void {
    this.recordFrame(steerDir, brakePressed);

    // Record official 1.50 km Global Leaderboard sprint split when clearing Level 1
    if (this.level === 1 && this.sprintTimeMs === null) {
      this.sprintTimeMs = Math.round(this.raceElapsed * 1000);
      this.callbacks.onSprintComplete?.(this.buildTelemetry());
    }

    this.level += 1;
    this.levelStartMeters = this.nextLevelDistanceMeters;
    this.nextLevelDistanceMeters += this.getLevelLengthMeters(this.level);

    const levelBonus = 1500 * this.level;
    this.score += levelBonus;

    let restoredShield = false;
    if (this.shields < this.maxShields) {
      this.shields += 1;
      restoredShield = true;
    }
    this.nitro = Math.min(
      this.carPreset.nitroCapacity,
      this.nitro + this.carPreset.nitroCapacity * 0.35
    );

    this.sound.playPickup();
    this.callbacks.onCallout({
      id: this.calloutSeq++,
      label: `Level ${this.level}`,
      points: restoredShield
        ? `+${levelBonus.toLocaleString()} · +1 Shield`
        : `+${levelBonus.toLocaleString()} · +Nitro`,
      tone: 'amber',
    });
    this.emitTelemetry();
  }

  private stepReplay(dt: number): void {
    const frames = this.recordedFrames;
    if (frames.length < 2) {
      this.stopReplay();
      return;
    }

    this.replayTime += dt * this.replaySpeed;
    const endT = frames[frames.length - 1].t;
    if (this.replayTime >= endT) {
      this.stopReplay();
      return;
    }

    while (
      this.replayCursor < frames.length - 2 &&
      frames[this.replayCursor + 1].t < this.replayTime
    ) {
      this.replayCursor++;
    }

    const fA = frames[this.replayCursor];
    const fB = frames[Math.min(frames.length - 1, this.replayCursor + 1)];
    const span = Math.max(0.0001, fB.t - fA.t);
    const alpha = THREE.MathUtils.clamp((this.replayTime - fA.t) / span, 0, 1);

    this.playerX = THREE.MathUtils.lerp(fA.playerX, fB.playerX, alpha);
    this.speedMs = THREE.MathUtils.lerp(fA.speedMs, fB.speedMs, alpha);
    const interpDist = THREE.MathUtils.lerp(fA.distanceMeters, fB.distanceMeters, alpha);
    this.distanceMeters = interpDist;
    this.score = Math.floor(THREE.MathUtils.lerp(fA.score, fB.score, alpha));
    this.combo = fA.combo;
    this.nitro = THREE.MathUtils.lerp(fA.nitro, fB.nitro, alpha);
    this.isBoosting = fA.isBoosting;
    this.shields = fA.shields;
    this.level = fA.level;

    // Apply car pose
    this.playerRig.root.position.x = this.playerX;
    this.playerRig.root.rotation.y = THREE.MathUtils.lerp(fA.yaw, fB.yaw, alpha);
    this.playerRig.bodyGroup.rotation.z = THREE.MathUtils.lerp(fA.roll, fB.roll, alpha);
    this.playerRig.bodyGroup.rotation.x = THREE.MathUtils.lerp(fA.pitch, fB.pitch, alpha);

    const steerDir = THREE.MathUtils.lerp(fA.steerDir, fB.steerDir, alpha);
    this.currentSteerInput = steerDir;
    for (const pivot of this.playerRig.frontSteerPivots) {
      pivot.rotation.y = -steerDir * 0.32;
    }

    const distDelta = Math.max(0, interpDist - this.replayPrevDistance);
    this.replayPrevDistance = interpDist;
    this.spinPlayerWheels(distDelta);

    this.playerRig.tailLightMat.emissiveIntensity = fA.braking ? 4.2 : 1.5;
    for (const flame of this.playerRig.nitroFlames) {
      flame.visible = this.isBoosting;
      if (this.isBoosting) {
        flame.scale.set(1, 1, 0.75 + Math.random() * 0.6);
      }
    }

    // World scroll & finish line arch
    if (this.world.update(distDelta, dt * this.replaySpeed, this.speedMs)) {
      this.sound.playThunder();
    }
    this.updateFinishArch(interpDist);

    // Sync replay traffic meshes
    const activeIds = new Set<number>();
    for (const tA of fA.traffic) {
      activeIds.add(tA.id);
      let mesh = this.replayTrafficMap.get(tA.id);
      if (!mesh) {
        mesh = buildTrafficVehicle(tA.kind, tA.color, this.textures.contactShadowMap);
        this.scene.add(mesh);
        this.replayTrafficMap.set(tA.id, mesh);
      }
      const tB = fB.traffic.find((cand) => cand.id === tA.id);
      const rx = tB ? THREE.MathUtils.lerp(tA.x, tB.x, alpha) : tA.x;
      const rz = tB ? THREE.MathUtils.lerp(tA.z, tB.z, alpha) : tA.z;
      mesh.position.set(rx, 0, rz);
    }
    for (const [id, mesh] of this.replayTrafficMap.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.replayTrafficMap.delete(id);
      }
    }

    // Engine audio during replay
    const speedKmh = this.speedMs * 3.6;
    const speedRatio = THREE.MathUtils.clamp(speedKmh / this.carPreset.topSpeedKmh, 0, 1.25);
    const { rpmRatio } = this.computeGearAndRpm(speedKmh);
    this.sound.updateEngine(speedRatio, rpmRatio, this.isBoosting, true);

    this.updateCamera(dt, steerDir);

    this.telemetryElapsed += dt;
    if (this.telemetryElapsed >= 0.05) {
      this.telemetryElapsed = 0;
      this.emitTelemetry();
    }
  }

  private spinPlayerWheels(distanceDelta: number): void {
    const wheelAngle = distanceDelta / 0.36;
    for (const w of this.playerRig.wheels) {
      w.rotation.x -= wheelAngle;
    }
  }

  private updateTraffic(dt: number): void {
    const levelFactor = Math.min(10, this.level - 1);
    const aiMult = this.adaptiveDifficulty ? 1.18 : 1.0;
    const maxActiveTraffic = Math.min(18, 12 + Math.floor(levelFactor * 0.6 + (this.adaptiveDifficulty ? 2 : 0)));
    this.spawnTrafficTimer -= dt * (0.7 + this.speedMs / 75) * aiMult;
    if (this.spawnTrafficTimer <= 0 && this.traffic.length < maxActiveTraffic) {
      this.spawnTrafficWave();
      const baseInterval = Math.max(0.28, 0.75 - levelFactor * 0.042);
      const jitter = Math.max(0.24, 0.7 - levelFactor * 0.035);
      this.spawnTrafficTimer = (baseInterval + Math.random() * jitter) / aiMult;
    }

    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const car = this.traffic[i];
      // Traffic drives forward along -Z at car.speedMs; relative to player it moves at (playerSpeed - car.speedMs) toward +Z
      const relSpeed = this.speedMs - car.speedMs;
      car.z += relSpeed * dt;
      car.mesh.position.z = car.z;

      // Check near-miss & AABB collision with player at (playerX, z = 0)
      const dx = Math.abs(this.playerX - car.x);
      const dz = Math.abs(car.z);
      const hitW = 0.94 + car.halfW;
      const hitL = 2.05 + car.halfL;

      if (dx < hitW && dz < hitL) {
        if (this.invulnTimer <= 0) {
          this.handleCollision(car);
        }
      } else if (
        !car.nearMissed &&
        car.z > 0.6 &&
        car.z < 3.6 &&
        dx < hitW + 1.25 &&
        this.speedMs > 34
      ) {
        car.nearMissed = true;
        this.nearMisses += 1;
        this.combo = Math.min(8, this.combo + 1);
        this.comboTimer = 4.5;
        const pts = 250 * this.combo;
        this.score += pts;
        this.nitro = Math.min(this.carPreset.nitroCapacity, this.nitro + 14);
        this.sound.playNearMiss();
        this.callbacks.onCallout({
          id: this.calloutSeq++,
          label: this.combo > 1 ? `Near Miss ×${this.combo}` : 'Near Miss',
          points: `+${pts}`,
          tone: 'amber',
        });
      }

      if (car.z > 28 || car.z < -260) {
        this.scene.remove(car.mesh);
        this.traffic.splice(i, 1);
      }
    }
  }

  private spawnTrafficWave(): void {
    const levelFactor = Math.min(10, this.level - 1);
    // Pick 1 or 2 lanes to keep at least 2 lanes passable
    const lanes = [...LANE_CENTERS].sort(() => Math.random() - 0.5);
    const multiLaneThreshold = Math.max(0.32, 0.62 - levelFactor * 0.028);
    const count = Math.random() > multiLaneThreshold ? 2 : 1;
    const spawnZ = -195 - Math.random() * 30;

    for (let k = 0; k < count; k++) {
      const laneX = lanes[k];
      // Avoid overlapping an existing vehicle near spawnZ
      const crowded = this.traffic.some(
        (t) => Math.abs(t.x - laneX) < 1.5 && Math.abs(t.z - spawnZ) < 22
      );
      if (crowded) continue;

      const roll = Math.random();
      const kind: TrafficKind = roll < 0.22 ? 'truck' : roll < 0.55 ? 'coupe' : 'sedan';
      const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
      const mesh = buildTrafficVehicle(kind, color, this.textures.contactShadowMap);
      mesh.position.set(laneX, 0, spawnZ);
      this.scene.add(mesh);

      const levelSpeedBonus = levelFactor * 1.1;
      const speedMs =
        (kind === 'truck' ? 21 + Math.random() * 5 : 26 + Math.random() * 11) + levelSpeedBonus;
      this.traffic.push({
        id: this.trafficSeq++,
        kind,
        color,
        mesh,
        x: laneX,
        z: spawnZ,
        speedMs,
        halfW: kind === 'truck' ? 1.05 : 0.88,
        halfL: kind === 'truck' ? 3.1 : 2.1,
        nearMissed: false,
      });
    }
  }

  private updatePickups(dt: number): void {
    this.spawnPickupTimer -= dt;
    if (this.spawnPickupTimer <= 0 && this.pickups.length < 3) {
      const laneX = LANE_CENTERS[Math.floor(Math.random() * LANE_CENTERS.length)];
      const spawnZ = -185;
      const blocked = this.traffic.some(
        (t) => Math.abs(t.x - laneX) < 1.5 && Math.abs(t.z - spawnZ) < 12
      );
      if (!blocked) {
        const mesh = buildNitroPickup(this.textures.contactShadowMap);
        mesh.position.set(laneX, 0, spawnZ);
        this.scene.add(mesh);
        this.pickups.push({
          mesh,
          x: laneX,
          z: spawnZ,
          phaseOffset: Math.random() * Math.PI * 2,
        });
      }
      this.spawnPickupTimer = 3.8 + Math.random() * 3.0;
    }

    const time = this.clock.elapsedTime;
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.z += this.speedMs * dt;
      p.mesh.position.z = p.z;
      p.mesh.rotation.y += dt * 2.4;
      const ring = p.mesh.getObjectByName('orbitRing');
      if (ring) {
        ring.rotation.x = Math.sin(time * 3 + p.phaseOffset) * 0.6;
        ring.rotation.y += dt * 3.5;
      }

      if (Math.abs(this.playerX - p.x) < 1.75 && Math.abs(p.z) < 2.6) {
        this.nitro = Math.min(this.carPreset.nitroCapacity, this.nitro + 36);
        this.score += 150 * this.combo;
        this.sound.playPickup();
        this.callbacks.onCallout({
          id: this.calloutSeq++,
          label: 'Nitro Cell',
          points: '+36% Boost',
          tone: 'cyan',
        });
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
        continue;
      }

      if (p.z > 20) {
        this.scene.remove(p.mesh);
        this.pickups.splice(i, 1);
      }
    }
  }

  private updateHazards(dt: number): void {
    const hazardMult = this.adaptiveDifficulty ? 0.82 : 1.0;
    this.spawnHazardTimer -= dt / hazardMult;
    if (this.spawnHazardTimer <= 0 && this.hazards.length < 2) {
      const laneX = LANE_CENTERS[Math.floor(Math.random() * LANE_CENTERS.length)];
      const spawnZ = -190;
      const blocked =
        this.traffic.some((t) => Math.abs(t.x - laneX) < 1.5 && Math.abs(t.z - spawnZ) < 15) ||
        this.pickups.some((p) => Math.abs(p.x - laneX) < 1.5 && Math.abs(p.z - spawnZ) < 15) ||
        this.hazards.some((h) => Math.abs(h.x - laneX) < 1.5 && Math.abs(h.z - spawnZ) < 25);

      if (!blocked) {
        const isRainyOrStormy =
          this.weatherPreset.id === 'rainy' || this.weatherPreset.id === 'stormy';
        const kind: 'oil' | 'sand' = isRainyOrStormy ? 'oil' : 'sand';
        const mesh =
          kind === 'oil'
            ? buildOilSlickMesh(this.textures.contactShadowMap)
            : buildSandPatchMesh(this.textures.contactShadowMap);
        mesh.position.set(laneX, 0, spawnZ);
        this.scene.add(mesh);
        this.hazards.push({ mesh, kind, x: laneX, z: spawnZ });
      }
      this.spawnHazardTimer = 4.8 + Math.random() * 3.5;
    }

    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.z += this.speedMs * dt;
      h.mesh.position.z = h.z;

      if (Math.abs(this.playerX - h.x) < 1.8 && Math.abs(h.z) < 2.0) {
        this.lateralVel += (Math.random() > 0.5 ? 1 : -1) * 11.5;
        this.speedMs = Math.max(16, this.speedMs * 0.78);
        this.sound.playCrash();
        this.callbacks.onCallout({
          id: this.calloutSeq++,
          label: h.kind === 'oil' ? 'Oil Slick! Slip' : 'Sand Patch! Traction',
          points: '-Grip',
          tone: 'red',
        });
        this.scene.remove(h.mesh);
        this.hazards.splice(i, 1);
        continue;
      }

      if (h.z > 22) {
        this.scene.remove(h.mesh);
        this.hazards.splice(i, 1);
      }
    }
  }

  private handleCollision(car: TrafficEntity): void {
    this.shields -= 1;
    this.combo = 1;
    this.comboTimer = 0;
    this.shakeIntensity = 0.55;
    this.invulnTimer = 1.45;
    this.speedMs = Math.max(18, this.speedMs * 0.52);

    this.sound.playCrash();
    this.spawnSparkBurst((this.playerX + car.x) * 0.5, 0.7, car.z * 0.5, 28);

    // Push traffic car slightly away so player clears it cleanly
    car.z -= 6;
    car.mesh.position.z = car.z;

    if (this.shields <= 0) {
      this.shields = 0;
      this.recordFrame(0, false);
      this.finishReason = 'wrecked';
      this.phase = 'gameover';
      this.playerRig.root.visible = true;
      this.callbacks.onCallout({
        id: this.calloutSeq++,
        label: 'Hull Breached',
        points: 'Run Ended',
        tone: 'red',
      });
      const finalTelemetry = this.buildTelemetry();
      this.callbacks.onTelemetry(finalTelemetry);
      this.callbacks.onGameOver(finalTelemetry);
    } else {
      this.callbacks.onCallout({
        id: this.calloutSeq++,
        label: 'Impact',
        points: `${this.shields} Shield Left`,
        tone: 'red',
      });
      this.emitTelemetry();
    }
  }

  private updateSparks(dt: number): void {
    let dirty = false;
    for (let i = 0; i < this.maxSparks; i++) {
      const s = this.sparks[i];
      if (!s.active) continue;
      dirty = true;
      s.life += dt;
      if (s.life >= s.maxLife) {
        s.active = false;
        this.sparkPositions[i * 3 + 1] = -50;
      } else {
        s.vy -= 18 * dt;
        s.x += s.vx * dt;
        s.y = Math.max(0.05, s.y + s.vy * dt);
        s.z += s.vz * dt;
        this.sparkPositions[i * 3] = s.x;
        this.sparkPositions[i * 3 + 1] = s.y;
        this.sparkPositions[i * 3 + 2] = s.z;
      }
    }
    if (dirty) {
      this.sparkGeo.attributes.position.needsUpdate = true;
    }
  }

  private updateNitroFx(dt: number): void {
    const boostActive =
      (this.phase === 'playing' || this.phase === 'replay') && this.isBoosting;
    if (boostActive && !this.wasBoosting) {
      this.nitroIgnitePulse = 1.0;
    }
    this.wasBoosting = boostActive;
    this.nitroIgnitePulse = THREE.MathUtils.damp(this.nitroIgnitePulse, 0, 4.2, dt);

    const targetStrength = boostActive ? 1.0 : 0.0;
    this.nitroFxStrength = THREE.MathUtils.damp(
      this.nitroFxStrength,
      targetStrength,
      boostActive ? 11 : 6.0,
      dt
    );

    if (this.postRig) {
      const pass = this.postRig.nitroPass;
      if (this.nitroFxStrength > 0.003) {
        const speedKmh = this.speedMs * 3.6;
        pass.enabled = true;
        pass.uniforms.uStrength.value = this.nitroFxStrength;
        pass.uniforms.uSpeedFactor.value = THREE.MathUtils.clamp(speedKmh / 340, 0, 1.25);
        pass.uniforms.uPulse.value = this.nitroIgnitePulse;
        pass.uniforms.uTime.value = this.clock.elapsedTime;
        pass.uniforms.uAspect.value = this.camera.aspect || 1.777;

        // Project car's rear nitro exhaust center into UV screen space
        _exhaustWorld.set(this.playerX, 0.42, 2.25).project(this.camera);
        const fx = THREE.MathUtils.clamp(_exhaustWorld.x * 0.5 + 0.5, 0.1, 0.9);
        const fy = THREE.MathUtils.clamp(_exhaustWorld.y * 0.5 + 0.5, 0.1, 0.9);
        pass.uniforms.uFlareCenter.value.set(fx, fy);
      } else {
        pass.enabled = false;
        pass.uniforms.uStrength.value = 0;
      }
    }

    if (this.nitroFxStrength > 0.02) {
      this.nitroSpeedLines.visible = true;
      this.nitroStreakMat.opacity = this.nitroFxStrength * 0.68;
      const travel = (55 + this.speedMs * 1.45) * dt;
      const streakLen = 2.6 + this.nitroFxStrength * 4.2;

      for (let i = 0; i < this.maxNitroStreaks; i++) {
        const sIdx = i * 3;
        let sx = this.nitroStreakSeeds[sIdx];
        let sy = this.nitroStreakSeeds[sIdx + 1];
        let sz = this.nitroStreakSeeds[sIdx + 2] + travel;

        if (sz > 8) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 2.6 + Math.random() * 4.5;
          sx = this.playerX + Math.cos(angle) * radius;
          sy = Math.max(0.4, 1.2 + Math.sin(angle) * radius * 0.65);
          sz = -48 - Math.random() * 14;
          this.nitroStreakSeeds[sIdx] = sx;
          this.nitroStreakSeeds[sIdx + 1] = sy;
        }
        this.nitroStreakSeeds[sIdx + 2] = sz;

        const pIdx = i * 6;
        this.nitroStreakPositions[pIdx] = sx;
        this.nitroStreakPositions[pIdx + 1] = sy;
        this.nitroStreakPositions[pIdx + 2] = sz;
        this.nitroStreakPositions[pIdx + 3] = sx;
        this.nitroStreakPositions[pIdx + 4] = sy;
        this.nitroStreakPositions[pIdx + 5] = sz + streakLen;
      }
      this.nitroStreakGeo.attributes.position.needsUpdate = true;
    } else {
      this.nitroSpeedLines.visible = false;
    }
  }

  private updateCamera(dt: number, steerDir: number): void {
    const speedNorm = THREE.MathUtils.clamp((this.speedMs * 3.6) / 320, 0, 1.15);

    if (this.cameraMode === 'cinematic') {
      const shotIndex = Math.floor(this.replayTime / 4.0) % 3;
      if (shotIndex === 0) {
        // Low front-quarter hero tracking angle
        const sweep = Math.sin(this.replayTime * 0.65) * 1.4;
        _camTargetPos.set(this.playerX * 0.55 + 3.4 + sweep, 1.35, -5.8);
        _camTargetLook.set(this.playerX, 0.8, 0.4);
      } else if (shotIndex === 1) {
        // Dramatic sweeping chase angle
        _camTargetPos.set(this.playerX * 0.8 - 2.6, 2.2, 6.6);
        _camTargetLook.set(this.playerX * 0.7, 0.9, -12);
      } else {
        // Elevated trackside helicopter overhead
        _camTargetPos.set(this.playerX * 0.4 + 4.8, 4.6, 7.2);
        _camTargetLook.set(this.playerX, 0.7, -8);
      }
    } else if (this.cameraMode === 'chase') {
      _camTargetPos.set(this.playerX * 0.88, 2.55 - speedNorm * 0.2, 6.2 + speedNorm * 0.55);
      _camTargetLook.set(this.playerX * 0.72, 1.05, -14);
    } else if (this.cameraMode === 'bumper') {
      _camTargetPos.set(this.playerX, 0.82, -2.3);
      _camTargetLook.set(this.playerX * 0.9, 0.72, -32);
    } else {
      // hood cam
      _camTargetPos.set(this.playerX, 1.48, -0.35);
      _camTargetLook.set(this.playerX * 0.92, 1.12, -28);
    }

    // Apply decaying impact shake
    if (this.shakeIntensity > 0.005) {
      _camTargetPos.x += (Math.random() - 0.5) * this.shakeIntensity;
      _camTargetPos.y += (Math.random() - 0.5) * this.shakeIntensity * 0.7;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 8, dt);
    } else {
      this.shakeIntensity = 0;
    }

    const posLambda =
      this.cameraMode === 'cinematic' ? 5.5 : this.cameraMode === 'chase' ? 10 : 28;
    this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, _camTargetPos.x, posLambda, dt);
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, _camTargetPos.y, posLambda, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, _camTargetPos.z, posLambda, dt);

    _camCurrentLook.x = THREE.MathUtils.damp(_camCurrentLook.x, _camTargetLook.x, 14, dt);
    _camCurrentLook.y = THREE.MathUtils.damp(_camCurrentLook.y, _camTargetLook.y, 14, dt);
    _camCurrentLook.z = THREE.MathUtils.damp(_camCurrentLook.z, _camTargetLook.z, 14, dt);
    this.camera.lookAt(_camCurrentLook);

    // Subtle bank roll in turns + FOV speed widening
    this.camera.rotation.z = THREE.MathUtils.damp(
      this.camera.rotation.z,
      -steerDir * 0.025 * speedNorm,
      8,
      dt
    );
    const targetFov = 58 + speedNorm * 16 + (this.isBoosting ? 7 : 0);
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();
  }

  private computeGearAndRpm(speedKmh: number): { gear: number; rpmRatio: number } {
    if (speedKmh < 5) return { gear: 1, rpmRatio: 0.18 };
    const maxKmh = this.carPreset.topSpeedKmh * 1.15;
    const norm = THREE.MathUtils.clamp(speedKmh / maxKmh, 0, 1);
    const gear = Math.min(6, Math.max(1, Math.floor(norm * 5.99) + 1));
    const gearSpan = 1 / 6;
    const localProgress = (norm - (gear - 1) * gearSpan) / gearSpan;
    const rpmRatio = THREE.MathUtils.clamp(0.32 + localProgress * 0.65, 0.2, 0.99);
    return { gear, rpmRatio };
  }

  private buildTelemetry(): GameTelemetry {
    const speedKmh = Math.round(this.speedMs * 3.6);
    const { gear, rpmRatio } = this.computeGearAndRpm(speedKmh);
    const startReplayT =
      this.recordedFrames.length > 0 ? this.recordedFrames[0].t : 0;
    const totalReplayT =
      this.recordedFrames.length > 1
        ? this.recordedFrames[this.recordedFrames.length - 1].t - startReplayT
        : 0;
    const replayProgress =
      this.phase === 'replay' && totalReplayT > 0
        ? THREE.MathUtils.clamp((this.replayTime - startReplayT) / totalReplayT, 0, 1)
        : 0;

    const currentLevelSpan = Math.max(1, this.nextLevelDistanceMeters - this.levelStartMeters);
    const levelProgress = THREE.MathUtils.clamp(
      (this.distanceMeters - this.levelStartMeters) / currentLevelSpan,
      0,
      1
    );

    let upcomingHazard: { kind: 'oil' | 'sand'; distanceMeters: number } | null = null;
    let minHDist = 999;
    for (const h of this.hazards) {
      if (h.z < 0 && h.z > -65) {
        const dist = Math.round(Math.abs(h.z));
        if (dist < minHDist) {
          minHDist = dist;
          upcomingHazard = { kind: h.kind, distanceMeters: dist };
        }
      }
    }

    return {
      phase: this.phase,
      weather: this.weatherPreset.id,
      engineAudioProfile: this.engineAudioProfile,
      countdownValue: Math.max(0, Math.ceil(this.countdownTimer)),
      countdownGo: this.phase === 'playing' && this.goFlashTimer > 0,
      speedKmh,
      gear,
      rpmRatio,
      nitro: Math.round((this.nitro / this.carPreset.nitroCapacity) * 100),
      isBoosting: this.isBoosting,
      score: Math.floor(this.score),
      distanceKm: Number((this.distanceMeters / 1000).toFixed(2)),
      combo: this.combo,
      nearMisses: this.nearMisses,
      shields: this.shields,
      maxShields: this.maxShields,
      topSpeedReached: Math.round(this.topSpeedReached),
      steerInput: Number(this.currentSteerInput.toFixed(3)),
      raceTimeMs: Math.round(this.raceElapsed * 1000),
      sprintTimeMs: this.sprintTimeMs,
      level: this.level,
      levelProgress,
      levelTargetKm: Number((this.nextLevelDistanceMeters / 1000).toFixed(2)),
      finishReason: this.finishReason,
      finishDistanceKm: Number((this.nextLevelDistanceMeters / 1000).toFixed(2)),
      upcomingHazard,
      hasReplay: this.recordedFrames.length >= 2,
      replayProgress,
      replaySpeed: this.replaySpeed,
    };
  }

  private emitTelemetry(): void {
    this.callbacks.onTelemetry(this.buildTelemetry());
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.sound.dispose();

    this.scene.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh ||
        obj instanceof THREE.Points ||
        obj instanceof THREE.LineSegments
      ) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.textures.asphaltMap.dispose();
    this.textures.curbMap.dispose();
    this.textures.contactShadowMap.dispose();
    this.textures.sparkMap.dispose();
    this.textures.billboardMaps.forEach((tex) => tex.dispose());

    this.postRig?.composer.dispose();
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }
  }
}
