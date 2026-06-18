// Type partagé entre l'API /api/duels et la page « Mes duels ».
// Un duel = défier un pilote sur une config (circuit × voiture × classe ×
// transmission), avec une date limite. Les temps des deux joueurs sont dérivés
// en direct de lap_times ; le vainqueur est figé à la résolution (date limite).

export type DuelStatus = 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';

// Position relative côté « moi » : qui mène / qui gagne.
export type DuelSide = 'me' | 'them' | 'tie';

export interface DuelView {
  id:            string;
  role:          'challenger' | 'opponent'; // mon rôle dans ce duel
  opponent_pseudo: string;                  // l'AUTRE joueur (jamais moi)
  track_id:      number;
  track_name:    string;
  car_ordinal:   number;
  car_label:     string;
  car_class:     string;
  drivetrain:    string;
  status:        DuelStatus;
  deadline:      string;
  my_time_ms:    number | null;
  their_time_ms: number | null;
  gap_ms:        number | null;   // my - their (négatif = je mène) ; null si l'un n'a pas couru
  leader:        DuelSide | null; // qui mène actuellement (null si indéterminable)
  winner:        DuelSide | null; // vainqueur si status='completed'
  created_at:    string;
  responded_at:  string | null;
  resolved_at:   string | null;
}

/** Clé de config, alignée sur lib/podiums.configKey. */
export function duelConfigKey(d: {
  track_id: number; car_ordinal: number; car_class: string; drivetrain: string;
}): string {
  return `${d.track_id}-${d.car_ordinal}-${d.car_class}-${d.drivetrain}`;
}
