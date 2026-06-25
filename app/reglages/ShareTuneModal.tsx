"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { carSlug as buildCarSlug } from '@/lib/carSlug';
import { parsePerfInput, type TunePerfStats } from '@/lib/tunePerf';
import type { ReglageEntry } from '@/lib/reglages';

interface CarHit { car_ordinal: number; manufacturer: string | null; name: string; year: number | null }

function carLabelOf(c: CarHit): string {
  return `${c.year ?? ''} ${c.manufacturer ?? ''} ${c.name}`.trim();
}

type PerfForm = {
  acceleration: string; vitesse: string; freinage: string;
  tout_terrain: string; depart_arrete: string; tenue_de_route: string;
  top_speed_kmh: string; accel_0_161_s: string; braking_161_m: string; lateral_g_97: string;
  mecanique: string; aero: string; efficacite_aero: string;
  puissance_ch: string; couple_nm: string; poids_kg: string;
  ref_class: string; ref_pi: string;
};

const EMPTY_PERF: PerfForm = {
  acceleration: '', vitesse: '', freinage: '',
  tout_terrain: '', depart_arrete: '', tenue_de_route: '',
  top_speed_kmh: '', accel_0_161_s: '', braking_161_m: '', lateral_g_97: '',
  mecanique: '', aero: '', efficacite_aero: '',
  puissance_ch: '', couple_nm: '', poids_kg: '',
  ref_class: '', ref_pi: '',
};

function PerfInput({
  label, name, value, onChange, hint,
}: {
  label: string; name: keyof PerfForm; value: string;
  onChange: (name: keyof PerfForm, v: string) => void; hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
        {label}{hint && <span className="ml-1 text-neutral-400 font-normal">{hint}</span>}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={e => onChange(name, e.target.value)}
        className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
      />
    </div>
  );
}

/**
 * Modale « Partager un réglage » : associe un code de partage à un modèle de
 * voiture, avec revendication d'originalité optionnelle. Soumet à l'API
 * existante POST /api/tune-setups (vérif de conflit d'originalité côté serveur).
 */
export function ShareTuneModal({
  myPseudo,
  onClose,
  onShared,
}: {
  myPseudo: string;
  onClose: () => void;
  onShared: (entry: ReglageEntry) => void;
}) {
  const [carQuery,  setCarQuery]  = useState('');
  const [carHits,   setCarHits]   = useState<CarHit[]>([]);
  const [car,       setCar]       = useState<CarHit | null>(null);
  const [shareCode, setShareCode] = useState('');
  const [label,     setLabel]     = useState('');
  const [isOriginal, setIsOriginal] = useState(false);
  const [perfOpen,  setPerfOpen]  = useState(false);
  const [perf,      setPerf]      = useState<PerfForm>(EMPTY_PERF);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  function setPerfField(name: keyof PerfForm, value: string) {
    setPerf(prev => ({ ...prev, [name]: value }));
  }

  // Recherche voiture type-ahead (debounce 250 ms), tant qu'aucune n'est choisie.
  useEffect(() => {
    if (car) return;
    const q = carQuery.trim().replace(/[%_,()]/g, ' ').trim();
    if (q.length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vide les suggestions tant que la requête est trop courte
      setCarHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('cars')
        .select('car_ordinal, manufacturer, name, year')
        .not('car_ordinal', 'is', null)
        .or(`name.ilike.%${q}%,manufacturer.ilike.%${q}%`)
        .order('manufacturer').order('name')
        .limit(8);
      setCarHits((data ?? []) as CarHit[]);
    }, 250);
    return () => clearTimeout(timer);
  }, [carQuery, car]);

  async function submit() {
    setError(null);
    if (!car) { setError('Choisis une voiture.'); return; }
    if (!shareCode.trim()) { setError('Renseigne le code de partage.'); return; }

    const perfValues = Object.values(perf);
    const anyFilled  = perfValues.some(v => v !== '');
    const allFilled  = perfValues.every(v => v !== '');
    if (anyFilled && !allFilled) {
      setError('Complète tout le profil de performances ou laisse-le entièrement vide.');
      return;
    }

    let perfStats: TunePerfStats | undefined;
    if (allFilled) {
      const parsed = parsePerfInput(perf);
      if ('error' in parsed) {
        setError(parsed.error);
        return;
      }
      perfStats = parsed;
    }

    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/tune-setups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({
        car_ordinal: car.car_ordinal,
        share_code:  shareCode.trim(),
        label:       label.trim() || null,
        is_original: isOriginal,
        ...(perfStats ? { perf_stats: perfStats } : {}),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error ?? "Échec de l'envoi du réglage.");
      return;
    }

    // Carte optimiste (le cache serveur de /reglages se rafraîchit sous 5 min).
    onShared({
      shareCode:          shareCode.trim(),
      carOrdinal:         car.car_ordinal,
      carLabel:           carLabelOf(car),
      carSlug:            buildCarSlug(car.car_ordinal, car.manufacturer ?? '', car.name),
      label:              label.trim() || null,
      isOriginal,
      author:             isOriginal ? myPseudo : null,
      authorClaimed:      isOriginal,
      optimizedFor:       null,
      bestTimeMs:         null,
      bestTimeTrackName:  null,
      bestTimeClass:      null,
      bestTimeDrivetrain: null,
      usageCount:         0,
      classes:            [],
      drivetrains:        [],
      perfStats:          perfStats ?? null,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 w-full max-w-md shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div>
          <h2 className="text-lg font-extrabold text-neutral-900 dark:text-white mb-1">🔧 Partager un réglage</h2>
          <p className="text-sm text-neutral-500">Associe ton code de partage à un modèle de voiture.</p>
        </div>

        {/* Voiture */}
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Voiture</label>
          {car ? (
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2">
              <span className="text-sm font-semibold truncate">{carLabelOf(car)}</span>
              <button onClick={() => { setCar(null); setCarQuery(''); }} className="text-xs text-neutral-400 hover:text-pink-400 flex-shrink-0">Changer</button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                value={carQuery}
                onChange={e => setCarQuery(e.target.value)}
                placeholder="Rechercher une voiture…"
                className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 transition-colors"
              />
              {carHits.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                  {carHits.map(c => (
                    <button
                      key={c.car_ordinal}
                      onClick={() => { setCar(c); setCarHits([]); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors truncate"
                    >
                      {carLabelOf(c)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Code de partage */}
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">Code de partage</label>
          <input
            type="text"
            value={shareCode}
            onChange={e => setShareCode(e.target.value)}
            placeholder="ex. 123 456 789"
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        {/* Libellé optionnel */}
        <div>
          <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
            Libellé <span className="text-neutral-500 font-normal">(optionnel)</span>
          </label>
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="ex. Réglage polyvalent, top vitesse…"
            maxLength={80}
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pink-500 transition-colors"
          />
        </div>

        {/* Revendication d'originalité */}
        <label className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer select-none">
          <input type="checkbox" checked={isOriginal} onChange={e => setIsOriginal(e.target.checked)} className="accent-pink-500 mt-0.5" />
          <span>
            <span className="font-semibold">⭐ J&apos;en suis l&apos;auteur original</span>
            <span className="block text-xs text-neutral-500">Un même code ne peut être revendiqué original que par un seul joueur.</span>
          </span>
        </label>

        {/* Section perfs (optionnel, repliable) */}
        <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setPerfOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <span>📊 Performances <span className="font-normal text-neutral-500">(optionnel)</span></span>
            <span className="text-xs text-neutral-400">{perfOpen ? '▲' : '▼'}</span>
          </button>

          {perfOpen && (
            <div className="px-4 pb-4 space-y-4 bg-neutral-50 dark:bg-neutral-900/50">
              <p className="text-xs text-neutral-500 pt-3">
                Saisis les stats affichées dans la fiche du réglage in-game (vue détail du code).
                Laisse tout vide si tu ne veux pas renseigner les perfs.
              </p>

              {/* Radar */}
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Radar</p>
                <div className="grid grid-cols-2 gap-3">
                  <PerfInput label="Accélération (0-10)"     name="acceleration"   value={perf.acceleration}   onChange={setPerfField} />
                  <PerfInput label="Vitesse (0-10)"          name="vitesse"        value={perf.vitesse}        onChange={setPerfField} />
                  <PerfInput label="Freinage (0-10)"         name="freinage"       value={perf.freinage}       onChange={setPerfField} />
                  <PerfInput label="Tout-terrain (0-10)"     name="tout_terrain"   value={perf.tout_terrain}   onChange={setPerfField} />
                  <PerfInput label="Départ arrêté (0-10)"    name="depart_arrete"  value={perf.depart_arrete}  onChange={setPerfField} />
                  <PerfInput label="Tenue de route (0-10)"   name="tenue_de_route" value={perf.tenue_de_route} onChange={setPerfField} />
                </div>
              </div>

              {/* Vitesse / Accél / Freinage / G */}
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Mesures</p>
                <div className="grid grid-cols-2 gap-3">
                  <PerfInput label="Vitesse de pointe (km/h)" name="top_speed_kmh" value={perf.top_speed_kmh} onChange={setPerfField} />
                  <PerfInput label="0-161 km/h (s)"           name="accel_0_161_s" value={perf.accel_0_161_s} onChange={setPerfField} hint="«0-100» dans le jeu" />
                  <PerfInput label="Freinage 161→0 (m)"       name="braking_161_m" value={perf.braking_161_m} onChange={setPerfField} />
                  <PerfInput label="G latéraux 97 km/h (g)"   name="lateral_g_97"  value={perf.lateral_g_97}  onChange={setPerfField} />
                </div>
              </div>

              {/* Équilibres */}
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Équilibres</p>
                <div className="grid grid-cols-3 gap-3">
                  <PerfInput label="Mécanique"          name="mecanique"       value={perf.mecanique}       onChange={setPerfField} />
                  <PerfInput label="Aérodynamique"      name="aero"            value={perf.aero}            onChange={setPerfField} />
                  <PerfInput label="Efficacité aéro"    name="efficacite_aero" value={perf.efficacite_aero} onChange={setPerfField} />
                </div>
              </div>

              {/* Moteur & poids */}
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Moteur & poids</p>
                <div className="grid grid-cols-3 gap-3">
                  <PerfInput label="Puissance (ch)"  name="puissance_ch" value={perf.puissance_ch} onChange={setPerfField} />
                  <PerfInput label="Couple (N.m)"    name="couple_nm"    value={perf.couple_nm}    onChange={setPerfField} />
                  <PerfInput label="Poids (kg)"      name="poids_kg"     value={perf.poids_kg}     onChange={setPerfField} />
                </div>
              </div>

              {/* Classe + PI */}
              <div>
                <p className="text-[11px] font-bold text-neutral-500 uppercase tracking-wide mb-2">Classe de référence</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">Classe</label>
                    <select
                      value={perf.ref_class}
                      onChange={e => setPerfField('ref_class', e.target.value)}
                      className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-pink-500 transition-colors"
                    >
                      <option value="">—</option>
                      {(['D','C','B','A','S1','S2','R','X'] as const).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <PerfInput label="PI de référence" name="ref_pi" value={perf.ref_pi} onChange={setPerfField} />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-bold rounded-lg text-white bg-gradient-to-r from-pink-500 to-violet-600 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? 'Envoi…' : 'Partager'}
          </button>
        </div>
      </div>
    </div>
  );
}
