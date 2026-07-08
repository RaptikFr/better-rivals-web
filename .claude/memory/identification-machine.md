---
name: identification-machine
description: "Comment savoir si on est sur le PC PORTABLE ou le PC FIXE : empreinte machine ($env:COMPUTERNAME). Important car relais_gui_v22.py est gitignoré et existe sur les 2 → risque de divergence"
metadata: 
  node_type: memory
  type: reference
  originSessionId: cae85036-f3e2-4180-a051-95649963b520
---

Le projet est édité depuis **deux machines** du proprio. L'instance Claude sur chaque machine a un surnom :
- **Claude Portable** → `PC-RENAUD` (PC portable)
- **Claude Fixe** → `RAPTIK-PC` (PC fixe)

Comme le relais est **gitignoré**, savoir sur quelle machine on est est crucial pour éviter les divergences — voir [[relais-serveur-et-rang]].

**Auto-détection au besoin** (PowerShell) : `$env:COMPUTERNAME`.

| Machine | Surnom Claude | COMPUTERNAME | Python | `gh` | `upx` |
|---|---|---|---|---|---|
| **PORTABLE** | Claude Portable | `PC-RENAUD` | 3.14.0 | absent | absent |
| **FIXE** | Claude Fixe | `RAPTIK-PC` | 3.13.2 | présent (2.94) | absent |

→ Si `COMPUTERNAME == "PC-RENAUD"` ⇒ **portable** ; si `RAPTIK-PC` ⇒ **fixe**. (COMPUTERNAME du fixe relevé le 20/06.)

**Conséquence pratique** : avant toute modif du relais, vérifier quelle copie est la plus à jour. **20/06 : divergence RÉSOLUE — le proprio a recopié `relais_gui_v22.py` v1.13.0 du portable vers le fixe** ; les deux machines sont désormais alignées sur v1.13.0. Sur le fixe : `gh` simplifie les releases ; sur le portable : pas de `gh`, release via fallback Python/requests + `git credential fill`.

Note taille exe : ni le portable ni le fixe n'ont UPX. L'écart (portable ~14,5 Mo vs fixe ~18-19 Mo) vient surtout de la version de Python embarquée (3.14 vs 3.13), pas d'UPX. Pas un sujet (non compressé = + sûr antivirus, choix assumé).

Pas besoin que le proprio annonce la machine à chaque session : détection via `$env:COMPUTERNAME` suffit. (Il peut le dire en secours si je n'ai pas encore relevé le nom du fixe.)

**Build PyInstaller sur le portable (09/07)** : `python -m pyinstaller` échoue (« No module named pyinstaller ») même si `pip show pyinstaller` le trouve — utiliser l'exe direct `Scripts/pyinstaller.exe` (chemin complet, PATH ne le résout pas forcément). Build `--onefile --windowed --hidden-import coach_reglage` dans un dossier temp dédié (`%TEMP%\br_build<version>`), ~15 Mo. Fonctionne bien pour une release fallback sans `gh`.
