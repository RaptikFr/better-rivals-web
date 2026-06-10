import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Client serveur avec la clé service role — réservé aux routes API.
// Typé sur le schéma généré : les noms de tables/colonnes sont vérifiés à la compilation.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
