import React from 'react';
import { Award, X } from 'lucide-react';
import type { AchievementDefinition } from '../services/achievementsService';

interface AchievementToastProps {
  achievement: AchievementDefinition | null;
  queueCount: number;
  onDismiss: () => void;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({
  achievement,
  queueCount,
  onDismiss,
}) => {
  if (!achievement) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto fixed top-20 left-1/2 z-40 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-[fadeIn_0.22s_cubic-bezier(0.16,1,0.3,1)]"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/45 bg-[#0a0c12]/95 px-4 py-3 shadow-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/35 bg-amber-500/15 text-amber-400 shrink-0">
          <Award className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <span className="font-semibold">Achievement Unlocked</span>
            <span className="text-slate-500" aria-hidden="true">
              ·
            </span>
            <span className="text-slate-400">{achievement.category}</span>
            {queueCount > 1 && (
              <>
                <span className="text-slate-500" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-400 tabular-nums">+{queueCount - 1} more</span>
              </>
            )}
          </div>
          <div className="mt-0.5 font-display text-base font-bold text-white truncate">
            {achievement.title}
          </div>
          <p className="mt-0.5 text-xs text-slate-300 leading-snug">{achievement.description}</p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss achievement notification"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
