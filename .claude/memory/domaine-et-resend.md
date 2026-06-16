---
name: domaine-et-resend
description: Domaine canonique du site et migration de l'expéditeur Resend
metadata:
  type: project
---

Le domaine définitif du site est **better-rivals-fh6.org** (confirmé par l'utilisateur le 2026-06-16). Source unique : `lib/site.ts` (`siteUrl`), réutilisée par le layout, le sitemap, robots et les liens d'e-mails.

**Migration Resend en attente :** l'adresse expéditeur des e-mails reste `noreply@better-rivals.gg` (fallback dans `app/api/times/route.ts`, ligne `from:`). C'est le domaine d'envoi historiquement vérifié dans Resend.

**Why :** changer l'expéditeur sans avoir vérifié le domaine `.org` dans Resend (DNS SPF/DKIM) ferait échouer tous les envois d'e-mails.

**How to apply :** vérifier `better-rivals-fh6.org` dans Resend, puis définir en prod la variable d'env `RESEND_FROM_EMAIL = "Better Rivals <noreply@better-rivals-fh6.org>"` (l'expéditeur est déjà surchargeable, aucune modif de code nécessaire).
