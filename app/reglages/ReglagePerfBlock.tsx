"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import type { TunePerfStats, RefClass } from '@/lib/tunePerf';

const CLASS_COLORS: Record<RefClass, string> = {
  D:  '#42BDF4',
  C:  '#FCC534',
  B:  '#FF632C',
  A:  '#F43156',
  S1: '#B960E8',
  S2: '#165EDB',
  R:  '#D61A9C',
  X:  '#19D858',
};

function fr(n: number, decimals: number): string {
  return n.toLocaleString('fr-FR', {
    minimumFractionDigits:  decimals,
    maximumFractionDigits:  decimals,
  });
}

export function ReglagePerfBlock({ stats }: { stats: TunePerfStats }) {
  const { perfs, top_speed_kmh, accel_0_161_s, braking_161_m, lateral_g_97, balance, engine, ref_class, ref_pi } = stats;
  const color = CLASS_COLORS[ref_class];

  const radarData = [
    { subject: 'Accél.',   value: perfs.acceleration   },
    { subject: 'Vitesse',  value: perfs.vitesse         },
    { subject: 'Freinage', value: perfs.freinage        },
    { subject: 'Tout-terr.', value: perfs.tout_terrain  },
    { subject: 'Départ',   value: perfs.depart_arrete   },
    { subject: 'Tenue',    value: perfs.tenue_de_route  },
  ];

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-700 mt-2 pt-3 space-y-3">
      {/* Radar 6 perfs */}
      <ResponsiveContainer width="100%" height={160}>
        <RadarChart data={radarData} outerRadius="70%">
          <PolarGrid stroke="rgba(115,115,115,0.3)" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#737373' }} />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.25} dot={false} />
        </RadarChart>
      </ResponsiveContainer>

      {/* 4 métriques vitesse/accél/freinage/G */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Vitesse de pointe', value: `${fr(top_speed_kmh, 1)} km/h` },
          { label: '0 → 161 km/h',      value: `${fr(accel_0_161_s, 3)} s`    },
          { label: 'Freinage 161 → 0',  value: `${fr(braking_161_m, 1)} m`    },
          { label: 'G lat. 97 km/h',    value: `${fr(lateral_g_97, 2)} g`     },
        ].map(m => (
          <div key={m.label} className="bg-white dark:bg-neutral-950 rounded-lg p-2 text-center">
            <p className="text-[10px] text-neutral-500 leading-none mb-1">{m.label}</p>
            <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Moteur & poids */}
      <div>
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide mb-1.5">Moteur & poids</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Puissance', value: `${fr(engine.puissance_ch, 0)} ch`  },
            { label: 'Couple',    value: `${fr(engine.couple_nm, 0)} N.m`    },
            { label: 'Poids',     value: `${fr(engine.poids_kg, 0)} kg`      },
          ].map(m => (
            <div key={m.label} className="bg-white dark:bg-neutral-950 rounded-lg p-2 text-center">
              <p className="text-[10px] text-neutral-500 leading-none mb-1">{m.label}</p>
              <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Équilibres */}
      <div className="flex items-center justify-between gap-1 text-[10px] text-neutral-500 flex-wrap">
        <span>Méca <span className="font-semibold text-neutral-700 dark:text-neutral-300">{fr(balance.mecanique, 2)}</span></span>
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span>Aéro <span className="font-semibold text-neutral-700 dark:text-neutral-300">{fr(balance.aero, 2)}</span></span>
        <span className="text-neutral-300 dark:text-neutral-600">·</span>
        <span>Eff. aéro <span className="font-semibold text-neutral-700 dark:text-neutral-300">{fr(balance.efficacite_aero, 3)}</span></span>
      </div>

      {/* Mention classe */}
      <p className="text-[10px] text-neutral-400 text-right">
        profil mesuré en{' '}
        <span className="font-bold" style={{ color }}>{ref_class} {ref_pi}</span>
      </p>
    </div>
  );
}
