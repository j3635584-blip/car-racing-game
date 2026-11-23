import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Sparkles, Target } from 'lucide-react';
import type { DailyMission } from '../services/dailyMissionsService';

interface DailyMissionHUDProps {
  missions: DailyMission[];
  onClaimReward: (missionId: string) => void;
}

export const DailyMissionHUD: React.FC<DailyMissionHUDProps> = ({ missions, onClaimReward }) => {
  const [collapsed, setCollapsed] = useState(false);

  const completedCount = missions.filter((m) => m.completed).length;

  return (
    <aside
      aria-label="Daily Missions"
      className="pointer-events-auto rounded-xl border border-white/10 bg-[#0a0c12]/90 p-3 text-slate-100 shadow-xl backdrop-blur-md max-w-xs w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-cyan-400 shrink-0" />
          <span className="font-display text-xs font-bold tracking-tight text-white">
            Daily Missions ({completedCount}/{missions.length})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Expand Daily Missions' : 'Collapse Daily Missions'}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="mt-2.5 space-y-2">
          {missions.map((mission) => {
            const pct = Math.min(100, Math.round((mission.progress / mission.target) * 100));
            return (
              <div
                key={mission.id}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-200 leading-snug">{mission.title}</span>
                  <span className="font-display font-semibold text-amber-400 tabular-nums shrink-0">
                    +{mission.rewardXP} XP
                  </span>
                </div>

                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        mission.completed ? 'bg-emerald-400' : 'bg-cyan-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                    {mission.progress}/{mission.target}
                  </span>
                </div>

                {mission.completed && !mission.claimed && (
                  <button
                    type="button"
                    onClick={() => onClaimReward(mission.id)}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-md bg-emerald-500 py-1 text-[11px] font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer"
                  >
                    <Sparkles className="h-3 w-3 fill-current" />
                    <span>Claim Reward</span>
                  </button>
                )}

                {mission.claimed && (
                  <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] font-medium text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Claimed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
