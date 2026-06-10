const TYPE_COLORS: Record<string, string> = {
  'Course sur route':    'bg-blue-500/20 border-blue-500/50 text-blue-400',
  'Course tous chemins': 'bg-amber-900/30 border-amber-800/50 text-amber-700',
  'Cross-country':       'bg-green-500/20 border-green-500/50 text-green-400',
  'Touge':               'bg-violet-500/20 border-violet-500/50 text-violet-400',
  // Alias historique — supprimable une fois renommage_touge.sql appliqué
  'Toge':                'bg-violet-500/20 border-violet-500/50 text-violet-400',
  'Course de rue':       'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  'Course de drag':      'bg-orange-500/20 border-orange-500/50 text-orange-400',
};

export function TypeBadge({ type }: { type: string }) {
  const style = TYPE_COLORS[type] ?? 'bg-neutral-200 dark:bg-neutral-800 border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400';
  return (
    <span className={`px-2 py-0.5 border rounded text-xs font-bold ${style}`}>
      {type}
    </span>
  );
}
