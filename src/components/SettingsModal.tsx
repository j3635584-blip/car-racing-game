import React from 'react';
import { RotateCcw, SlidersHorizontal, Volume2, VolumeX, X } from 'lucide-react';
import { ENGINE_AUDIO_PRESETS } from '../game/constants';
import type { CameraMode, ControlLayoutMode, EngineAudioProfile } from '../game/types';

interface SettingsModalProps {
  open: boolean;
  audioProfile: EngineAudioProfile;
  muted: boolean;
  cameraMode: CameraMode;
  controlLayout: ControlLayoutMode;
  steeringSensitivity: number;
  speedMultiplier: number;
  autoAccelerate: boolean;
  adaptiveDifficulty: boolean;
  onSelectAudioProfile: (profile: EngineAudioProfile) => void;
  onToggleMute: () => void;
  onSelectCamera: (mode: CameraMode) => void;
  onSelectControlLayout: (mode: ControlLayoutMode) => void;
  onChangeSteeringSensitivity: (value: number) => void;
  onChangeSpeedMultiplier: (value: number) => void;
  onToggleAutoAccelerate: () => void;
  onToggleAdaptiveDifficulty: () => void;
  onResetDefaults: () => void;
  onClose: () => void;
}

const CAMERA_MODES: Array<{ id: CameraMode; label: string }> = [
  { id: 'chase', label: 'Chase' },
  { id: 'bumper', label: 'Bumper' },
  { id: 'hood', label: 'Hood' },
];

const CONTROL_LAYOUTS: Array<{ id: ControlLayoutMode; label: string }> = [
  { id: 'both', label: 'Both' },
  { id: 'wheel', label: 'Wheel' },
  { id: 'buttons', label: 'L / R' },
];

const SPEED_TUNING_MODES: Array<{ value: number; label: string }> = [
  { value: 1.0, label: '1.0× Stock' },
  { value: 1.15, label: '1.15× Sport' },
  { value: 1.3, label: '1.30× Hyper' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  audioProfile,
  muted,
  cameraMode,
  controlLayout,
  steeringSensitivity,
  speedMultiplier,
  autoAccelerate,
  adaptiveDifficulty,
  onSelectAudioProfile,
  onToggleMute,
  onSelectCamera,
  onSelectControlLayout,
  onChangeSteeringSensitivity,
  onChangeSpeedMultiplier,
  onToggleAutoAccelerate,
  onToggleAdaptiveDifficulty,
  onResetDefaults,
  onClose,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 sm:p-6"
    >
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-[#0a0c12]/96 p-5 sm:p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <SlidersHorizontal className="h-5 w-5 text-amber-400 shrink-0" />
              <h2
                id="settings-title"
                className="font-display text-2xl font-bold tracking-tight text-white"
              >
                Settings & Tuning
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Steering controls, speed tuning, engine acoustics, and camera view
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
          {/* Steering & Speed Tuning Tools */}
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Steering Controls</div>
                <div className="text-xs text-slate-400">Wheel, Left/Right buttons, or both</div>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {CONTROL_LAYOUTS.map((opt) => {
                  const active = opt.id === controlLayout;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectControlLayout(opt.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-amber-500 text-slate-950 font-semibold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="steer-sensitivity" className="font-semibold text-white">
                  Steering Sensitivity
                </label>
                <span className="font-mono text-xs font-semibold text-amber-400 tabular-nums">
                  {steeringSensitivity.toFixed(1)}×
                </span>
              </div>
              <input
                id="steer-sensitivity"
                type="range"
                min={0.6}
                max={1.6}
                step={0.1}
                value={steeringSensitivity}
                onChange={(e) => onChangeSteeringSensitivity(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer accent-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Speed Tuning</div>
                <div className="text-xs text-slate-400">Adjust top speed and acceleration</div>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {SPEED_TUNING_MODES.map((opt) => {
                  const active = Math.abs(opt.value - speedMultiplier) < 0.02;
                  return (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => onChangeSpeedMultiplier(opt.value)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/35'
                          : 'text-slate-400 hover:text-slate-200 border border-transparent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Auto-Accelerate</div>
                <div className="text-xs text-slate-400">Hold full throttle automatically</div>
              </div>
              <button
                type="button"
                onClick={onToggleAutoAccelerate}
                className={`flex h-9 items-center rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  autoAccelerate
                    ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {autoAccelerate ? 'Enabled' : 'Off'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div>
                <div className="text-sm font-semibold text-white">Adaptive AI Difficulty</div>
                <div className="text-xs text-slate-400">Dynamically balance traffic & hazard frequency</div>
              </div>
              <button
                type="button"
                onClick={onToggleAdaptiveDifficulty}
                className={`flex h-9 items-center rounded-xl border px-3.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  adaptiveDifficulty
                    ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                    : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {adaptiveDifficulty ? 'Enabled' : 'Off'}
              </button>
            </div>
          </section>

          {/* Engine Audio Profile Selector */}
          <section className="border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-white">Engine Audio Profile</span>
              <span className="text-xs text-slate-400">Live preview on select</span>
            </div>

            <div className="mt-2.5 flex flex-col gap-2">
              {ENGINE_AUDIO_PRESETS.map((preset) => {
                const active = preset.id === audioProfile;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onSelectAudioProfile(preset.id)}
                    className={`flex flex-col items-start rounded-xl border px-4 py-2.5 text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-amber-400/50 bg-amber-500/12 text-white'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="font-display text-sm font-bold">{preset.name}</span>
                      {active && (
                        <span className="text-xs font-medium text-amber-400">Selected</span>
                      )}
                    </div>
                    <span className="mt-0.5 text-xs text-slate-400">{preset.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Master Sound & Default View */}
          <section className="space-y-4 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Master Audio</div>
                <div className="text-xs text-slate-400">Engine, weather, and collision sound</div>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className={`flex h-10 items-center gap-2 rounded-xl border px-3.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  muted
                    ? 'border-rose-400/35 bg-rose-500/15 text-rose-200'
                    : 'border-white/15 bg-white/5 text-slate-100 hover:bg-white/10'
                }`}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                <span>{muted ? 'Muted' : 'Enabled'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-white">Camera View</div>
                <div className="text-xs text-slate-400">Active driving perspective</div>
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                {CAMERA_MODES.map((opt) => {
                  const active = opt.id === cameraMode;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectCamera(opt.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
          </section>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={onResetDefaults}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg bg-amber-500 px-5 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors whitespace-nowrap cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
