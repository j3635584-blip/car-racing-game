import React, { useEffect, useState } from 'react';
import { RefreshCw, Trophy, X } from 'lucide-react';
import { CAR_PRESETS, TRACK_PRESETS, WEATHER_PRESETS } from '../game/constants';
import type { TrackId } from '../game/types';
import { formatRaceTime, type LeaderboardEntry } from '../services/leaderboardService';

interface LeaderboardModalProps {
  open: boolean;
  entries: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  trackFilter: TrackId | 'all';
  driverName: string;
  latestPlayerEntryId: string | null;
  latestSubmissionRank: number | null;
  latestSubmissionTimeMs: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onChangeFilter: (filter: TrackId | 'all') => void;
  onSaveDriverName: (name: string) => void;
}

const FILTER_TABS: Array<{ id: TrackId | 'all'; label: string }> = [
  { id: 'all', label: 'All Circuits' },
  ...TRACK_PRESETS.map((t) => ({ id: t.id, label: t.name })),
];

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  open,
  entries,
  loading,
  error,
  trackFilter,
  driverName,
  latestPlayerEntryId,
  latestSubmissionRank,
  latestSubmissionTimeMs,
  onClose,
  onRefresh,
  onChangeFilter,
  onSaveDriverName,
}) => {
  const [draftName, setDraftName] = useState(driverName);
  const [nameSavedNotice, setNameSavedNotice] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftName(driverName);
    }
  }, [driverName, open]);

  if (!open) return null;

  const getTrackName = (id: string) => TRACK_PRESETS.find((t) => t.id === id)?.name ?? id;
  const getCarName = (id: string) => CAR_PRESETS.find((c) => c.id === id)?.name ?? id;
  const getWeatherName = (id: string) => WEATHER_PRESETS.find((w) => w.id === id)?.name ?? id;

  const handleSubmitName = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDriverName(draftName);
    setNameSavedNotice(true);
    window.setTimeout(() => setNameSavedNotice(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 sm:p-6"
    >
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#0a0c12]/96 p-5 sm:p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Trophy className="h-5 w-5 text-amber-400 shrink-0" />
              <h2
                id="leaderboard-title"
                className="font-display text-2xl font-bold tracking-tight text-white"
              >
                Global Leaderboard
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Top 10 fastest 1.50 km sprint times across global circuits
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              aria-label="Refresh Leaderboard"
              title="Refresh Leaderboard"
              className="flex h-10 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-200 hover:bg-white/10 hover:text-white disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Leaderboard"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors shrink-0 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Circuit Filter Bar */}
        <div className="mt-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1">
          {FILTER_TABS.map((tab) => {
            const active = tab.id === trackFilter;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Latest Run Placement Banner (Plain inline typography) */}
        {latestSubmissionTimeMs !== null && latestSubmissionRank !== null && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 text-xs text-slate-300 tabular-nums">
            <span>
              Last finish time:{' '}
              <strong className="font-mono font-semibold text-white">
                {formatRaceTime(latestSubmissionTimeMs)}
              </strong>
            </span>
            <span className="font-medium text-amber-400">
              {latestSubmissionRank <= 10
                ? `Ranked #${latestSubmissionRank} globally`
                : `Ranked #${latestSubmissionRank} overall`}
            </span>
          </div>
        )}

        {/* Leaderboard Table Content */}
        <div className="mt-3 flex-1 overflow-y-auto pr-1">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-rose-300">{error}</p>
              <button
                type="button"
                onClick={onRefresh}
                className="mt-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                Retry Fetch
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-2 py-2" aria-busy="true" aria-label="Loading leaderboard">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-11 w-full rounded-lg bg-white/5"
                />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No sprint times recorded for this circuit yet. Complete a 1.50 km run to set the pace.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs font-medium text-slate-400">
                  <th className="py-2.5 pr-3 font-medium w-10">#</th>
                  <th className="py-2.5 pr-3 font-medium">Driver</th>
                  <th className="py-2.5 pr-3 font-medium hidden sm:table-cell">
                    Circuit · Vehicle
                  </th>
                  <th className="py-2.5 pr-3 font-medium text-right">Top Speed</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8 tabular-nums">
                {entries.map((entry) => {
                  const isHighlighted =
                    entry.id === latestPlayerEntryId || Boolean(entry.isPlayer);
                  return (
                    <tr
                      key={entry.id}
                      className={
                        isHighlighted ? 'bg-amber-500/10 text-white' : 'text-slate-200'
                      }
                    >
                      <td className="py-2.5 pr-3 font-display font-bold">
                        <span
                          className={
                            entry.rank === 1
                              ? 'text-amber-400'
                              : entry.rank <= 3
                                ? 'text-cyan-300'
                                : 'text-slate-400'
                          }
                        >
                          {entry.rank}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="truncate max-w-[140px] sm:max-w-[180px]">
                            {entry.driverName}
                          </span>
                          {entry.isPlayer && (
                            <span className="text-[11px] font-normal text-amber-400">
                              · You
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-400 sm:hidden">
                          {getTrackName(entry.trackId)} · {getCarName(entry.carId)}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-400 hidden sm:table-cell">
                        <span>{getTrackName(entry.trackId)}</span>
                        <span className="mx-1.5 text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span className="text-slate-300">{getCarName(entry.carId)}</span>
                        <span className="mx-1.5 text-slate-600" aria-hidden="true">
                          ·
                        </span>
                        <span>{getWeatherName(entry.weather)}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right text-xs text-slate-300">
                        {entry.topSpeedKmh} km/h
                      </td>
                      <td className="py-2.5 pl-3 text-right font-mono font-semibold text-white">
                        {formatRaceTime(entry.timeMs)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer: Driver Callsign Configuration */}
        <form
          onSubmit={handleSubmitName}
          className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4"
        >
          <label htmlFor="driver-callsign" className="text-xs text-slate-400">
            Driver name for submitted times
          </label>
          <div className="flex items-center gap-2">
            <input
              id="driver-callsign"
              type="text"
              maxLength={20}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Enter callsign"
              className="h-9 w-40 sm:w-48 rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 rounded-lg border border-white/10 bg-white/10 px-3.5 text-xs font-medium text-white hover:bg-white/15 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {nameSavedNotice ? 'Saved' : 'Save Name'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
