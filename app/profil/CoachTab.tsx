"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PilotageReport, SectorCoaching, ThermalReport } from '@/lib/coachPilotage';
import { NOMS_ROUE } from '@/lib/coachPilotage';
import { EmptyState, type ProfileLap } from './profilShared';

interface Config {
  key: string;
  trackId: number;
  carOrdinal: number;
  carClass: string;
  drivetrain: string;
  label: string;
  bestMs: number;
}

interface CoachResponse {
  time_ms: number;
  sectorsMs: number[];
  heldByYou: boolean[];
  report: PilotageReport;
  thermal: ThermalReport;
}

const fC = (f: number) => Math.round((f - 32) * 5 / 9); // °F (télémétrie) → °C lisible

type Status = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

const fmtSec = (ms: number) => (ms / 1000).toFixed(3).replace('.', ',') + ' s';
const fmtDelta = (ms: number) =>
  (ms >= 0 ? '+' : '−') + (Math.abs(ms) / 1000).toFixed(2).replace('.', ',') + ' s';

/** Onglet « Coach de pilotage » : analyse post-tour de ta trace, par secteur. */
export function CoachTab({ laps }: { laps: ProfileLap[] }) {
  // Une config = circuit + voiture + classe + transmission. On garde le meilleur
  // temps par config pour l'étiquette ; ce sont les configs où une trace peut exister.
  const configs = useMemo<Config[]>(() => {
    const m = new Map<string, Config>();
    for (const lap of laps) {
      const key = `${lap.track_id}|${lap.car_ordinal}|${lap.car_class}|${lap.drivetrain}`;
      const car = `${lap.cars?.year ?? ''} ${lap.cars?.manufacturer ?? ''} ${lap.cars?.name ?? ''}`.trim();
      const label = `${lap.tracks?.name ?? 'Circuit'} · ${car || 'Voiture'} · ${lap.car_class}/${lap.drivetrain}`;
      const prev = m.get(key);
      if (!prev || lap.time_ms < prev.bestMs) {
        m.set(key, { key, trackId: lap.track_id, carOrdinal: lap.car_ordinal,
          carClass: lap.car_class, drivetrain: lap.drivetrain, label, bestMs: lap.time_ms });
      }
    }
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [laps]);

  const [selectedKey, setSelectedKey] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [data, setData] = useState<CoachResponse | null>(null);
  const [search, setSearch] = useState('');
  const [showList, setShowList] = useState(false);

  // Sélection par défaut : la première config disponible.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- défaut dérivé de la liste de configs
    if (configs.length && !configs.some(c => c.key === selectedKey)) setSelectedKey(configs[0].key);
  }, [configs, selectedKey]);

  const selected = configs.find(c => c.key === selectedKey) ?? null;

  const filteredConfigs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return configs;
    return configs.filter(c => c.label.toLowerCase().includes(q));
  }, [configs, search]);

  useEffect(() => {
    if (!selected) return;
    let annule = false;
    (async () => {
      setStatus('loading');
      setData(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { if (!annule) setStatus('error'); return; }
      const qs = new URLSearchParams({
        track_id:    String(selected.trackId),
        car_ordinal: String(selected.carOrdinal),
        car_class:   selected.carClass,
        drivetrain:  selected.drivetrain,
      });
      try {
        const res = await fetch(`/api/coach?${qs}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (annule) return;
        if (res.status === 204) { setStatus('empty'); return; }
        if (!res.ok) { setStatus('error'); return; }
        setData(await res.json());
        setStatus('ready');
      } catch {
        if (!annule) setStatus('error');
      }
    })();
    return () => { annule = true; };
  }, [selectedKey, selected]);

  if (configs.length === 0) {
    return <EmptyState message="Aucun chrono enregistré : lance le relais et roule pour débloquer ton coach." />;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-4">
        <label className="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">
          Config à analyser
        </label>
        <div className="relative">
          <input
            type="text"
            value={showList ? search : (selected?.label ?? '')}
            onChange={e => { setSearch(e.target.value); setShowList(true); }}
            onFocus={() => { setSearch(''); setShowList(true); }}
            onBlur={() => setTimeout(() => setShowList(false), 150)}
            placeholder="Rechercher un circuit, une voiture…"
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
          />
          <span aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none">🔍</span>
          {showList && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredConfigs.length === 0 ? (
                <p className="px-3 py-2 text-sm text-neutral-500">Aucune config ne correspond.</p>
              ) : filteredConfigs.map(c => (
                <button
                  key={c.key}
                  onMouseDown={() => { setSelectedKey(c.key); setSearch(''); setShowList(false); }}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    c.key === selectedKey
                      ? 'bg-pink-500/20 text-pink-400'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Analyse de ton meilleur tour tracé, découpé en tronçons <strong>égaux en distance</strong>
          {' '}(pas les secteurs du jeu : Forza n&apos;expose pas de checkpoint). Les conseils portent
          {' '}sur la <strong>conduite</strong> uniquement.
        </p>
      </div>

      {status === 'loading' && <p className="text-neutral-500 animate-pulse px-1">Analyse de ta trace…</p>}
      {status === 'error'   && <p className="text-red-400 px-1">Impossible de charger l&apos;analyse. Réessaie plus tard.</p>}
      {status === 'empty'   && (
        <EmptyState message="Pas encore de trace sur cette config. Bats ton temps avec le relais à jour (≥ v1.13) pour enregistrer une trace et débloquer l'analyse." />
      )}
      {status === 'ready' && data && <CoachReport data={data} />}
    </div>
  );
}

function CoachReport({ data }: { data: CoachResponse }) {
  const { report, heldByYou } = data;
  const gain = report.totalLossMs;
  const worst = report.worstIndex;

  return (
    <div className="flex flex-col gap-4">
      {/* Synthèse */}
      <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-4 flex flex-wrap gap-x-8 gap-y-2">
        <div>
          <p className="text-xs text-neutral-500 font-medium">Ton meilleur tour</p>
          <p className="text-lg font-extrabold text-neutral-900 dark:text-white">{fmtSec(data.time_ms)}</p>
        </div>
        {gain !== null && gain > 0 && (
          <div>
            <p className="text-xs text-neutral-500 font-medium">Gain potentiel (somme des secteurs)</p>
            <p className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-violet-600">
              {fmtDelta(-gain)}
            </p>
          </div>
        )}
        {worst !== null && (
          <div>
            <p className="text-xs text-neutral-500 font-medium">Secteur à travailler en priorité</p>
            <p className="text-lg font-extrabold text-neutral-900 dark:text-white">Secteur {worst + 1}</p>
          </div>
        )}
      </div>

      {/* Équilibre thermique (relais ≥ 2.1) */}
      {data.thermal?.available && <ThermalCard t={data.thermal} />}

      {/* Secteurs */}
      <div className="flex flex-col gap-2">
        {report.sectors.map(s => (
          <SectorCard key={s.index} s={s} held={heldByYou[s.index]} isWorst={s.index === worst} total={report.sectors.length} />
        ))}
      </div>
    </div>
  );
}

function ThermalCard({ t }: { t: ThermalReport }) {
  const tendances: Record<ThermalReport['tendency'], { txt: string; cls: string }> = {
    survirage:     { txt: "L'arrière chauffe plus → tendance survirage", cls: 'text-amber-500' },
    'sous-virage': { txt: "L'avant chauffe plus → tendance sous-virage", cls: 'text-amber-500' },
    neutre:        { txt: 'Avant / arrière équilibrés', cls: 'text-emerald-500' },
  };
  const tend = tendances[t.tendency];
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-4">
      <p className="text-sm font-bold text-neutral-900 dark:text-white mb-1">🌡️ Équilibre thermique des pneus</p>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500">
        <span>Avant : <strong className="text-neutral-700 dark:text-neutral-300">{fC(t.avgAv)} °C</strong></span>
        <span>Arrière : <strong className="text-neutral-700 dark:text-neutral-300">{fC(t.avgAr)} °C</strong></span>
        <span className={tend.cls}>{tend.txt}</span>
      </div>
      {t.overheat && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400 flex gap-2">
          <span aria-hidden="true">⚠️</span>
          <span>Pneu <strong>{NOMS_ROUE[t.hottest]}</strong> en surchauffe ({fC(t.med[t.hottest])} °C) : il glisse/travaille le plus →
            vise une pression à chaud plus basse de ce côté, ou vérifie le carrossage.</span>
        </p>
      )}
      <p className="mt-2 text-[11px] text-neutral-400 leading-snug">
        Indicatif : la tendance AV/AR dépend aussi du réglage de freins. Le copilote complet (sous/survirage, amortisseurs…) est dans le relais en jeu.
      </p>
    </div>
  );
}

function SectorCard({ s, held, isWorst, total }: { s: SectorCoaching; held: boolean; isWorst: boolean; total: number }) {
  const losing = s.deltaMs !== null && s.deltaMs > 0;
  return (
    <div className={`rounded-xl border p-4 ${
      isWorst
        ? 'border-pink-500/60 bg-pink-500/5'
        : 'border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900'
    }`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-bold text-neutral-900 dark:text-white">Secteur {s.index + 1}/{total}</span>
        <span className="text-xs text-neutral-400 font-mono">
          km {(s.startM / 1000).toFixed(2).replace('.', ',')} → {(s.endM / 1000).toFixed(2).replace('.', ',')}
        </span>
        <span className="font-mono text-sm text-neutral-700 dark:text-neutral-300">{fmtSec(s.yourMs)}</span>
        {s.deltaMs !== null && (
          <span className={`text-sm font-bold ${losing ? 'text-amber-500' : 'text-emerald-500'}`}>
            {losing ? fmtDelta(s.deltaMs) + ' vs optimal' : 'au niveau de l’optimal'}
          </span>
        )}
        {held && <span className="text-xs font-bold text-amber-400" title="Tu détiens le meilleur temps de ce secteur">🏅 ton meilleur secteur</span>}
        {isWorst && <span className="ml-auto text-xs font-bold text-pink-400">à travailler</span>}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs text-neutral-500">
        <span>Passage : <strong className="text-neutral-700 dark:text-neutral-300">{Math.round(s.apexKmh)} km/h</strong></span>
        {s.brakeStartPct !== null && (
          <span>Freinage dès <strong className="text-neutral-700 dark:text-neutral-300">{Math.round(s.brakeStartPct)} %</strong> du secteur</span>
        )}
        {s.coastPct > 5 && (
          <span>Roue libre : <strong className="text-neutral-700 dark:text-neutral-300">{Math.round(s.coastPct)} %</strong></span>
        )}
        {s.fullThrottlePct !== null && (
          <span>Plein gaz à <strong className="text-neutral-700 dark:text-neutral-300">{Math.round(s.fullThrottlePct)} %</strong></span>
        )}
      </div>

      {s.tips.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {s.tips.map((tip, i) => (
            <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
              <span aria-hidden="true">💡</span><span>{tip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
