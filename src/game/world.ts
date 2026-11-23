import * as THREE from 'three';
import {
  ROAD_WIDTH,
  SEGMENT_COUNT,
  SEGMENT_LENGTH,
  TRACK_PRESETS,
  WEATHER_PRESETS,
} from './constants';
import type { ProceduralTextureSet } from './textures';
import type { TrackId, TrackPreset, WeatherMode, WeatherPreset } from './types';

interface RoadSegment {
  group: THREE.Group;
  z: number;
}

const _skyColor = new THREE.Color();
const _fogColor = new THREE.Color();
const _stormTint = new THREE.Color(0x1f2937);

export class HighwayWorld {
  private scene: THREE.Scene;
  private segments: RoadSegment[] = [];
  private terrainMesh: THREE.Mesh;
  private terrainMat: THREE.MeshStandardMaterial;
  private mountainRing: THREE.Group;
  private mountainMat: THREE.MeshStandardMaterial;
  private roadMat: THREE.MeshStandardMaterial;
  private foliageInstanced: THREE.InstancedMesh;
  private foliageMat: THREE.MeshStandardMaterial;
  private lampBulbMat: THREE.MeshStandardMaterial;
  private billboardFaceMats: THREE.MeshStandardMaterial[] = [];
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private currentTrack: TrackPreset;
  private currentWeather: WeatherPreset;

  // Procedural rain system
  private readonly maxRainDrops = 720;
  private rainPositions = new Float32Array(720 * 6);
  private rainSeeds = new Float32Array(720 * 3);
  private rainGeo: THREE.BufferGeometry;
  private rainLines: THREE.LineSegments;
  private lightningCooldown = 3.2;
  private lightningIntensity = 0;

  // Foliage instance metadata for scrolling along Z
  private foliageData: Array<{ x: number; z: number; scale: number; rotY: number }> = [];
  private readonly foliageCount = 120;
  private readonly dummy = new THREE.Object3D();

  constructor(
    scene: THREE.Scene,
    textures: ProceduralTextureSet,
    initialTrackId: TrackId,
    initialWeather: WeatherMode = 'sunny'
  ) {
    this.scene = scene;
    this.currentTrack = TRACK_PRESETS.find((t) => t.id === initialTrackId) ?? TRACK_PRESETS[0];
    this.currentWeather = WEATHER_PRESETS.find((w) => w.id === initialWeather) ?? WEATHER_PRESETS[0];

    // 1. Lighting Rig (Key + Hemisphere Fill + Rim)
    this.hemiLight = new THREE.HemisphereLight(
      this.currentTrack.hemiSkyHex,
      this.currentTrack.hemiGroundHex,
      this.currentTrack.hemiIntensity
    );
    this.hemiLight.position.set(0, 60, 0);
    scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(
      this.currentTrack.sunHex,
      this.currentTrack.sunIntensity
    );
    this.sunLight.position.set(35, 55, -25);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 150;
    const d = 28;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.7);
    this.rimLight.position.set(-28, 18, 28);
    scene.add(this.rimLight);

    // 2. Vast Horizon Ground Plane (y = -0.08 so road at y = 0 never Z-fights)
    const groundGeo = new THREE.PlaneGeometry(800, 800);
    groundGeo.rotateX(-Math.PI / 2);
    this.terrainMat = new THREE.MeshStandardMaterial({
      color: this.currentTrack.groundHex,
      roughness: 0.94,
      metalness: 0.02,
    });
    this.terrainMesh = new THREE.Mesh(groundGeo, this.terrainMat);
    this.terrainMesh.position.set(0, -0.08, -140);
    this.terrainMesh.receiveShadow = true;
    scene.add(this.terrainMesh);

    // 3. Distant Mountain Horizon Silhouette
    this.mountainMat = new THREE.MeshStandardMaterial({
      color: 0x33282e,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    this.mountainRing = new THREE.Group();
    const peakGeo = new THREE.ConeGeometry(28, 42, 5);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const dist = 235 + (i % 3) * 28;
      const peak = new THREE.Mesh(peakGeo, this.mountainMat);
      peak.position.set(Math.cos(angle) * dist, 16, Math.sin(angle) * dist - 90);
      peak.scale.set(1.2 + (i % 4) * 0.45, 0.8 + (i % 5) * 0.32, 1.3);
      peak.rotation.y = i * 0.7;
      this.mountainRing.add(peak);
    }
    scene.add(this.mountainRing);

    // 4. Shared Materials for Road Segments
    this.roadMat = new THREE.MeshStandardMaterial({
      map: textures.asphaltMap,
      roughness: this.currentWeather.roadRoughness,
      metalness: this.currentWeather.roadMetalness,
    });
    const roadMat = this.roadMat;

    const curbMat = new THREE.MeshStandardMaterial({
      map: textures.curbMap,
      roughness: 0.65,
      metalness: 0.05,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.35,
      metalness: 0.8,
    });

    const postMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.5,
      metalness: 0.65,
    });

    this.lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
    });

    const roadGeo = new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH);
    roadGeo.rotateX(-Math.PI / 2);

    const curbGeo = new THREE.BoxGeometry(0.65, 0.06, SEGMENT_LENGTH);
    const railBeamGeo = new THREE.BoxGeometry(0.14, 0.28, SEGMENT_LENGTH);
    const railPostGeo = new THREE.BoxGeometry(0.16, 0.78, 0.16);
    const lampPoleGeo = new THREE.CylinderGeometry(0.1, 0.14, 7.2, 8);
    const lampArmGeo = new THREE.BoxGeometry(2.8, 0.12, 0.16);
    const lampHeadGeo = new THREE.BoxGeometry(0.8, 0.12, 0.32);

    // Highway Billboard geometry & materials
    this.billboardFaceMats = textures.billboardMaps.map(
      (map) =>
        new THREE.MeshStandardMaterial({
          map,
          emissiveMap: map,
          emissive: 0xffffff,
          emissiveIntensity: 0.45,
          roughness: 0.4,
          metalness: 0.1,
        })
    );
    const boardLegGeo = new THREE.CylinderGeometry(0.14, 0.18, 5.2, 8);
    const boardFrameGeo = new THREE.BoxGeometry(7.6, 3.85, 0.24);
    const boardFaceGeo = new THREE.PlaneGeometry(7.2, 3.5);

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const segGroup = new THREE.Group();

      // Asphalt surface at y = 0
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.receiveShadow = true;
      segGroup.add(roadMesh);

      // Left & Right FIA Rumble Curbs at y = 0.03
      [-ROAD_WIDTH / 2 - 0.32, ROAD_WIDTH / 2 + 0.32].forEach((cx) => {
        const curb = new THREE.Mesh(curbGeo, curbMat);
        curb.position.set(cx, 0.03, 0);
        curb.receiveShadow = true;
        segGroup.add(curb);
      });

      // Outer Guardrails
      [-ROAD_WIDTH / 2 - 1.25, ROAD_WIDTH / 2 + 1.25].forEach((gx) => {
        const rail = new THREE.Mesh(railBeamGeo, railMat);
        rail.position.set(gx, 0.62, 0);
        rail.castShadow = true;
        segGroup.add(rail);

        for (let pz = -SEGMENT_LENGTH / 2 + 5; pz < SEGMENT_LENGTH / 2; pz += 10) {
          const post = new THREE.Mesh(railPostGeo, postMat);
          post.position.set(gx, 0.36, pz);
          segGroup.add(post);
        }
      });

      // Highway Light Poles (alternating sides)
      const side = i % 2 === 0 ? -1 : 1;
      const poleX = side * (ROAD_WIDTH / 2 + 1.85);
      const pole = new THREE.Mesh(lampPoleGeo, postMat);
      pole.position.set(poleX, 3.6, 0);
      pole.castShadow = true;
      segGroup.add(pole);

      const arm = new THREE.Mesh(lampArmGeo, postMat);
      arm.position.set(poleX - side * 1.3, 7.1, 0);
      segGroup.add(arm);

      const bulb = new THREE.Mesh(lampHeadGeo, this.lampBulbMat);
      bulb.position.set(poleX - side * 2.4, 7.0, 0);
      segGroup.add(bulb);

      // Highway Sponsor / Game Ad Billboards on alternating segments
      if (i % 2 === 1 && this.billboardFaceMats.length > 0) {
        const boardSide = i % 4 === 1 ? 1 : -1;
        const boardX = boardSide * (ROAD_WIDTH / 2 + 5.8);
        const boardGroup = new THREE.Group();
        boardGroup.position.set(boardX, 0, -10);
        boardGroup.rotation.y = boardSide > 0 ? -0.22 : 0.22;

        const legL = new THREE.Mesh(boardLegGeo, postMat);
        legL.position.set(-2.1, 2.6, 0);
        legL.castShadow = true;
        boardGroup.add(legL);

        const legR = new THREE.Mesh(boardLegGeo, postMat);
        legR.position.set(2.1, 2.6, 0);
        legR.castShadow = true;
        boardGroup.add(legR);

        const frame = new THREE.Mesh(boardFrameGeo, postMat);
        frame.position.set(0, 5.55, 0);
        frame.castShadow = true;
        boardGroup.add(frame);

        const matIdx = Math.floor(i / 2) % this.billboardFaceMats.length;
        const face = new THREE.Mesh(boardFaceGeo, this.billboardFaceMats[matIdx]);
        face.position.set(0, 5.55, 0.14);
        boardGroup.add(face);

        segGroup.add(boardGroup);
      }

      const zPos = -i * SEGMENT_LENGTH;
      segGroup.position.z = zPos;
      scene.add(segGroup);
      this.segments.push({ group: segGroup, z: zPos });
    }

    // 5. Instanced Roadside Landscape Props (Stylized Pines / Cacti / Boulders)
    const treeGeo = new THREE.ConeGeometry(1.5, 5.2, 7);
    treeGeo.translate(0, 2.6, 0);
    this.foliageMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.85,
      metalness: 0.04,
      flatShading: true,
    });
    this.foliageInstanced = new THREE.InstancedMesh(treeGeo, this.foliageMat, this.foliageCount);
    this.foliageInstanced.castShadow = true;
    this.foliageInstanced.frustumCulled = false;

    const totalLoopLen = SEGMENT_COUNT * SEGMENT_LENGTH;
    const baseCol = new THREE.Color(this.currentTrack.foliageHex);
    const tempCol = new THREE.Color();

    for (let i = 0; i < this.foliageCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (ROAD_WIDTH / 2 + 6.5 + Math.random() * 44);
      const z = 50 - (i / this.foliageCount) * totalLoopLen;
      const scale = 0.85 + Math.random() * 0.45; // ±15-20% organic variation
      const rotY = Math.random() * Math.PI * 2;
      this.foliageData.push({ x, z, scale, rotY });

      this.dummy.position.set(x, -0.08, z);
      this.dummy.rotation.set(0, rotY, 0);
      this.dummy.scale.set(scale, scale * (0.9 + Math.random() * 0.3), scale);
      this.dummy.updateMatrix();
      this.foliageInstanced.setMatrixAt(i, this.dummy.matrix);

      tempCol.copy(baseCol).offsetHSL(0, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08);
      this.foliageInstanced.setColorAt(i, tempCol);
    }
    this.foliageInstanced.instanceMatrix.needsUpdate = true;
    if (this.foliageInstanced.instanceColor) {
      this.foliageInstanced.instanceColor.needsUpdate = true;
    }
    scene.add(this.foliageInstanced);

    // 6. Procedural Rain Streak System
    for (let i = 0; i < this.maxRainDrops; i++) {
      const rx = (Math.random() - 0.5) * 34;
      const ry = Math.random() * 16;
      const rz = 8 - Math.random() * 68;
      this.rainSeeds[i * 3] = rx;
      this.rainSeeds[i * 3 + 1] = ry;
      this.rainSeeds[i * 3 + 2] = rz;

      const idx = i * 6;
      this.rainPositions[idx] = rx;
      this.rainPositions[idx + 1] = ry;
      this.rainPositions[idx + 2] = rz;
      this.rainPositions[idx + 3] = rx - 0.08;
      this.rainPositions[idx + 4] = ry - 0.85;
      this.rainPositions[idx + 5] = rz;
    }
    this.rainGeo = new THREE.BufferGeometry();
    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0xcbd5e1,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.rainLines = new THREE.LineSegments(this.rainGeo, rainMat);
    this.rainLines.frustumCulled = false;
    scene.add(this.rainLines);

    this.applyAtmosphere();
  }

  public applyTrack(trackId: TrackId): TrackPreset {
    const preset = TRACK_PRESETS.find((t) => t.id === trackId) ?? TRACK_PRESETS[0];
    this.currentTrack = preset;

    const baseCol = new THREE.Color(preset.foliageHex);
    const tempCol = new THREE.Color();
    for (let i = 0; i < this.foliageCount; i++) {
      const shade = ((i * 37) % 100) / 100 - 0.5;
      tempCol.copy(baseCol).offsetHSL(0, shade * 0.06, shade * 0.08);
      this.foliageInstanced.setColorAt(i, tempCol);
    }
    if (this.foliageInstanced.instanceColor) {
      this.foliageInstanced.instanceColor.needsUpdate = true;
    }

    this.applyAtmosphere();
    return preset;
  }

  public applyWeather(weather: WeatherMode): WeatherPreset {
    const preset = WEATHER_PRESETS.find((w) => w.id === weather) ?? WEATHER_PRESETS[0];
    this.currentWeather = preset;
    this.lightningIntensity = 0;
    this.lightningCooldown = 1.6 + Math.random() * 2.5;
    this.applyAtmosphere();
    return preset;
  }

  private applyAtmosphere(): void {
    const track = this.currentTrack;
    const weather = this.currentWeather;

    _skyColor.setHex(track.skyHex).lerp(_stormTint, 1 - weather.skyDarken);
    _fogColor.setHex(track.fogHex).lerp(_stormTint, 1 - weather.skyDarken);

    if (this.lightningIntensity > 0.01) {
      _skyColor.lerp(new THREE.Color(0xdbeafe), Math.min(0.65, this.lightningIntensity * 0.35));
      _fogColor.lerp(new THREE.Color(0x93c5fd), Math.min(0.5, this.lightningIntensity * 0.25));
    }

    this.scene.background = _skyColor.clone();
    this.scene.fog = new THREE.FogExp2(
      _fogColor.getHex(),
      track.fogDensity + weather.fogBoost
    );

    this.sunLight.color.setHex(
      this.lightningIntensity > 0.2 ? 0xe0f2fe : track.sunHex
    );
    this.sunLight.intensity =
      track.sunIntensity * weather.sunMultiplier + this.lightningIntensity * 4.5;

    this.hemiLight.color.setHex(track.hemiSkyHex);
    this.hemiLight.groundColor.setHex(track.hemiGroundHex);
    this.hemiLight.intensity =
      track.hemiIntensity * weather.hemiMultiplier + this.lightningIntensity * 1.4;

    this.terrainMat.color.setHex(track.groundHex).multiplyScalar(0.55 + weather.skyDarken * 0.45);
    this.mountainMat.color.copy(_fogColor).multiplyScalar(0.72);

    this.roadMat.roughness = weather.roadRoughness;
    this.roadMat.metalness = weather.roadMetalness;
    this.lampBulbMat.emissiveIntensity = track.isNight || weather.id !== 'sunny' ? 3.2 : 0.4;
    const boardGlow = track.isNight || weather.id !== 'sunny' ? 0.95 : 0.38;
    for (const mat of this.billboardFaceMats) {
      mat.emissiveIntensity = boardGlow;
    }

    this.rainLines.visible = weather.rainDrops > 0;
    this.rainGeo.setDrawRange(0, weather.rainDrops * 2);
  }

  public update(scrollDeltaZ: number, dt = 0.016, speedMs = 12): boolean {
    let lightningTriggered = false;
    const totalLen = SEGMENT_COUNT * SEGMENT_LENGTH;

    for (const seg of this.segments) {
      seg.z += scrollDeltaZ;
      if (seg.z > SEGMENT_LENGTH) {
        seg.z -= totalLen;
      }
      seg.group.position.z = seg.z;
    }

    for (let i = 0; i < this.foliageCount; i++) {
      const item = this.foliageData[i];
      item.z += scrollDeltaZ;
      if (item.z > 55) {
        item.z -= totalLen;
      }
      this.dummy.position.set(item.x, -0.08, item.z);
      this.dummy.rotation.set(0, item.rotY, 0);
      this.dummy.scale.setScalar(item.scale);
      this.dummy.updateMatrix();
      this.foliageInstanced.setMatrixAt(i, this.dummy.matrix);
    }
    this.foliageInstanced.instanceMatrix.needsUpdate = true;

    // Update procedural rain streaks
    const activeDrops = this.currentWeather.rainDrops;
    if (activeDrops > 0) {
      const fallSpeed = this.currentWeather.id === 'stormy' ? 34 : 25;
      const windX = this.currentWeather.id === 'stormy' ? -5.5 : -1.5;
      const streakZ = Math.min(2.6, 0.25 + speedMs * 0.032);
      const streakY = this.currentWeather.id === 'stormy' ? 1.05 : 0.8;

      for (let i = 0; i < activeDrops; i++) {
        const sIdx = i * 3;
        let rx = this.rainSeeds[sIdx] + windX * dt;
        let ry = this.rainSeeds[sIdx + 1] - fallSpeed * dt;
        let rz = this.rainSeeds[sIdx + 2] + scrollDeltaZ * 0.9;

        if (ry < 0) {
          ry += 16;
          rx = (Math.random() - 0.5) * 34;
        }
        if (rz > 9) {
          rz -= 68;
          rx = (Math.random() - 0.5) * 34;
        }
        if (rx < -17) rx += 34;

        this.rainSeeds[sIdx] = rx;
        this.rainSeeds[sIdx + 1] = ry;
        this.rainSeeds[sIdx + 2] = rz;

        const pIdx = i * 6;
        this.rainPositions[pIdx] = rx;
        this.rainPositions[pIdx + 1] = ry;
        this.rainPositions[pIdx + 2] = rz;
        this.rainPositions[pIdx + 3] = rx + windX * 0.035;
        this.rainPositions[pIdx + 4] = ry - streakY;
        this.rainPositions[pIdx + 5] = rz + streakZ;
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // Update procedural storm lightning flash
    if (this.currentWeather.id === 'stormy') {
      this.lightningCooldown -= dt;
      if (this.lightningCooldown <= 0) {
        this.lightningIntensity = 1.0;
        this.lightningCooldown = 3.2 + Math.random() * 4.5;
        lightningTriggered = true;
      }
    }
    if (this.lightningIntensity > 0.005) {
      this.lightningIntensity = THREE.MathUtils.damp(this.lightningIntensity, 0, 12, dt);
      this.applyAtmosphere();
    } else if (this.lightningIntensity > 0) {
      this.lightningIntensity = 0;
      this.applyAtmosphere();
    }

    return lightningTriggered;
  }
}
