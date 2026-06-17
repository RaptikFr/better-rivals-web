import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { siteUrl } from '@/lib/site';
import { computeWeeklyRecap } from '@/lib/weeklyRecap';

export const dynamic = 'force-dynamic';

// Instanciation paresseuse (le constructeur lève si la clé manque) — voir la
// même logique dans app/api/times/route.ts.
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  return key ? new Resend(key) : null;
}

function buildRecapHtml(opts: { pseudo: string; gained: number; lost: number }): string {
  const net = opts.gained - opts.lost;
  const netLabel =
    net > 0 ? `+${net} record${net > 1 ? 's' : ''} net cette semaine 📈`
    : net < 0 ? `${net} record${net < -1 ? 's' : ''} net cette semaine 📉`
    : 'Tu as défendu ton terrain cette semaine 🛡️';

  function cell(value: number, label: string, color: string) {
    return `
      <td align="center" style="padding:16px 8px;">
        <div style="font-size:34px;font-weight:800;color:${color};">${value}</div>
        <div style="font-size:13px;color:#737373;margin-top:4px;">${label}</div>
      </td>`;
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:20px;">
      <span style="font-size:20px;font-weight:900;color:#ec4899;">Better</span><span style="font-size:20px;font-weight:900;color:#7c3aed;">Rivals</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e5e5e5;">
      <h1 style="margin:0 0 6px;font-size:20px;font-weight:800;color:#0a0a0a;">Ton récap de la semaine, ${opts.pseudo}</h1>
      <p style="margin:0 0 20px;color:#737373;font-size:14px;">${netLabel}</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#fafafa;border-radius:10px;">
        <tr>
          ${cell(opts.gained, 'records pris', '#16a34a')}
          ${cell(opts.lost, 'records perdus', '#dc2626')}
        </tr>
      </table>
      <a href="${siteUrl}/classements" style="display:inline-block;background:#ec4899;color:#ffffff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;">Voir les classements →</a>
    </div>
    <p style="text-align:center;color:#a3a3a3;font-size:12px;margin:20px 0 0;">
      Tu reçois cet email car tu as activé le récap hebdomadaire dans tes paramètres.<br>
      <a href="${siteUrl}/profil" style="color:#a3a3a3;text-decoration:underline;">Gérer mes préférences</a>
    </p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  // Auth : secret partagé avec le planificateur. Sans CRON_SECRET configuré ou
  // en cas de mismatch → 401, et rien n'est envoyé. Garde-fou volontaire pour
  // qu'un envoi de masse ne parte jamais par accident.
  const secret = process.env.CRON_SECRET;
  const auth   = request.headers.get('Authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  // ?dry=1 : calcule et renvoie la liste des destinataires SANS envoyer d'email.
  const dry     = request.nextUrl.searchParams.get('dry') === '1';
  const sinceMs = Date.now() - 7 * 24 * 3600 * 1000;

  let entries;
  try {
    entries = await computeWeeklyRecap(sinceMs);
  } catch {
    return NextResponse.json({ error: 'Calcul du récap impossible.' }, { status: 500 });
  }

  // On ne contacte que les joueurs ayant eu de l'activité (pris ou perdu un record).
  const active = entries.filter(e => e.gained > 0 || e.lost > 0);

  // Préférence dédiée (opt-in) + user_id, en une seule lecture.
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, user_id, notify_weekly')
    .in('id', active.map(e => e.playerId));
  const prefById = new Map((players ?? []).map(p => [p.id, p]));

  const resend     = getResend();
  const recipients: { pseudo: string; gained: number; lost: number }[] = [];
  let sent = 0;

  for (const e of active) {
    const p = prefById.get(e.playerId);
    // Opt-in strict : seuls les joueurs ayant explicitement coché l'option.
    if (!p || p.notify_weekly !== true || !p.user_id) continue;
    recipients.push({ pseudo: e.pseudo, gained: e.gained, lost: e.lost });

    if (dry || !resend) continue; // dry-run ou pas de clé Resend → on n'envoie pas

    const { data: authData } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
    const email = authData?.user?.email;
    if (!email) continue;

    try {
      await resend.emails.send({
        from:    process.env.RESEND_FROM_EMAIL ?? 'Better Rivals <noreply@better-rivals-fh6.org>',
        to:      email,
        subject: `Ton récap Better Rivals : ${e.gained} pris, ${e.lost} perdu${e.lost > 1 ? 's' : ''} cette semaine`,
        html:    buildRecapHtml({ pseudo: e.pseudo, gained: e.gained, lost: e.lost }),
      });
      sent += 1;
    } catch {
      // L'échec d'un envoi n'interrompt pas la campagne.
    }
  }

  return NextResponse.json({
    ok:         true,
    dry,
    candidates: active.length,
    willSend:   recipients.length,
    sent,
    // En dry-run on renvoie la liste pour pouvoir vérifier avant d'activer.
    recipients: dry ? recipients : undefined,
  });
}
