---
name: domaine-et-resend
description: Domaine canonique du site et migration de l'expéditeur Resend
metadata:
  type: project
---

Le domaine définitif du site est **better-rivals-fh6.org** (confirmé par l'utilisateur le 2026-06-16). Source unique : `lib/site.ts` (`siteUrl`), réutilisée par le layout, le sitemap, robots et les liens d'e-mails.

Le `.gg` qui traînait dans le code n'était qu'un placeholder (l'utilisateur ne sait pas d'où il venait, le domaine a toujours été `.org`). Tout le code est désormais en `.org`, plus aucune occurrence `.gg`. L'expéditeur Resend par défaut est `noreply@better-rivals-fh6.org`, surchargeable via `RESEND_FROM_EMAIL`.

`.gg` était bien l'ancien vrai domaine, mais il n'a jamais été ajouté dans Resend → tout e-mail retombant sur ce fallback échouait en silence (try/catch dans `app/api/times/route.ts`).

**RÉSOLU (2026-06-16) :** `better-rivals-fh6.org` est **Verified** dans Resend (région eu-west-1/Ireland). L'expéditeur par défaut du code est désormais ce domaine vérifié → envoi d'e-mails opérationnel, aucune variable `RESEND_FROM_EMAIL` requise. Domaine géré chez Vercel DNS, site déployé sur Vercel. Plus rien en attente côté domaine/e-mails.
