export type TimeStyle = 'chrono' | 'seconds';
export type DecimalSep = 'point' | 'comma';

export interface FormatTimeOptions {
  /** `chrono` → `1:23.456`, `seconds` → `83.456 s`. Défaut : `chrono`. */
  style?: TimeStyle;
  /** Séparateur décimal. Défaut : `point`. */
  decimalSep?: DecimalSep;
}

export function formatTime(ms: number, opts?: FormatTimeOptions): string {
  const sep = opts?.decimalSep === 'comma' ? ',' : '.';
  const milliseconds = (ms % 1000).toString().padStart(3, '0');

  if (opts?.style === 'seconds') {
    const totalSeconds = Math.floor(ms / 1000);
    return `${totalSeconds}${sep}${milliseconds} s`;
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}${sep}${milliseconds}`;
}
