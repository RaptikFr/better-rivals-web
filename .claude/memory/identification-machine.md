---
name: identification-machine
description: "Comment savoir si on est sur le PC PORTABLE ou le PC FIXE : empreinte machine ($env:COMPUTERNAME). Important car relais_gui_v21.py est gitignoré et existe sur les 2 → risque de divergence"
metadata: 
  node_type: memory
  type: reference
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

Le projet est édité depuis **deux machines** du proprio. Comme `relais_gui_v21.py` est **gitignoré** (non synchronisé par git), savoir sur quelle machine on est est crucial pour la divergence de source du relais — voir [[relais-serveur-et-rang]].

**Auto-détection au besoin** (PowerShell) : `$env:COMPUTERNAME`.

| Machine | COMPUTERNAME | Python | `gh` | `upx` |
|---|---|---|---|---|
| **PORTABLE** | `PC-RENAUD` | 3.14.0 | absent | absent |
| **FIXE** | *(à capturer la prochaine fois qu'on y est)* | 3.13.2 | présent (2.94) | absent |

→ Si `COMPUTERNAME == "PC-RENAUD"` ⇒ **portable**. Sinon, supposer le fixe (et en profiter pour relever et consigner son COMPUTERNAME ici).

**Conséquence pratique** : avant toute modif du relais, vérifier quelle copie est la plus à jour. Au 19/06, le **portable a v1.11.2**, le **fixe a v1.11.1** (en retard). Sur le fixe : `gh` simplifie les releases ; sur le portable : pas de `gh`, release via fallback Python/requests + `git credential fill`.

Note taille exe : ni le portable ni le fixe n'ont UPX. L'écart (portable ~14,5 Mo vs fixe ~18-19 Mo) vient surtout de la version de Python embarquée (3.14 vs 3.13), pas d'UPX. Pas un sujet (non compressé = + sûr antivirus, choix assumé).

Pas besoin que le proprio annonce la machine à chaque session : détection via `$env:COMPUTERNAME` suffit. (Il peut le dire en secours si je n'ai pas encore relevé le nom du fixe.)
