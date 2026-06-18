"use client";

import Link from 'next/link';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import { CLASS_STYLES } from '@/components/ClassStyles';
import { DiscordTag } from '@/components/DiscordTag';
import { getTypeIcon, getSprintIcon } from '@/lib/trackIcons';
import type { Preferences } from '@/lib/preferences';
import { TargetButton } from '@/components/TargetButton';
import { TuneCell, LeaderTuneCell, type CircuitGroup, type LapTime, type RankedLap, type SubGroup } from './classementsShared';

// Ligne « Réglage du n°1 » sous l'en-tête d'une config, si le leader a renseigné
// un code de réglage. Le leader est le 1er temps (laps triés par temps croissant).
function leaderTune(group: SubGroup) {
  const leader = group.laps[0];
  if (!leader?.share_code) return null;
  return <LeaderTuneCell shareCode={leader.share_code} author={leader.setup_author} />;
}

// Objectif « battre ce temps » : visible seulement pour les temps d'un autre
// pilote, quand on est connecté.
function rowTargetButton(lap: RankedLap, isAuthed: boolean, currentPlayerId: string | null) {
  if (!isAuthed || currentPlayerId === null || lap.player_id === currentPlayerId) return null;
  return (
    <TargetButton
      compact
      config={{
        targetPlayerId: lap.player_id,
        trackId:        lap.track_id,
        carOrdinal:     lap.car_ordinal,
        carClass:       lap.car_class,
        drivetrain:     lap.drivetrain,
      }}
    />
  );
}

interface RankingViewProps {
  groups: CircuitGroup[];
  openGroups: Set<string>;
  toggleGroup: (key: string) => void;
  highlightId: string | null;
  formatTime: (ms: number) => string;
  gapStr: (ms: number) => string;
  isAuthed: boolean;
  currentPlayerId: string | null;
  copiedRowId: string | null;
  onShareRow: (lapId: string) => void;
  onReport: (lap: LapTime) => void;
}

export function RankingTableView({
  groups, openGroups, toggleGroup, highlightId, formatTime, gapStr,
  isAuthed, currentPlayerId, copiedRowId, onShareRow, onReport,
  cols,
}: RankingViewProps & { cols: Preferences['tableColumns'] }) {
  return (
    <div className="space-y-6">
      {groups.map(circuit => (
        <div
          key={circuit.trackId}
          className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
        >
          {/* En-tête de circuit */}
          <div className="px-5 py-4 bg-neutral-200/60 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-lg text-neutral-900 dark:text-white">
                {getTypeIcon(circuit.trackType ?? '')} {getSprintIcon(circuit.trackIsSprint ?? false)} {circuit.trackName}
              </h2>
              {circuit.trackLengthKm && (
                <span className="text-sm text-neutral-500">· {circuit.trackLengthKm} km</span>
              )}
            </div>
            <span className="text-xs text-neutral-500 font-mono flex-shrink-0">
              {circuit.subGroups.length} config{circuit.subGroups.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Configs repliables — chaque config déroule un tableau aligné */}
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {circuit.subGroups.map(group => {
              const isOpen = openGroups.has(group.key);
              return (
                <div key={group.key}>
                  {/* En-tête de config cliquable (Catégorie · Transmission · Modèle) */}
                  <button
                    onClick={() => toggleGroup(group.key)}
                    className="w-full flex items-center gap-2 px-4 py-3 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                  >
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                      style={CLASS_STYLES[group.carClass] ?? { backgroundColor: '#555', color: '#fff' }}
                    >
                      {group.carClass}
                    </span>
                    <DrivetrainBadge drivetrain={group.drivetrain} />
                    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">{group.carLabel}</span>
                    <span className="text-xs text-neutral-500 ml-auto flex-shrink-0 mr-1">
                      {group.laps.length} pilote{group.laps.length > 1 ? 's' : ''}
                    </span>
                    <svg
                      className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {leaderTune(group)}

                  {/* Tableau en colonnes — visible si la config est dépliée */}
                  {isOpen && (
                    <div className="overflow-x-auto pb-2">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-neutral-500 border-y border-neutral-200 dark:border-neutral-800">
                            <th className="px-3 py-2 font-bold text-right">Classement</th>
                            <th className="px-3 py-2 font-bold">Pseudo</th>
                            <th className="px-3 py-2 font-bold">Meilleur temps</th>
                            {cols.previousTime && <th className="px-3 py-2 font-bold">Ancien meilleur temps</th>}
                            {cols.diff && <th className="px-3 py-2 font-bold">Différence</th>}
                            {cols.gapLeader && <th className="px-3 py-2 font-bold">Écart avec le n°1</th>}
                            {cols.gapPrev && <th className="px-3 py-2 font-bold">Écart avec le joueur précédent</th>}
                            {cols.gapNext && <th className="px-3 py-2 font-bold">Écart avec le joueur suivant</th>}
                            {cols.pi && <th className="px-3 py-2 font-bold">Indice de Performance</th>}
                            {cols.tune && <th className="px-3 py-2 font-bold">Réglage</th>}
                            <th className="px-3 py-2" aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {group.laps.map((lap, i) => {
                            const leader  = group.laps[0];
                            const prevLap = group.laps[i - 1];
                            const nextLap = group.laps[i + 1];
                            return (
                              <tr
                                key={lap.id}
                                data-lap-id={lap.id}
                                className={`border-b border-neutral-200/60 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors ${
                                  lap.id === highlightId ? 'bg-pink-500/20 dark:bg-pink-500/20' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-right font-bold text-neutral-500 tabular-nums">{lap.rank}</td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <Link
                                    href={`/joueurs/${encodeURIComponent(lap.players?.pseudo ?? '')}`}
                                    className="font-bold text-neutral-900 dark:text-white hover:text-pink-400 transition-colors"
                                  >
                                    {lap.players?.pseudo ?? 'Inconnu'}
                                  </Link>
                                  {cols.discord && <DiscordTag tag={lap.players?.discord_tag} />}
                                </td>
                                <td className="px-3 py-2 font-mono font-bold text-pink-400 whitespace-nowrap">{formatTime(lap.time_ms)}</td>
                                {cols.previousTime && (
                                  <td className="px-3 py-2 font-mono text-xs text-neutral-500 whitespace-nowrap">
                                    {lap.previous_time_ms ? formatTime(lap.previous_time_ms) : '—'}
                                  </td>
                                )}
                                {cols.diff && (
                                  <td className="px-3 py-2 font-mono text-xs text-orange-400 whitespace-nowrap">
                                    {lap.previous_time_ms ? gapStr(lap.previous_time_ms - lap.time_ms) : '—'}
                                  </td>
                                )}
                                {cols.gapLeader && (
                                  <td className="px-3 py-2 font-mono text-xs text-sky-400 whitespace-nowrap">
                                    {lap.rank > 1 ? gapStr(lap.time_ms - leader.time_ms) : '—'}
                                  </td>
                                )}
                                {cols.gapPrev && (
                                  <td className="px-3 py-2 font-mono text-xs text-violet-400 whitespace-nowrap">
                                    {prevLap ? gapStr(lap.time_ms - prevLap.time_ms) : '—'}
                                  </td>
                                )}
                                {cols.gapNext && (
                                  <td className="px-3 py-2 font-mono text-xs text-emerald-400 whitespace-nowrap">
                                    {nextLap ? gapStr(nextLap.time_ms - lap.time_ms) : '—'}
                                  </td>
                                )}
                                {cols.pi && <td className="px-3 py-2 font-mono text-xs text-neutral-500 whitespace-nowrap">PI {lap.car_pi}</td>}
                                {cols.tune && <td className="px-3 py-2"><TuneCell lap={lap} /></td>}
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => onShareRow(lap.id)}
                                      title="Copier le lien vers ce temps"
                                      aria-label="Copier le lien vers ce temps"
                                      className="text-neutral-400 hover:text-pink-400 transition-colors text-xs"
                                    >
                                      {copiedRowId === lap.id ? <span className="text-pink-400 font-bold">Copié!</span> : '🔗'}
                                    </button>
                                    {rowTargetButton(lap, isAuthed, currentPlayerId)}
                                    {isAuthed && currentPlayerId !== null && (
                                      lap.player_id !== currentPlayerId ? (
                                        <button
                                          onClick={() => onReport(lap)}
                                          title="Signaler ce temps comme suspect"
                                          aria-label="Signaler ce temps comme suspect"
                                          className="text-neutral-500 hover:text-red-400 transition-colors"
                                        >
                                          🚩
                                        </button>
                                      ) : (
                                        <span aria-hidden="true" className="invisible select-none">🚩</span>
                                      )
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RankingCardView({
  groups, openGroups, toggleGroup, highlightId, formatTime, gapStr,
  isAuthed, currentPlayerId, copiedRowId, onShareRow, onReport,
}: RankingViewProps) {
  return (
    <div className="space-y-6">
      {groups.map(circuit => (
        <div
          key={circuit.trackId}
          className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden"
        >
          {/* En-tête de circuit */}
          <div className="px-5 py-4 bg-neutral-200/60 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-extrabold text-lg text-neutral-900 dark:text-white">
                {getTypeIcon(circuit.trackType ?? '')} {getSprintIcon(circuit.trackIsSprint ?? false)} {circuit.trackName}
              </h2>
              {circuit.trackLengthKm && (
                <span className="text-sm text-neutral-500">· {circuit.trackLengthKm} km</span>
              )}
            </div>
            <span className="text-xs text-neutral-500 font-mono flex-shrink-0">
              {circuit.subGroups.length} config{circuit.subGroups.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Sous-groupes */}
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {circuit.subGroups.map(group => (
              <div key={group.key}>

                {/* En-tête cliquable */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center gap-2 px-4 py-3 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left"
                >
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0"
                    style={CLASS_STYLES[group.carClass] ?? { backgroundColor: '#555', color: '#fff' }}
                  >
                    {group.carClass}
                  </span>
                  <DrivetrainBadge drivetrain={group.drivetrain} />
                  <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 truncate">{group.carLabel}</span>
                  <span className="text-xs text-neutral-500 ml-auto flex-shrink-0 mr-1">
                    {group.laps.length} pilote{group.laps.length > 1 ? 's' : ''}
                  </span>
                  <svg
                    className={`w-4 h-4 flex-shrink-0 text-neutral-400 transition-transform ${openGroups.has(group.key) ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {leaderTune(group)}

                {/* Liste des temps — visible si ouvert.
                    Lignes empilées en carte sur mobile, alignées en
                    colonnes sur ≥ sm (sm:contents garde rang + pseudo
                    comme deux colonnes distinctes). */}
                {openGroups.has(group.key) && (
                <div className="px-4 pb-4 text-sm">
                  {group.laps.map((lap, lapIndex) => (
                    <div
                      key={lap.id}
                      data-lap-id={lap.id}
                      className={`flex flex-col gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 mb-2
                                  sm:flex-row sm:items-start sm:gap-3 sm:rounded-none sm:border-0 sm:border-b sm:last:border-0 sm:p-0 sm:py-3 sm:mb-0
                                  hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors ${
                        lap.id === highlightId ? 'bg-pink-500/20 dark:bg-pink-500/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:contents">
                        <span className="font-bold text-neutral-500 tabular-nums sm:w-8 sm:text-right sm:py-0">
                          {lap.rank}
                        </span>
                        <span className="font-bold text-neutral-900 dark:text-white sm:w-44 sm:truncate">
                          <Link
                            href={`/joueurs/${encodeURIComponent(lap.players?.pseudo ?? '')}`}
                            className="hover:text-pink-400 transition-colors"
                          >
                            {lap.players?.pseudo ?? 'Inconnu'}
                          </Link>
                          <DiscordTag tag={lap.players?.discord_tag} />
                        </span>
                      </div>
                      <div className="sm:flex-1">
                        <div className="grid grid-cols-[auto_1fr] items-baseline gap-x-2 gap-y-0.5 whitespace-nowrap">
                          <span className="text-xs text-neutral-500">Meilleur</span>
                          <span className="font-mono font-bold text-pink-400">{formatTime(lap.time_ms)}</span>
                          {lap.previous_time_ms && (
                            <>
                              <span className="text-xs text-neutral-500">Précédent</span>
                              <span className="text-xs font-mono text-neutral-500">
                                ↑ {formatTime(lap.previous_time_ms)}{' '}
                                <span className="text-orange-400">{gapStr(lap.previous_time_ms - lap.time_ms)}</span>
                              </span>
                            </>
                          )}
                          {lap.rank > 1 && (
                            <>
                              <span className="text-xs text-neutral-500">Écart leader</span>
                              <span className="text-xs font-mono text-sky-400">{gapStr(lap.time_ms - group.laps[0].time_ms)}</span>
                            </>
                          )}
                          {lap.rank > 2 && lapIndex > 0 && (
                            <>
                              <span className="text-xs text-neutral-500">Écart préc.</span>
                              <span className="text-xs font-mono text-violet-400">{gapStr(lap.time_ms - group.laps[lapIndex - 1].time_ms)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:contents">
                        <span className="text-neutral-500 font-mono text-xs whitespace-nowrap sm:w-20">
                          PI {lap.car_pi}
                        </span>
                        <span className="sm:py-0">
                          <TuneCell lap={lap} />
                        </span>
                        <span className="flex items-center justify-end gap-1.5 sm:ml-auto">
                          <button
                            onClick={() => onShareRow(lap.id)}
                            title="Copier le lien vers ce temps"
                            aria-label="Copier le lien vers ce temps"
                            className="text-neutral-400 hover:text-pink-400 transition-colors text-xs"
                          >
                            {copiedRowId === lap.id ? <span className="text-pink-400 font-bold">Copié!</span> : '🔗'}
                          </button>
                          {rowTargetButton(lap, isAuthed, currentPlayerId)}
                          {/* Slot signalement : réservé même pour ses propres temps
                              (placeholder invisible) afin de garder le 🔗 aligné d'une ligne à l'autre. */}
                          {isAuthed && currentPlayerId !== null && (
                            lap.player_id !== currentPlayerId ? (
                              <button
                                onClick={() => onReport(lap)}
                                title="Signaler ce temps comme suspect"
                                aria-label="Signaler ce temps comme suspect"
                                className="text-neutral-500 hover:text-red-400 transition-colors"
                              >
                                🚩
                              </button>
                            ) : (
                              <span aria-hidden="true" className="invisible select-none">🚩</span>
                            )
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
