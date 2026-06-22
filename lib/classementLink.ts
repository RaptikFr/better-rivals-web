// Construit le lien vers la page /classements filtrée sur une configuration
// précise (circuit × classe × transmission × voiture), avec mise en évidence
// optionnelle d'une ligne (déplie le sous-groupe + scroll).
export function classementHref(opts: {
  trackId:      number;
  carClass?:    string | null;
  drivetrain?:  string | null;
  car?:         string | null;
  highlightId?: string | null;
}): string {
  const params = new URLSearchParams();
  params.set('track_id', String(opts.trackId));
  if (opts.carClass)   params.set('class', opts.carClass);
  if (opts.drivetrain) params.set('drivetrain', opts.drivetrain);
  // Double-encodage volontaire : /classements décode une fois (decodeURIComponent),
  // aligné sur le bouton « Partager » du classement.
  if (opts.car) params.set('car', encodeURIComponent(opts.car));
  if (opts.highlightId) params.set('highlight', opts.highlightId);
  return `/classements?${params.toString()}`;
}
