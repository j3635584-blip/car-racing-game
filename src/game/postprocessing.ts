import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const NitroPostShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: 0.0 },
    uSpeedFactor: { value: 0.0 },
    uPulse: { value: 0.0 },
    uTime: { value: 0.0 },
    uFlareCenter: { value: new THREE.Vector2(0.5, 0.38) },
    uAspect: { value: 1.777 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength;
    uniform float uSpeedFactor;
    uniform float uPulse;
    uniform float uTime;
    uniform vec2 uFlareCenter;
    uniform float uAspect;
    varying vec2 vUv;

    void main() {
      if (uStrength <= 0.002) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      vec2 center = vec2(0.5, 0.45);
      vec2 toEdge = vUv - center;
      vec2 aspectVec = vec2(toEdge.x * uAspect, toEdge.y);
      float aspectDist = length(aspectVec);
      float dist = length(toEdge);
      vec2 dir = dist > 0.0001 ? toEdge / dist : vec2(0.0);

      // 1. Barrel lens punch that surges on initial nitro ignition
      float warpPower = uStrength * (0.048 + 0.032 * uPulse);
      float warp = 1.0 - warpPower * (dist * dist);
      vec2 warpedUv = center + toEdge * warp;

      // 2. Radial screen-space velocity blur + R/G/B chromatic aberration
      float edgeMask = smoothstep(0.14, 0.85, aspectDist);
      float boostEnergy = uStrength * (0.75 + 0.35 * uSpeedFactor + 0.30 * uPulse);
      float blurStep = edgeMask * boostEnergy * 0.048;
      float chroma = edgeMask * boostEnergy * 0.017;

      vec3 accum = vec3(0.0);
      float weightSum = 0.0;
      const int SAMPLES = 12;
      for (int i = 0; i < SAMPLES; i++) {
        float fi = float(i) / float(SAMPLES - 1);
        float w = 1.0 - fi * 0.45;
        vec2 sampleUv = clamp(warpedUv - dir * (fi * blurStep), 0.001, 0.999);

        float r = texture2D(tDiffuse, clamp(sampleUv + dir * chroma, 0.001, 0.999)).r;
        float g = texture2D(tDiffuse, sampleUv).g;
        float b = texture2D(tDiffuse, clamp(sampleUv - dir * chroma, 0.001, 0.999)).b;
        accum += vec3(r, g, b) * w;
        weightSum += w;
      }
      vec3 color = accum / max(0.001, weightSum);

      // 3. Anamorphic cyan/amber exhaust lens flare & optical ghost ring
      vec2 flareDelta = vUv - uFlareCenter;
      float horizStreak =
        exp(-abs(flareDelta.y) * 46.0) *
        exp(-abs(flareDelta.x) * 3.2);
      float coreGlow = exp(-length(flareDelta) * 10.5);

      vec2 ghostPos = vec2(1.0) - uFlareCenter;
      float ghostDist = length(vUv - ghostPos);
      float ghostRing =
        smoothstep(0.16, 0.11, abs(ghostDist - 0.12)) * 0.28 +
        exp(-ghostDist * 9.0) * 0.35;

      float flicker = 0.92 + 0.08 * sin(uTime * 38.0);
      vec3 flareColor =
        vec3(0.18, 0.80, 1.0) * (horizStreak * 0.72 + coreGlow * 0.52) +
        vec3(1.0, 0.62, 0.18) * ghostRing * 0.42;

      color += flareColor * (uStrength * flicker);

      // 4. High-speed tunnel edge framing vignette with subtle cyan rim tint
      float vig = 1.0 - smoothstep(0.52, 1.15, aspectDist) * (0.24 * uStrength);
      color = color * vig + vec3(0.04, 0.14, 0.22) * (edgeMask * uStrength * 0.12);

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export interface NitroPostRig {
  composer: EffectComposer;
  nitroPass: ShaderPass;
}

export function createNitroPostRig(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): NitroPostRig {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const nitroPass = new ShaderPass(NitroPostShader);
  nitroPass.enabled = false;
  composer.addPass(nitroPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return { composer, nitroPass };
}
