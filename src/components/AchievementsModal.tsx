import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Lock, X } from 'lucide-react';
import {
  getAchievementViewItems,
  type AchievementCategory,
  type AchievementsStore,
} from '../services/achievementsService';

interface AchievementsModalProps {
  open: boolean;
  store: AchievementsStore;
  onClose: () => void;
}

const CATEGORIES: Array<'All' | AchievementCategory> = [
  'All',
  'Speed',
  'Skill',
  'Career',
  'Endurance',
  'Weather',
];

function formatUnlockDate(ts: number): string {
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Unlocked';
  }
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  open,
  store,
  onClose,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | AchievementCategory>('All');

  const items = useMemo(() => getAchievementViewItems(store), [store]);
  const unlockedCount = useMemo(() => items.filter((item) => item.isUnlocked).length, [items]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'All') return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [categoryFilter, items]);

  if (!open) return null;

  const { progress } = store;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="achievements-title"
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 sm:p-6"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0a0c12]/96 p-5 sm:p-6 text-slate-100 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Award className="h-5 w-5 text-amber-400 shrink-0" />
              <h2
                id="achievements-title"
                className="font-display text-2xl font-bold tracking-tight text-white"
              >
                Career Achievements
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400 tabular-nums">
              {unlockedCount} of {items.length} milestones unlocked
              <span className="mx-2 text-slate-600" aria-hidden="true">
                ·
              </span>
              {progress.totalDistanceKm.toFixed(1)} km driven
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Achievements"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Career Totals Strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-y border-white/10 py-3.5 tabular-nums">
          <div>
            <div className="text-xs text-slate-400">Peak Speed</div>
            <div className="font-display text-lg font-bold text-white">
              {Math.round(progress.bestSpeedKmh)} km/h
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Near Misses</div>
            <div className="font-display text-lg font-bold text-amber-400">
              {progress.totalNearMisses.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Races Won</div>
            <div className="font-display text-lg font-bold text-emerald-400">
              {progress.racesWon}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Best Level</div>
            <div className="font-display text-lg font-bold text-cyan-300">
              Level {progress.highestLevel}
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          {CATEGORIES.map((cat) => {
            const active = cat === categoryFilter;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Achievements List */}
        <div className="mt-4 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {filteredItems.map((item) => {
            const pct = Math.round(item.progressRatio * 100);
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3.5 rounded-xl border p-3.5 transition-colors ${
                  item.isUnlocked
                    ? 'border-amber-400/35 bg-amber-500/10'
                    : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border shrink-0 ${
                    item.isUnlocked
                      ? 'border-amber-400/45 bg-amber-500/20 text-amber-300'
                      : 'border-white/10 bg-white/5 text-slate-500'
                  }`}
                >
                  {item.isUnlocked ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm sm:text-base font-bold text-white">
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-400" aria-hidden="true">
                        ·
                      </span>
                      <span className="text-xs text-slate-400">{item.category}</span>
                    </div>

                    <span
                      className={`text-xs font-medium tabular-nums ${
                        item.isUnlocked ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {item.isUnlocked && item.unlockedAt
                        ? `Unlocked ${formatUnlockDate(item.unlockedAt)}`
                        : `${item.currentValue.toLocaleString()} / ${item.target.toLocaleString()} ${item.unit}`}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-slate-400">{item.description}</p>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-200 ${
                        item.isUnlocked ? 'bg-amber-400' : 'bg-cyan-400/75'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
