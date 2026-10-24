import { iconeBetterRivals } from '@/lib/appIcon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS arrondit lui-même les coins : on livre un carré plein.
export default function AppleIcon() {
  return iconeBetterRivals(180, false);
}
