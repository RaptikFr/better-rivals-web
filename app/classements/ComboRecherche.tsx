"use client";

import { useEffect, useRef, useState } from 'react';

// Champ « tape pour filtrer, clique pour choisir » des filtres de classement
// (circuit, voiture). Gère seul son ouverture et la fermeture au clic extérieur.

export interface OptionCombo<K> {
  cle:     K;
  libelle: string;
}

export default function ComboRecherche<K extends string | number>({
  label,
  placeholder,
  selection,
  recherche,
  onRecherche,
  options,
  onChoisir,
  onEffacer,
  libelleEffacer,
  className = '',
}: {
  label:          string;
  placeholder:    string;
  /** Option choisie (null = aucune : le champ affiche la recherche en cours). */
  selection:      OptionCombo<K> | null;
  recherche:      string;
  /** Frappe dans le champ : le parent filtre `options` et efface la sélection. */
  onRecherche:    (texte: string) => void;
  options:        OptionCombo<K>[];
  onChoisir:      (cle: K) => void;
  onEffacer:      () => void;
  libelleEffacer: string;
  className?:     string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const racine = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function surClic(e: MouseEvent) {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener('mousedown', surClic);
    return () => document.removeEventListener('mousedown', surClic);
  }, []);

  return (
    <div ref={racine} className={`flex flex-col relative ${className}`}>
      <label className="text-sm text-neutral-600 dark:text-neutral-400 font-bold mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={selection ? selection.libelle : recherche}
          onChange={e => { onRecherche(e.target.value); setOuvert(true); }}
          onFocus={() => setOuvert(true)}
          placeholder={placeholder}
          className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white p-2 pr-8 rounded-lg focus:outline-none focus:border-pink-500 text-sm"
        />
        {selection && (
          <button
            onClick={onEffacer}
            aria-label={libelleEffacer}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >✕</button>
        )}
      </div>
      {ouvert && options.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {options.map(o => (
            <button
              key={o.cle}
              onClick={() => { onChoisir(o.cle); setOuvert(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                selection?.cle === o.cle
                  ? 'bg-pink-500/20 text-pink-400'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              {o.libelle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
