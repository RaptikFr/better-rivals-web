/**
 * OCR côté client pour pré-remplir les stats de performance depuis une capture FH6.
 * Import dynamique de tesseract.js : ne pas importer ce module directement dans
 * le bundle initial — utiliser `await import('@/lib/ocrPerf')` au moment de l'action.
 */

import type { TunePerfStats, RefClass } from './tunePerf';

const DEBUG = false;

export interface Word {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

// ─── Prétraitement image ────────────────────────────────────────────────────

export async function preprocessImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const { width: w, height: h } = bitmap;

  const maxDim = Math.max(w, h);
  const scale  = maxDim < 1600 ? (maxDim < 900 ? 2 : 1.5) : 1;

  const canvas  = document.createElement('canvas');
  canvas.width  = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  // Niveaux de gris + inversion (texte clair FH6 → sombre sur fond clair)
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;
  const THRESHOLD = 140;
  for (let i = 0; i < d.length; i += 4) {
    const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    // inversion : les valeurs lumineuses (texte FH6) deviennent sombres
    const inv  = 255 - gray;
    // seuillage dur : binarise pour netteté maximale
    const bin  = inv < THRESHOLD ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = bin;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  if (DEBUG) {
    console.log('[ocrPerf] canvas prétraité', canvas.width, 'x', canvas.height);
  }
  return canvas;
}

// ─── OCR via Tesseract.js (import dynamique, worker singleton) ───────────────

let workerPromise: Promise<import('tesseract.js').Worker> | null = null;

async function getWorker(): Promise<import('tesseract.js').Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const w = await createWorker('fra');
      return w;
    })();
  }
  return workerPromise;
}

export async function ocrImage(canvas: HTMLCanvasElement): Promise<Word[]> {
  const worker = await getWorker();
  const { data } = await worker.recognize(canvas);

  // Page → blocks → paragraphs → lines → words
  const words: Word[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        for (const w of line.words) {
          words.push({
            text:       w.text,
            bbox:       { x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 },
            confidence: w.confidence,
          });
        }
      }
    }
  }

  if (DEBUG) {
    console.log('[ocrPerf] texte brut :', data.text);
    words.forEach(w => console.log(`  "${w.text}" conf=${w.confidence.toFixed(0)} y=${w.bbox.y0}`));
  }

  return words;
}

// ─── Normalisation de texte ─────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // retire diacritiques
    .replace(/[^a-z0-9\s-]/g, ' ')   // retire ponctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimilar(hay: string, needle: string): boolean {
  const h = normalize(hay);
  const n = normalize(needle);
  return h.includes(n) || n.includes(h);
}

// ─── Parsing numérique ──────────────────────────────────────────────────────

function parseNum(raw: string): number {
  // retire unités connues, espaces fines, virgule FR → point
  const cleaned = raw
    .replace(/km\/h|N\.m|N\.m|n\.m|km\/h|kg|ch|g\b|%|s\b/gi, '')
    .replace(/ | /g, '') // espaces fines
    .replace(/\s/g, '')
    .replace(',', '.');
  return parseFloat(cleaned);
}

function clamp10(n: number): number | null {
  if (!isFinite(n) || n < 0 || n > 10) return null;
  return Math.round(n * 10) / 10;
}

// ─── Dictionnaire de libellés ───────────────────────────────────────────────

// Chaque entrée : libellé normalisé → clé de résultat.
// Pour les champs imbriqués on utilise un point : "perfs.acceleration"

type ResultKey =
  | 'perfs.acceleration' | 'perfs.vitesse' | 'perfs.freinage'
  | 'perfs.tout_terrain' | 'perfs.depart_arrete' | 'perfs.tenue_de_route'
  | 'top_speed_kmh' | 'accel_0_161_s' | 'braking_161_m' | 'lateral_g_97'
  | 'balance.mecanique' | 'balance.aero' | 'balance.efficacite_aero'
  | 'engine.puissance_ch' | 'engine.couple_nm' | 'engine.poids_kg';

const LABEL_MAP: [string, ResultKey][] = [
  // Radar
  ['acceleration',           'perfs.acceleration'],
  ['vitesse',                'perfs.vitesse'],
  ['freinage',               'perfs.freinage'],
  ['tout-terrain',           'perfs.tout_terrain'],
  ['tout terrain',           'perfs.tout_terrain'],
  ['depart arrete',          'perfs.depart_arrete'],
  ['depart a l arrete',      'perfs.depart_arrete'],
  ['tenue de route',         'perfs.tenue_de_route'],
  // Mesures écran « Mes réglages »
  ['vitesse de pointe',      'top_speed_kmh'],
  // "0-100 km/h" dans FH6 = en réalité 0-161 km/h
  ['0-100',                  'accel_0_161_s'],
  ['0 - 100',                'accel_0_161_s'],
  ['0 100',                  'accel_0_161_s'],
  // écran « Régler » : libellé "0 - 161 km/h"
  ['0-161',                  'accel_0_161_s'],
  ['0 - 161',                'accel_0_161_s'],
  ['0 161',                  'accel_0_161_s'],
  // Distance de freinage (écran Régler) : "161 km/h - 0"
  ['161 km/h - 0',           'braking_161_m'],
  ['161 - 0',                'braking_161_m'],
  ['distance de freinage',   'braking_161_m'],
  // G latéraux
  ['g lateraux',             'lateral_g_97'],
  ['g lat',                  'lateral_g_97'],
  // Équilibres
  ['equilibre mecanique',    'balance.mecanique'],
  ['mecanique',              'balance.mecanique'],
  ['equilibre aerodynamique','balance.aero'],
  ['aerodynamique',          'balance.aero'],
  ['efficacite aerodynamique','balance.efficacite_aero'],
  ['efficacite aero',        'balance.efficacite_aero'],
  // Moteur
  ['puissance',              'engine.puissance_ch'],
  ['couple',                 'engine.couple_nm'],
  ['poids',                  'engine.poids_kg'],
];

// ─── Résultat OCR ────────────────────────────────────────────────────────────

export interface OcrPerfResult {
  values: Partial<FlatPerf>;
  found:  ResultKey[];
}

// Version plate pour faciliter la fusion dans le composant
export type FlatPerf = {
  acceleration: string; vitesse: string; freinage: string;
  tout_terrain: string; depart_arrete: string; tenue_de_route: string;
  top_speed_kmh: string; accel_0_161_s: string; braking_161_m: string; lateral_g_97: string;
  mecanique: string; aero: string; efficacite_aero: string;
  puissance_ch: string; couple_nm: string; poids_kg: string;
  ref_class: string; ref_pi: string;
};

// ─── Extraction principale ───────────────────────────────────────────────────

export function extractPerfFromOcr(words: Word[]): OcrPerfResult {
  const values: Partial<FlatPerf> = {};
  const found: ResultKey[]        = [];

  // Regroupe les mots par ligne (y0 similaire, tolérance 8 px)
  const lines: Word[][] = [];
  for (const w of words) {
    const existing = lines.find(l => l.length > 0 && Math.abs(l[0].bbox.y0 - w.bbox.y0) < 8);
    if (existing) existing.push(w);
    else lines.push([w]);
  }
  // Trie chaque ligne par x0
  for (const l of lines) l.sort((a, b) => a.bbox.x0 - b.bbox.x0);

  if (DEBUG) {
    console.log('[ocrPerf] lignes détectées :');
    lines.forEach(l => console.log(' ', l.map(w => w.text).join(' ')));
  }

  for (const line of lines) {
    if (line.length < 2) continue;
    const lineText = line.map(w => w.text).join(' ');

    for (const [needle, key] of LABEL_MAP) {
      if (!isSimilar(lineText, needle)) continue;

      // Cherche le premier token numérique à droite du libellé
      const labelEndX = line
        .filter(w => isSimilar(w.text, needle.split(' ')[0]))
        .reduce((max, w) => Math.max(max, w.bbox.x1), 0);

      const numWord = line.find(w => {
        if (w.bbox.x0 < labelEndX - 5) return false;
        return /[\d,.]/.test(w.text);
      });

      if (!numWord) continue;

      const n = parseNum(numWord.text);
      if (!isFinite(n) || n < 0) continue;

      // Clampage selon le type de champ
      let strVal: string | null = null;
      if (key.startsWith('perfs.')) {
        const clamped = clamp10(n);
        if (clamped === null) continue;
        strVal = String(clamped);
      } else {
        strVal = String(n);
      }

      const flatKey = key.replace(/^perfs\./, '').replace(/^balance\./, '').replace(/^engine\./, '') as keyof FlatPerf;
      if (values[flatKey] !== undefined) continue; // déjà rempli, on garde la 1re valeur

      values[flatKey] = strVal;
      if (!found.includes(key)) found.push(key);
      break; // un libellé trouvé suffit pour cette ligne
    }
  }

  // Détection badge classe + PI (ex. "A 700", "S1 800")
  const CLASS_RE = /\b(D|C|B|A|S1|S2|R|X)\b/;
  const PI_RE    = /\b([1-9]\d{2})\b/;
  if (!values.ref_class || !values.ref_pi) {
    for (const line of lines) {
      const text = line.map(w => w.text).join(' ');
      const cm = CLASS_RE.exec(text);
      const pm = PI_RE.exec(text);
      if (cm && pm) {
        if (!values.ref_class) values.ref_class = cm[1] as RefClass;
        if (!values.ref_pi)    values.ref_pi    = pm[1];
        break;
      }
    }
  }

  if (DEBUG) console.log('[ocrPerf] résultat :', values, 'found :', found);
  return { values, found };
}

// Empêche le worker de rester ouvert indéfiniment (appelé si le composant est démonté)
export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const w = await workerPromise;
  await w.terminate();
  workerPromise = null;
}

// Ré-export du type pour le composant
export type { TunePerfStats };
