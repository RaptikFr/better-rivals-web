"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatTime } from '@/components/formatTime';

// Graphique de progression des chronos, isolé pour que recharts ne soit
// chargé (via next/dynamic) que lorsqu'un graphique est affiché.
export default function LapTimeChart({
  data,
  series,
  colors,
  yTickFormatter,
}: {
  data: Record<string, unknown>[];
  series: { key: string; name: string }[];
  colors: string[];
  yTickFormatter: (ms: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(115,115,115,0.2)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#737373', fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          reversed
          domain={['auto', 'auto']}
          tickFormatter={ms => yTickFormatter(ms as number)}
          tick={{ fill: '#737373', fontSize: 11 }}
          tickLine={false}
          width={64}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const row = payload[0].payload as Record<string, unknown>;
            return (
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-xs shadow-xl space-y-1">
                <p className="text-neutral-400 mb-1">{String(row.full)}</p>
                {payload.map((p, i) => (
                  <p key={i} style={{ color: p.color }} className="font-mono">
                    {p.name}: {formatTime(p.value as number)}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
        {series.map(({ key, name }, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            name={name}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ fill: colors[i % colors.length], r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
