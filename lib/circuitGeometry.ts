// Géométrie des circuits (table track_geometries) — fonctions pures.
//
// Le relais capture la position monde (x, z) tous les ~5 m sur un tour complet.
// ⚠️ Le compteur de distance télémétrique Forza (champ `d` de la capture)
// SOUS-COMPTE ~15 % par rapport à la géométrie réelle : toutes les distances
// utilisées ici sont donc GÉOMÉTRIQUES (cumul des segments x/z), jamais `d`.
// Les secteurs étant des tranches ÉGALES en distance, les poser à la fraction
// k/N de la longueur géométrique reste exact malgré ce biais d'échelle.

/** Un point du tracé, avec sa distance géométrique cumulée depuis le départ (m). */
export interface PointCarte {
  x:    number;
  z:    number;
  dist: number;
}

/** Tracé prêt à dessiner : polyline simplifiée + cadre SVG. */
export interface CarteCircuit {
  points:    PointCarte[];
  longueurM: number;
  /** Cadre englobant avec marge, en coordonnées monde (z sert d'axe vertical SVG). */
  viewBox:   { minX: number; minZ: number; largeur: number; hauteur: number };
}

/** Distances géométriques cumulées le long de la polyline (m). */
export function cumulDistances(x: number[], z: number[]): number[] {
  const out = new Array<number>(x.length);
  let acc = 0;
  for (let i = 0; i < x.length; i++) {
    if (i > 0) acc += Math.hypot(x[i] - x[i - 1], z[i] - z[i - 1]);
    out[i] = acc;
  }
  return out;
}

/** Distance perpendiculaire d'un point au segment [a, b]. */
function distanceAuSegment(p: PointCarte, a: PointCarte, b: PointCarte): number {
  const dx = b.x - a.x, dz = b.z - a.z;
  const l2 = dx * dx + dz * dz;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.z - a.z);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.z - (a.z + t * dz));
}

/**
 * Simplification Douglas-Peucker (itérative). Les points conservés gardent leur
 * `dist` d'origine, calculée sur la polyline complète : les repères de distance
 * restent donc justes après simplification.
 */
export function simplifierPolyline(points: PointCarte[], toleranceM: number): PointCarte[] {
  if (points.length <= 2) return points.slice();
  const garder = new Array<boolean>(points.length).fill(false);
  garder[0] = garder[points.length - 1] = true;

  const pile: [number, number][] = [[0, points.length - 1]];
  while (pile.length > 0) {
    const [debut, fin] = pile.pop()!;
    let maxDist = 0, maxIdx = -1;
    for (let i = debut + 1; i < fin; i++) {
      const d = distanceAuSegment(points[i], points[debut], points[fin]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > toleranceM && maxIdx > 0) {
      garder[maxIdx] = true;
      pile.push([debut, maxIdx], [maxIdx, fin]);
    }
  }
  return points.filter((_, i) => garder[i]);
}

/**
 * Construit la carte depuis le JSON brut de track_geometries. Renvoie null si
 * les données sont dégénérées (trop courtes, longueurs incohérentes, valeurs
 * non finies) — le composant carte ne s'affiche alors pas.
 */
export function construireCarte(
  brut: { x: number[]; z: number[] },
  opts: { toleranceM?: number; margeRatio?: number } = {},
): CarteCircuit | null {
  const { x, z } = brut;
  if (!Array.isArray(x) || !Array.isArray(z) || x.length !== z.length || x.length < 20) return null;
  if (!x.every(Number.isFinite) || !z.every(Number.isFinite)) return null;

  const dists = cumulDistances(x, z);
  const longueurM = dists[dists.length - 1];
  if (!(longueurM > 100)) return null; // un « circuit » de moins de 100 m est un artefact

  const complets: PointCarte[] = x.map((xi, i) => ({ x: xi, z: z[i], dist: dists[i] }));
  const points = simplifierPolyline(complets, opts.toleranceM ?? 3);

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }
  const marge = (opts.margeRatio ?? 0.06) * Math.max(maxX - minX, maxZ - minZ);
  return {
    points,
    longueurM,
    viewBox: {
      minX:    minX - marge,
      minZ:    minZ - marge,
      largeur: (maxX - minX) + 2 * marge,
      hauteur: (maxZ - minZ) + 2 * marge,
    },
  };
}

/** Position (x, z) interpolée à `dist` mètres du départ (bornée au tracé). */
export function pointADistance(points: PointCarte[], dist: number): { x: number; z: number } {
  const d = Math.max(0, Math.min(dist, points[points.length - 1].dist));
  // Recherche binaire du premier point à distance >= d.
  let lo = 0, hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].dist < d) lo = mid + 1; else hi = mid;
  }
  if (lo === 0) return { x: points[0].x, z: points[0].z };
  const a = points[lo - 1], b = points[lo];
  const t = b.dist === a.dist ? 0 : (d - a.dist) / (b.dist - a.dist);
  return { x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) };
}

/** Un virage détecté par courbure sur le tracé. */
export interface Virage {
  numero:     number;
  /** Sens du virage TEL QU'AFFICHÉ sur la carte (axe z vers le bas de l'écran).
   *  Si le monde Forza s'avérait miroir de l'affichage, inverser ce libellé et
   *  l'affichage ensemble (un seul signe) — la cohérence carte ↔ libellé prime. */
  direction:  'gauche' | 'droite';
  distDebutM: number;
  distFinM:   number;
  distApexM:  number;
  /** Angle total tourné (degrés, positif). */
  angleDeg:   number;
  rayonMinM:  number;
  apex:       { x: number; z: number };
  /** Normale unitaire à l'EXTÉRIEUR du virage (pour décaler une étiquette). */
  normale:    { x: number; z: number };
}

/** Qualifie un virage par son rayon minimal et son ampleur. */
export function typeVirage(v: Pick<Virage, 'rayonMinM' | 'angleDeg'>): string {
  if (v.angleDeg >= 140 || v.rayonMinM < 30) return 'épingle';
  if (v.rayonMinM < 70)  return 'serré';
  if (v.rayonMinM < 150) return 'moyen';
  return 'rapide';
}

/** Replie un angle dans (-π, π]. */
function replierAngle(a: number): number {
  const x = ((a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return x - Math.PI;
}

/**
 * Détecte les virages du tracé par courbure : rééchantillonnage à pas constant,
 * variation de cap lissée par moyenne glissante, puis plages où le rayon de
 * courbure descend sous le seuil. Les plages de même sens proches sont
 * fusionnées ; une chicane (changement de sens) fait deux virages. Un virage à
 * cheval sur la ligne de départ ressort en deux virages (premier et dernier).
 */
export function detecterVirages(
  carte: CarteCircuit,
  opts: { pasM?: number; lissageM?: number; rayonSeuilM?: number; angleMinDeg?: number; fusionM?: number } = {},
): Virage[] {
  const pasM        = opts.pasM        ?? 10;
  const lissageM    = opts.lissageM    ?? 30;
  const rayonSeuilM = opts.rayonSeuilM ?? 160;
  const angleMinDeg = opts.angleMinDeg ?? 20;
  const fusionM     = opts.fusionM     ?? 40;

  const nb = Math.floor(carte.longueurM / pasM);
  if (nb < 8) return [];
  const pts = Array.from({ length: nb + 1 }, (_, i) => pointADistance(carte.points, i * pasM));

  // Caps des segments, puis variations de cap repliées entre segments voisins.
  const caps = new Array<number>(nb);
  for (let i = 0; i < nb; i++) caps[i] = Math.atan2(pts[i + 1].z - pts[i].z, pts[i + 1].x - pts[i].x);
  const brutes = new Array<number>(nb - 1);
  for (let i = 0; i < nb - 1; i++) brutes[i] = replierAngle(caps[i + 1] - caps[i]);

  // Lissage par moyenne glissante (fenêtre ≈ lissageM), courbure en rad/m.
  const demi = Math.max(0, Math.floor(Math.round(lissageM / pasM) / 2));
  const courbures = brutes.map((_, i) => {
    let somme = 0, n = 0;
    for (let j = Math.max(0, i - demi); j <= Math.min(brutes.length - 1, i + demi); j++) { somme += brutes[j]; n++; }
    return somme / n / pasM;
  });

  // Plages contiguës où |courbure| dépasse le seuil, coupées au changement de sens.
  const seuil = 1 / rayonSeuilM;
  interface Plage { debut: number; fin: number; sens: 1 | -1 }
  const plages: Plage[] = [];
  for (let i = 0; i < courbures.length; i++) {
    if (Math.abs(courbures[i]) <= seuil) continue;
    const sens: 1 | -1 = courbures[i] > 0 ? 1 : -1;
    const derniere = plages[plages.length - 1];
    if (derniere && derniere.sens === sens && i - derniere.fin <= Math.round(fusionM / pasM)) {
      derniere.fin = i;
    } else {
      plages.push({ debut: i, fin: i, sens });
    }
  }

  const virages: Virage[] = [];
  for (const p of plages) {
    let angleRad = 0, maxAbs = 0, apexIdx = p.debut;
    for (let i = p.debut; i <= p.fin; i++) {
      angleRad += courbures[i] * pasM;
      if (Math.abs(courbures[i]) > maxAbs) { maxAbs = Math.abs(courbures[i]); apexIdx = i; }
    }
    const angleDeg = Math.abs(angleRad) * 180 / Math.PI;
    if (angleDeg < angleMinDeg) continue;

    // L'échantillon i mesure la variation de cap autour du point i+1.
    const apex = pts[apexIdx + 1];
    const cap  = caps[apexIdx];
    // Le centre de courbure est du côté vers lequel le cap tourne : la normale
    // extérieure est à l'opposé — sens × (sin cap, −cos cap).
    const normale = { x: p.sens * Math.sin(cap), z: p.sens * -Math.cos(cap) };

    virages.push({
      numero:     virages.length + 1,
      // cap croissant = rotation vers +z = horaire à l'écran (z vers le bas) = droite.
      direction:  p.sens > 0 ? 'droite' : 'gauche',
      distDebutM: (p.debut + 1) * pasM,
      distFinM:   (p.fin + 1) * pasM,
      distApexM:  (apexIdx + 1) * pasM,
      angleDeg,
      rayonMinM:  1 / maxAbs,
      apex:       { x: apex.x, z: apex.z },
      normale,
    });
  }
  return virages;
}

/**
 * Découpe le tracé en `n` tranches égales en distance (le découpage du relais).
 * Chaque tranche est une sous-polyline dont les extrémités sont interpolées
 * exactement aux frontières k·L/n : la concaténation couvre tout le tracé.
 */
export function decouperSecteurs(carte: CarteCircuit, n: number): PointCarte[][] {
  const { points, longueurM } = carte;
  if (n < 1 || points.length < 2) return [];

  const secteurs: PointCarte[][] = [];
  let idx = 0;
  for (let k = 0; k < n; k++) {
    const debut = (k * longueurM) / n;
    const fin   = ((k + 1) * longueurM) / n;
    const seg: PointCarte[] = [{ ...pointADistance(points, debut), dist: debut }];
    while (idx < points.length && points[idx].dist <= debut) idx++;
    while (idx < points.length && points[idx].dist < fin) seg.push(points[idx++]);
    seg.push({ ...pointADistance(points, fin), dist: fin });
    secteurs.push(seg);
  }
  return secteurs;
}
