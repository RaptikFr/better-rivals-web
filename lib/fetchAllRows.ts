import type { PostgrestError } from '@supabase/supabase-js';

const PAGE_SIZE = 1000;

/**
 * Récupère toutes les lignes d'une requête en enchaînant les pages de 1000,
 * pour contourner le plafond de lignes par requête de Supabase (au-delà,
 * les lignes sont sinon tronquées silencieusement).
 *
 * La requête construite doit avoir un tri stable (ex. .order('id')) pour que
 * les pages successives ne se chevauchent pas.
 */
export async function fetchAllRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }>,
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) return { data: rows, error };
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}
