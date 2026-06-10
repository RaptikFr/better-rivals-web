export function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'Course sur route':    '🛣️',
    'Cross-country':       '⛰️',
    'Course tous chemins': '🌿',
    'Touge':               '🌀',
    // Alias historique — supprimable une fois renommage_touge.sql appliqué
    'Toge':                '🌀',
    'Course de rue':       '🏙️',
    'Course de drag':      '🚦',
  }
  return icons[type] ?? '🏁'
}

export function getSprintIcon(isSprint: boolean): string {
  return isSprint ? '➡️' : '🔄'
}
