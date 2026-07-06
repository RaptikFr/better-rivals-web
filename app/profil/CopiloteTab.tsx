"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dateRelative } from '@/lib/dateRelative';
import { syntheseParVoiture, type SyntheseVoiture } from '@/lib/copiloteSynthese';
import { EmptyState } from './profilShared';

interface Report {
  id: string;
  track_id: number;
  car_ordinal: number;
  car_class: string;
  drivetrain: string;
  titre: string;
  conseils: string[];
  transmission: string | null;
  n_virages: number | null;
  created_at: string;
  track_name: string;
  car_label: string;
}

interface ConfigGroup {
  key: string;
  label: string;
  reports: Report[];
  /** Soucis récurrents (titre ou conseil vu ≥ 2 fois sur la config). */
  recurring: { texte: string; count: number }[];
}

type Status = 'loading' | 'ready' | 'empty' | 'error';
type Vue = 'circuit' | 'voiture';

/** Onglet « Copilote de réglage » : boîte de réception des diagnostics de
 *  réglage relevés en jeu par le relais. Agrège par config pour révéler les
 *  soucis RÉCURRENTS, et laisse évacuer chaque diagnostic une fois lu. */
export function CopiloteTab() {
  const [status, setStatus]   = useState<Status>('loading');
  const [reports, setReports] = useState<Report[]>([]);
  const [vue, setVue]         = useState<Vue>('circuit');

  useEffect(() => {
    let annule = false;
    (async () => {
      setStatus('loading');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { if (!annule) setStatus('error'); return; }
      try {
        const res = await fetch('/api/coach-reports', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (annule) return;
        if (!res.ok) { setStatus('error'); return; }
        const json = await res.json();
        const rows: Report[] = json.reports ?? [];
        setReports(rows);
        setStatus(rows.length ? 'ready' : 'empty');
      } catch {
        if (!annule) setStatus('error');
      }
    })();
    return () => { annule = true; };
  }, []);

  async function supprimer(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    // Optimiste : on retire tout de suite, on remet en cas d'échec.
    const avant = reports;
    const apres = reports.filter(r => r.id !== id);
    setReports(apres);
    setStatus(apres.length ? 'ready' : 'empty');
    try {
      const res = await fetch(`/api/coach-reports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error();
    } catch {
      setReports(avant);
      setStatus('ready');
    }
  }

  const groups = useMemo<ConfigGroup[]>(() => {
    const m = new Map<string, ConfigGroup>();
    for (const r of reports) {
      const key = `${r.track_id}|${r.car_ordinal}|${r.car_class}|${r.drivetrain}`;
      const label = `${r.track_name} · ${r.car_label || 'Voiture'} · ${r.car_class}/${r.drivetrain}`;
      if (!m.has(key)) m.set(key, { key, label, reports: [], recurring: [] });
      m.get(key)!.reports.push(r);
    }
    // Soucis récurrents : on compte chaque énoncé (titre hors « neutre », + conseils).
    for (const g of m.values()) {
      const counts = new Map<string, number>();
      for (const r of g.reports) {
        if (r.titre && !/neutre/i.test(r.titre)) {
          counts.set(r.titre, (counts.get(r.titre) ?? 0) + 1);
        }
        for (const c of r.conseils) counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      g.recurring = [...counts.entries()]
        .filter(([, n]) => n >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([texte, count]) => ({ texte, count }));
    }
    // Configs triées par diagnostic le plus récent.
    return [...m.values()].sort((a, b) =>
      b.reports[0].created_at.localeCompare(a.reports[0].created_at));
  }, [reports]);

  // Synthèse « par voiture » : mêmes diagnostics, regroupés tous circuits
  // confondus — un souci multi-circuits est un défaut du réglage de la voiture.
  const syntheses = useMemo<SyntheseVoiture[]>(() => syntheseParVoiture(reports), [reports]);

  if (status === 'loading') return <p className="text-neutral-500 animate-pulse px-1">Chargement de tes diagnostics…</p>;
  if (status === 'error')   return <p className="text-red-400 px-1">Impossible de charger tes diagnostics. Réessaie plus tard.</p>;
  if (status === 'empty') {
    return (
      <EmptyState message="Aucun diagnostic de réglage reçu. Active le copilote 🔧 RÉGLAGE dans le relais (≥ v3) et roule un tour sur asphalte : ses soucis de réglage arriveront ici. Le copilote n'analyse que les courses sur route, les courses de rue et les touges — pas le tout-chemin ni le cross-country." />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500 px-1">
        Les soucis de <strong>réglage</strong> relevés en jeu par le copilote.
        Un diagnostic <strong>récurrent</strong> (vu plusieurs fois) est un vrai axe d&apos;amélioration,
        pas un tour isolé. Le copilote n&apos;analyse que
        l&apos;<strong>asphalte</strong> (route, rue, touge) — hors de là, la physique tout-terrain
        fausserait le diagnostic.
      </p>

      {/* Sélecteur de vue : par config (boîte de réception) ou synthèse par voiture. */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-1 w-fit">
        {([
          { id: 'circuit', label: '📍 Par circuit' },
          { id: 'voiture', label: '🚗 Par voiture' },
        ] as { id: Vue; label: string }[]).map(v => (
          <button
            key={v.id}
            onClick={() => setVue(v.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              vue === v.id
                ? 'bg-gradient-to-r from-pink-500 to-violet-600 text-white'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {vue === 'voiture' && (
        <>
          <p className="text-sm text-neutral-500 px-1">
            Tous circuits confondus : un souci vu sur <strong>plusieurs circuits</strong> vient
            du <strong>réglage de la voiture</strong> — corrige-le en priorité. Un souci vu sur
            un seul circuit est plutôt lié à la piste (ou au pilotage ce jour-là).
          </p>
          {syntheses.map(s => <SyntheseCard key={s.key} s={s} />)}
        </>
      )}

      {vue === 'circuit' && groups.map(g => (
        <div key={g.key} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
            <span className="font-bold text-neutral-900 dark:text-white">{g.label}</span>
            <span className="text-xs text-neutral-500">{g.reports.length} diagnostic{g.reports.length > 1 ? 's' : ''}</span>
          </div>

          {g.recurring.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 mt-1">
              {g.recurring.map(rc => (
                <span key={rc.texte}
                  className="text-xs font-semibold rounded-full px-2.5 py-1 bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/30">
                  🔁 {rc.texte} <span className="opacity-70">×{rc.count}</span>
                </span>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {g.reports.map(r => (
              <ReportCard key={r.id} r={r} onDelete={() => supprimer(r.id)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SyntheseCard({ s }: { s: SyntheseVoiture }) {
  const voitureEntiere = s.soucis.filter(x => x.nbCircuits >= 2);
  const locaux         = s.soucis.filter(x => x.nbCircuits < 2);
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
        <span className="font-bold text-neutral-900 dark:text-white">
          {s.carLabel} · {s.carClass}/{s.drivetrain}
        </span>
        <span className="text-xs text-neutral-500">
          {s.nbDiagnostics} diagnostic{s.nbDiagnostics > 1 ? 's' : ''} sur {s.nbCircuits} circuit{s.nbCircuits > 1 ? 's' : ''}
          {' · '}dernier {dateRelative(s.dernierAt)}
        </span>
      </div>

      {s.soucis.length === 0 ? (
        <p className="text-sm text-emerald-500 font-semibold">
          ✅ Rien à signaler sur cette voiture ({s.nbNeutres} tour{s.nbNeutres > 1 ? 's' : ''} analysé{s.nbNeutres > 1 ? 's' : ''} sans souci).
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {voitureEntiere.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                🚗 Soucis de la voiture (plusieurs circuits)
              </p>
              <ul className="flex flex-col gap-1">
                {voitureEntiere.map(x => (
                  <li key={x.texte} className="text-sm text-neutral-700 dark:text-neutral-300 flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold text-amber-500">{x.texte}</span>
                    <span className="text-xs text-neutral-500">
                      ×{x.count} · {x.nbCircuits} circuits ({x.circuits.slice(0, 3).join(', ')}{x.circuits.length > 3 ? '…' : ''})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {locaux.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                📍 Vus sur un seul circuit
              </p>
              <ul className="flex flex-col gap-1">
                {locaux.map(x => (
                  <li key={x.texte} className="text-sm text-neutral-600 dark:text-neutral-400 flex flex-wrap items-baseline gap-x-2">
                    <span>{x.texte}</span>
                    <span className="text-xs text-neutral-500">×{x.count} · {x.circuits[0]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.conseils.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                🔧 Conseils les plus fréquents
              </p>
              <ul className="flex flex-col gap-1">
                {s.conseils.map(c => (
                  <li key={c.texte} className="text-sm text-neutral-700 dark:text-neutral-300 flex flex-wrap items-baseline gap-x-2">
                    <span>🔧 {c.texte}</span>
                    <span className="text-xs text-neutral-500">
                      ×{c.count}{c.nbCircuits >= 2 ? ` · ${c.nbCircuits} circuits` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.nbNeutres > 0 && (
            <p className="text-xs text-neutral-500">
              {s.nbNeutres} tour{s.nbNeutres > 1 ? 's' : ''} sans souci par ailleurs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ r, onDelete }: { r: Report; onDelete: () => void }) {
  const neutre = /neutre/i.test(r.titre);
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className={`font-bold ${neutre ? 'text-emerald-500' : 'text-amber-500'}`}>{r.titre}</span>
            <span className="text-xs text-neutral-400">· {dateRelative(r.created_at)}</span>
            {r.n_virages != null && (
              <span className="text-xs text-neutral-400">· {r.n_virages} virage{r.n_virages > 1 ? 's' : ''}</span>
            )}
          </div>
          {r.conseils.length > 0 ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              {r.conseils.map((c, i) => (
                <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
                  <span aria-hidden="true">🔧</span><span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-neutral-500">Rien à signaler sur ce tour 👍</p>
          )}
        </div>
        <button
          onClick={onDelete}
          aria-label="Supprimer ce diagnostic"
          title="✓ Traité / supprimer"
          className="shrink-0 text-xs font-semibold text-neutral-500 hover:text-pink-500 border border-neutral-300 dark:border-neutral-700 hover:border-pink-500 rounded-lg px-2.5 py-1 transition-colors"
        >
          ✓ Traité
        </button>
      </div>
    </div>
  );
}
