// Envoi d'un message vers un salon Discord via webhook (pack social, #10).
// Un seul webhook serveur, configuré par la variable d'environnement
// DISCORD_WEBHOOK_URL (collée depuis Discord → Paramètres du salon →
// Intégrations → Webhooks). Si la variable est absente, l'envoi est un no-op
// silencieux : le site et le relais fonctionnent sans Discord configuré.
//
// Déclenché quand un joueur prend la tête (nouveau nº1) sur une config exacte,
// depuis POST /api/times (en tâche après-réponse `after`, jamais dans le chemin
// critique du relais). Un échec d'envoi ne doit jamais faire rater le chrono.

import { formatTime } from '@/lib/lap-validation';
import { siteUrl } from '@/lib/site';

// Couleur de la barre latérale de l'embed (rose Better Rivals).
const BR_PINK = 0xec4899;

export interface NouveauLeaderDiscord {
  pseudo:     string;
  trackName:  string;
  carLabel:   string;
  carClass:   string;
  drivetrain: string;
  timeMs:     number;
  /** Chemin relatif vers le classement de la config (commence par « / »). */
  link:       string;
}

/**
 * Annonce un nouveau nº1 sur le salon Discord configuré.
 * Ne lève jamais : toute erreur (réseau, webhook supprimé, 429…) est avalée.
 */
export async function annoncerNouveauLeaderDiscord(o: NouveauLeaderDiscord): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return; // Discord non configuré → no-op silencieux

  const url = `${siteUrl}${o.link}`;
  const payload = {
    // username/avatar laissés à la config du webhook côté Discord.
    embeds: [{
      title:       '🏆 Nouveau record !',
      description: `**${o.pseudo}** prend la tête sur **${o.trackName}**`,
      url,
      color:       BR_PINK,
      fields: [
        { name: 'Voiture',        value: o.carLabel,                       inline: false },
        { name: 'Classe / Trans.', value: `${o.carClass} / ${o.drivetrain}`, inline: true  },
        { name: 'Temps',          value: formatTime(o.timeMs),             inline: true  },
      ],
      footer: { text: 'Better Rivals' },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
  } catch {
    // L'échec d'envoi Discord ne doit pas remonter : best-effort uniquement.
  }
}
