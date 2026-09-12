import { NextResponse } from 'next/server';
import type { PostgrestError } from '@supabase/supabase-js';

// Les erreurs Supabase (noms de colonnes, contraintes, structure interne) ne
// doivent jamais atteindre le client : on journalise le détail côté serveur
// et on renvoie un message générique. `contexte` identifie l'appel dans les
// logs (ex. "duels.POST", "times.update").
export function erreurServeur(error: PostgrestError, contexte: string) {
  console.error(`[${contexte}]`, error);
  return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
}
