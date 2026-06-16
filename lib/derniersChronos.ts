import { unstable_cache } from 'next/cache';
import { supabase } from '@/lib/supabase';

export interface Chrono {
  id:               string;
  time_ms:          number;
  previous_time_ms: number | null;
  car_class:        string;
  drivetrain:       string | null;
  recorded_at:      string;
  players:          { pseudo: string; discord_tag: string | null } | null;
  cars:             { manufacturer: string | null; name: string; year: number | null } | null;
  tracks:           { name: string } | null;
}

async function fetchDerniersChronos(): Promise<Chrono[]> {
  const { data, error } = await supabase
    .from('lap_times')
    // recorded_at (mis à jour à chaque amélioration) plutôt que created_at,
    // pour que les records améliorés remontent dans le flux
    .select('id, time_ms, previous_time_ms, car_class, drivetrain, recorded_at, players ( pseudo, discord_tag:discord_tag_public ), cars ( manufacturer, name, year ), tracks ( name )')
    .order('recorded_at', { ascending: false })
    .limit(5);

  // Une erreur lancée n'est pas mise en cache : la prochaine requête réessaiera
  if (error) throw new Error(error.message);
  return (data ?? []) as Chrono[];
}

// Cache serveur partagé (au plus un recalcul par minute), aligné sur les autres
// flux de la page d'accueil.
export const getDerniersChronos = unstable_cache(fetchDerniersChronos, ['derniers-chronos'], {
  revalidate: 60,
});
