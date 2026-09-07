"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { dateRelative } from '@/lib/dateRelative';
import { DrivetrainBadge } from '@/components/DrivetrainBadge';
import type { Drivetrain } from '@/types/supabase';
import { EmptyState } from './profilShared';
import type { CurvePoint } from './TorqueCurveChart';

// recharts n'est chargé que si le joueur ouvre l'onglet et a au moins une courbe.
const TorqueCurveChart = dynamic(() => import('./TorqueCurveChart'), {
  ssr: false,
  loading: () => <p className="text-neutral-500 animate-pulse text-sm py-8">Chargement du graphique…</p>,
});

interface Curve {
  id: string;
  car_ordinal: number;
  car_label: string;
  share_code: string;
  car_class: string | null;
  drivetrain: string | null;
  car_pi: number | null;
  gear: number;
  engine_max_rpm: number | null;
  points: CurvePoint[];
  peak_torque_rpm: number | null;
  peak_torque_nm: number | null;
  peak_power_rpm: number | null;
  peak_power_kw: number | null;
  captured_at: string;
}

type Status = 'loading' | 'ready' | 'empty' | 'error';

/** Onglet « 📈 Moteur » : les courbes couple/puissance/régime capturées en jeu
 *  par le relais, une par build. Sert à régler la boîte de vitesses. */
export function MoteurTab() {
  const [status, setStatus] = useState<Status>('loading');
  const [curves, setCurves] = useState<Curve[]>([]);

  useEffect(() => {
    let annule = false;
    (async () => {
      setStatus('loading');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { if (!annule) setStatus('error'); return; }
      try {
        const res = await fetch('/api/torque-curves', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (annule) return;
        if (!res.ok) { setStatus('error'); return; }
        const json = await res.json();
        const rows: Curve[] = json.curves ?? [];
        setCurves(rows);
        setStatus(rows.length ? 'ready' : 'empty');
      } catch {
        if (!annule) setStatus('error');
      }
    })();
    return () => { annule = true; };
  }, []);

  if (status === 'loading') return <p className="text-neutral-500 animate-pulse px-1">Chargement de tes courbes moteur…</p>;
  if (status === 'error')   return <p className="text-red-400 px-1">Impossible de charger tes courbes moteur. Réessaie plus tard.</p>;
  if (status === 'empty') {
    return (
      <EmptyState message="Aucune courbe moteur enregistrée. Dans le relais (≥ v3.8.0), coche « 📈 Capture de courbe moteur », choisis un rapport (4e par ex.) puis fais une accélération pied au plancher sur une ligne droite, du bas de la plage jusqu'au rupteur. La courbe couple/puissance de ce build arrivera ici." />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-neutral-500 px-1">
        La courbe <strong>couple / puissance</strong> de chaque build, mesurée en jeu.
        Cale tes rapports sur la <strong>plage utile</strong> : garder le régime entre le
        pic de couple et le pic de puissance après chaque passage. Une nouvelle capture
        du même build remplace l&apos;ancienne.
      </p>

      {curves.map(c => (
        <div key={c.id} className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 p-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <span className="font-bold text-neutral-900 dark:text-white">{c.car_label}</span>
            {c.car_class && (
              <span className="text-xs font-semibold text-neutral-500">{c.car_class}</span>
            )}
            {c.drivetrain && <DrivetrainBadge drivetrain={c.drivetrain as Drivetrain} />}
            <span className="text-xs text-neutral-500 font-mono">code {c.share_code}</span>
            <span className="text-xs text-neutral-500">· capturée en {c.gear}<sup>e</sup> · {dateRelative(c.captured_at)}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Stat label="Pic de couple" value={c.peak_torque_nm != null ? `${Math.round(c.peak_torque_nm)} Nm` : '—'}
                  sub={c.peak_torque_rpm != null ? `à ${c.peak_torque_rpm.toLocaleString('fr-FR')} tr/min` : ''} accent="text-pink-500" />
            <Stat label="Pic de puissance" value={c.peak_power_kw != null ? `${Math.round(c.peak_power_kw)} kW` : '—'}
                  sub={c.peak_power_kw != null ? `${Math.round(c.peak_power_kw / 0.7457)} ch` : ''} accent="text-violet-500" />
            <Stat label="Régime pic puiss." value={c.peak_power_rpm != null ? `${c.peak_power_rpm.toLocaleString('fr-FR')}` : '—'} sub="tr/min" />
            <Stat label="Rupteur" value={c.engine_max_rpm != null ? c.engine_max_rpm.toLocaleString('fr-FR') : '—'} sub="tr/min" />
          </div>

          {c.points.length >= 2 ? (
            <>
              <TorqueCurveChart
                points={c.points}
                peakTorqueRpm={c.peak_torque_rpm}
                peakTorqueNm={c.peak_torque_nm}
                peakPowerRpm={c.peak_power_rpm}
                peakPowerKw={c.peak_power_kw}
              />
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
                  Voir les points ({c.points.length})
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="text-xs font-mono tabular-nums w-full max-w-md">
                    <thead>
                      <tr className="text-neutral-500 text-left">
                        <th className="py-1 pr-4 font-semibold">tr/min</th>
                        <th className="py-1 pr-4 font-semibold">couple (Nm)</th>
                        <th className="py-1 font-semibold">puiss. (kW)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.points.map((p, i) => (
                        <tr key={i} className="text-neutral-700 dark:text-neutral-300">
                          <td className="py-0.5 pr-4">{p.rpm.toLocaleString('fr-FR')}</td>
                          <td className="py-0.5 pr-4">{Math.round(p.nm)}</td>
                          <td className="py-0.5">{Math.round(p.kw)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          ) : (
            <p className="text-sm text-neutral-500">Courbe incomplète (trop peu de points).</p>
          )}
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-lg p-3">
      <p className="text-[11px] text-neutral-500 font-medium">{label}</p>
      <p className={`text-lg font-extrabold ${accent ?? 'text-neutral-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-500">{sub}</p>}
    </div>
  );
}
