"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot,
} from 'recharts';

// Courbe moteur d'un build. Couple (Nm) et puissance (kW) n'ont pas la même
// échelle → on trace les deux en % de LEUR propre maximum sur un seul axe :
// c'est la FORME qui sert au réglage de boîte (où est le plateau, où se
// croisent les pics, combien on perd en montant trop haut dans les tours).
// Les valeurs absolues sont dans les tuiles au-dessus du graphique.

export interface CurvePoint { rpm: number; nm: number; kw: number }

const C_COUPLE = '#e91e8c';   // rose — même palette que le reste du profil
const C_PUISS  = '#7c3aed';   // violet

export default function TorqueCurveChart({
  points,
  peakTorqueRpm,
  peakTorqueNm,
  peakPowerRpm,
  peakPowerKw,
}: {
  points: CurvePoint[];
  peakTorqueRpm: number | null;
  peakTorqueNm: number | null;
  peakPowerRpm: number | null;
  peakPowerKw: number | null;
}) {
  const maxNm = Math.max(...points.map(p => p.nm), 1);
  const maxKw = Math.max(...points.map(p => p.kw), 1);
  const data = points.map(p => ({
    rpm: p.rpm,
    nm: p.nm,
    kw: p.kw,
    couplePct: (p.nm / maxNm) * 100,
    puissPct: (p.kw / maxKw) * 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.2)" />
        <XAxis
          dataKey="rpm"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#737373', fontSize: 11 }}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 100) / 10}k`}
          label={{ value: 'tr/min', position: 'insideBottomRight', offset: -2, fill: '#737373', fontSize: 11 }}
        />
        <YAxis
          domain={[0, 105]}
          ticks={[0, 25, 50, 75, 100]}
          tick={{ fill: '#737373', fontSize: 11 }}
          tickLine={false}
          tickFormatter={(v: number) => `${v}%`}
          width={44}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as { rpm: number; nm: number; kw: number };
            return (
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-xs shadow-xl space-y-1">
                <p className="text-neutral-400 mb-1 font-mono">{row.rpm.toLocaleString('fr-FR')} tr/min</p>
                <p style={{ color: C_COUPLE }} className="font-mono">Couple : {Math.round(row.nm)} Nm</p>
                <p style={{ color: C_PUISS }} className="font-mono">
                  Puissance : {Math.round(row.kw)} kW ({Math.round(row.kw / 0.7457)} ch)
                </p>
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Line
          type="monotone" dataKey="couplePct" name="Couple" stroke={C_COUPLE}
          strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false}
        />
        <Line
          type="monotone" dataKey="puissPct" name="Puissance" stroke={C_PUISS}
          strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false}
        />
        {peakTorqueRpm != null && peakTorqueNm != null && (
          <ReferenceDot
            x={peakTorqueRpm} y={(peakTorqueNm / maxNm) * 100}
            r={4} fill={C_COUPLE} stroke="#fff" strokeWidth={1}
            label={{ value: `${Math.round(peakTorqueNm)} Nm`, position: 'top', fill: C_COUPLE, fontSize: 11, fontWeight: 700 }}
          />
        )}
        {peakPowerRpm != null && peakPowerKw != null && (
          <ReferenceDot
            x={peakPowerRpm} y={(peakPowerKw / maxKw) * 100}
            r={4} fill={C_PUISS} stroke="#fff" strokeWidth={1}
            label={{ value: `${Math.round(peakPowerKw)} kW`, position: 'top', fill: C_PUISS, fontSize: 11, fontWeight: 700 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
