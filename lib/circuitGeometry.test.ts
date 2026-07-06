import { describe, it, expect } from 'vitest';
import {
  cumulDistances,
  simplifierPolyline,
  construireCarte,
  pointADistance,
  decouperSecteurs,
  detecterVirages,
  typeVirage,
  type PointCarte,
} from './circuitGeometry';

/** Tracé carré de 400 m de côté, échantillonné tous les 10 m (160 points + retour). */
function traceCarre(): { x: number[]; z: number[] } {
  const x: number[] = [], z: number[] = [];
  for (let i = 0; i < 40; i++) { x.push(i * 10);       z.push(0); }        // est
  for (let i = 0; i < 40; i++) { x.push(400);          z.push(i * 10); }   // sud
  for (let i = 0; i < 40; i++) { x.push(400 - i * 10); z.push(400); }      // ouest
  for (let i = 0; i < 40; i++) { x.push(0);            z.push(400 - i * 10); } // nord
  x.push(0); z.push(0); // boucle fermée
  return { x, z };
}

describe('cumulDistances', () => {
  it('cumule les longueurs de segments', () => {
    const d = cumulDistances([0, 3, 3], [0, 0, 4]);
    expect(d).toEqual([0, 3, 7]);
  });

  it('renvoie [0] pour un point isolé', () => {
    expect(cumulDistances([5], [5])).toEqual([0]);
  });
});

describe('simplifierPolyline', () => {
  it('élimine les points colinéaires et garde les coins', () => {
    const { x, z } = traceCarre();
    const dists = cumulDistances(x, z);
    const pts: PointCarte[] = x.map((xi, i) => ({ x: xi, z: z[i], dist: dists[i] }));
    const simple = simplifierPolyline(pts, 1);
    // Un carré se résume à ses 4 coins + départ/arrivée.
    expect(simple.length).toBeLessThanOrEqual(6);
    expect(simple.length).toBeGreaterThanOrEqual(5);
    // Les points conservés gardent leur distance d'origine.
    const coin = simple.find(p => p.x === 400 && p.z === 0);
    expect(coin?.dist).toBe(400);
  });

  it('conserve un zigzag au-dessus de la tolérance', () => {
    const pts: PointCarte[] = [
      { x: 0, z: 0, dist: 0 },
      { x: 50, z: 40, dist: 64 },
      { x: 100, z: 0, dist: 128 },
    ];
    expect(simplifierPolyline(pts, 10)).toHaveLength(3);
    expect(simplifierPolyline(pts, 50)).toHaveLength(2);
  });
});

describe('construireCarte', () => {
  it('construit longueur, viewBox et points simplifiés depuis le brut', () => {
    const carte = construireCarte(traceCarre());
    expect(carte).not.toBeNull();
    expect(carte!.longueurM).toBe(1600);
    expect(carte!.points.length).toBeLessThan(20);
    // viewBox : carré 400×400 + marge 6 % de chaque côté.
    expect(carte!.viewBox.largeur).toBeCloseTo(400 * 1.12, 5);
    expect(carte!.viewBox.minX).toBeCloseTo(-24, 5);
  });

  it('rejette les données dégénérées', () => {
    expect(construireCarte({ x: [0, 1], z: [0, 1] })).toBeNull();               // trop court
    expect(construireCarte({ x: [0, 1, 2], z: [0, 1] })).toBeNull();            // longueurs différentes
    const petits = { x: Array(30).fill(0).map((_, i) => i * 0.1), z: Array(30).fill(0) };
    expect(construireCarte(petits)).toBeNull();                                  // < 100 m
    const nan = traceCarre(); nan.x[3] = NaN;
    expect(construireCarte(nan)).toBeNull();                                     // valeur non finie
  });
});

describe('pointADistance', () => {
  const pts: PointCarte[] = [
    { x: 0, z: 0, dist: 0 },
    { x: 100, z: 0, dist: 100 },
    { x: 100, z: 100, dist: 200 },
  ];

  it('interpole entre deux points', () => {
    expect(pointADistance(pts, 50)).toEqual({ x: 50, z: 0 });
    expect(pointADistance(pts, 150)).toEqual({ x: 100, z: 50 });
  });

  it('borne aux extrémités du tracé', () => {
    expect(pointADistance(pts, -5)).toEqual({ x: 0, z: 0 });
    expect(pointADistance(pts, 999)).toEqual({ x: 100, z: 100 });
  });
});

describe('decouperSecteurs', () => {
  it('découpe le carré en 4 tranches égales dont les frontières sont interpolées', () => {
    const carte = construireCarte(traceCarre())!;
    const secteurs = decouperSecteurs(carte, 4);
    expect(secteurs).toHaveLength(4);
    for (let k = 0; k < 4; k++) {
      const seg = secteurs[k];
      expect(seg[0].dist).toBeCloseTo(k * 400, 6);
      expect(seg[seg.length - 1].dist).toBeCloseTo((k + 1) * 400, 6);
      // Distances croissantes à l'intérieur d'une tranche.
      for (let i = 1; i < seg.length; i++) expect(seg[i].dist).toBeGreaterThanOrEqual(seg[i - 1].dist);
    }
    // La fin d'une tranche coïncide avec le début de la suivante.
    expect(secteurs[1][0]).toEqual(secteurs[0][secteurs[0].length - 1]);
  });

  it('couvre tout le tracé avec un n qui ne divise pas rond', () => {
    const carte = construireCarte(traceCarre())!;
    const secteurs = decouperSecteurs(carte, 7);
    expect(secteurs).toHaveLength(7);
    expect(secteurs[0][0].dist).toBe(0);
    expect(secteurs[6][secteurs[6].length - 1].dist).toBeCloseTo(1600, 6);
  });
});

/** Le même carré, mais départ au MILIEU d'un côté : les 4 coins sont visibles
 *  (un virage pile sur la ligne de départ est invisible — limite documentée). */
function traceCarreDecale(): { x: number[]; z: number[] } {
  const x: number[] = [], z: number[] = [];
  for (let i = 0; i < 20; i++) { x.push(200 + i * 10);  z.push(0); }           // demi-côté est
  for (let i = 0; i < 40; i++) { x.push(400);           z.push(i * 10); }      // sud
  for (let i = 0; i < 40; i++) { x.push(400 - i * 10);  z.push(400); }         // ouest
  for (let i = 0; i < 40; i++) { x.push(0);             z.push(400 - i * 10); }// nord
  for (let i = 0; i <= 20; i++) { x.push(i * 10);       z.push(0); }           // retour au départ
  return { x, z };
}

/** Aller 600 m vers l'est, épingle en demi-cercle (r = 40 m), retour vers l'ouest. */
function traceEpingle(): { x: number[]; z: number[] } {
  const x: number[] = [], z: number[] = [];
  for (let i = 0; i <= 60; i++) { x.push(i * 10); z.push(0); }              // est
  for (let i = 1; i < 36; i++) {                                            // demi-cercle vers +z
    const a = -Math.PI / 2 + (i * Math.PI) / 36;
    x.push(600 + 40 * Math.cos(a)); z.push(40 + 40 * Math.sin(a));
  }
  for (let i = 0; i <= 60; i++) { x.push(600 - i * 10); z.push(80); }       // ouest
  return { x, z };
}

describe('detecterVirages', () => {
  it('trouve les 4 coins du carré, tous à droite, ~90° chacun', () => {
    const carte = construireCarte(traceCarreDecale())!;
    const virages = detecterVirages(carte);
    expect(virages).toHaveLength(4);
    for (const v of virages) {
      // Est → sud (+z) → ouest → nord : cap croissant = droite à l'écran.
      expect(v.direction).toBe('droite');
      expect(v.angleDeg).toBeGreaterThan(60);
      expect(v.angleDeg).toBeLessThan(120);
      expect(v.distFinM).toBeGreaterThanOrEqual(v.distDebutM);
      expect(v.distApexM).toBeGreaterThanOrEqual(v.distDebutM - 15);
      expect(v.distApexM).toBeLessThanOrEqual(v.distFinM + 15);
      // Normale unitaire.
      expect(Math.hypot(v.normale.x, v.normale.z)).toBeCloseTo(1, 6);
    }
    expect(virages.map(v => v.numero)).toEqual([1, 2, 3, 4]);
  });

  it('inverse le sens quand le tracé est parcouru dans l’autre sens', () => {
    const { x, z } = traceCarreDecale();
    const carte = construireCarte({ x: [...x].reverse(), z: [...z].reverse() })!;
    const virages = detecterVirages(carte);
    expect(virages).toHaveLength(4);
    for (const v of virages) expect(v.direction).toBe('gauche');
  });

  it('détecte une épingle (~180°, petit rayon) entre deux lignes droites', () => {
    const carte = construireCarte(traceEpingle())!;
    const virages = detecterVirages(carte);
    expect(virages).toHaveLength(1);
    const v = virages[0];
    expect(v.angleDeg).toBeGreaterThan(150);
    expect(v.rayonMinM).toBeLessThan(70);
    expect(typeVirage(v)).toBe('épingle');
    // L'apex est dans la zone du demi-cercle (entre 600 et 600 + π·40 ≈ 726 m).
    expect(v.distApexM).toBeGreaterThan(580);
    expect(v.distApexM).toBeLessThan(750);
    // La normale extérieure pointe à l'opposé du centre (vers +x, loin de x=600).
    expect(v.normale.x).toBeGreaterThan(0.5);
  });

  it('ne détecte rien sur une ligne droite', () => {
    const x = Array.from({ length: 60 }, (_, i) => i * 10);
    const z = Array.from({ length: 60 }, () => 0);
    const carte = construireCarte({ x, z })!;
    expect(detecterVirages(carte)).toHaveLength(0);
  });
});

describe('typeVirage', () => {
  it('classe par rayon et ampleur', () => {
    expect(typeVirage({ rayonMinM: 20,  angleDeg: 90 })).toBe('épingle');
    expect(typeVirage({ rayonMinM: 100, angleDeg: 150 })).toBe('épingle');
    expect(typeVirage({ rayonMinM: 50,  angleDeg: 80 })).toBe('serré');
    expect(typeVirage({ rayonMinM: 100, angleDeg: 45 })).toBe('moyen');
    expect(typeVirage({ rayonMinM: 300, angleDeg: 30 })).toBe('rapide');
  });
});
