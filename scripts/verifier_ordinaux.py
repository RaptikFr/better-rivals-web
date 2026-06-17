#!/usr/bin/env python3
"""Contrôle de cohérence d'une liste « <année> <modèle> » -> car_ordinal.

Vérifie, SANS rien écrire en base ni ailleurs (sortie console uniquement) :
  - ordinaux entiers, uniques (un même ordinal mappé à deux voitures = ERREUR)
  - noms d'affichage uniques
  - préfixe année : 4 chiffres en tête, sinon « nom non résolu » (code asset brut)
  - années hors plage usuelle (signalées pour relecture, pas forcément fausses)

Optionnel : --onyx <car_database_generated_cleaned.json> pour croiser par ordinal
(présence + année + make/model) avec la base de référence ONYX.

Usage :
  python verifier_ordinaux.py --liste newlist.json [--onyx onyx.json]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

for flux in (sys.stdout, sys.stderr):
    try:
        flux.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (AttributeError, ValueError):
        pass

ANNEE_MAX_PLAUSIBLE = datetime.now().year
RE_ANNEE = re.compile(r"^(\d{4})\s+(.+)$")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Vérifie une liste display_name -> ordinal.")
    p.add_argument("--liste", required=True, type=Path,
                   help="JSON { \"<année> <modèle>\": \"<ordinal>\" }.")
    p.add_argument("--onyx", type=Path,
                   help="Base ONYX de référence (optionnel) pour croiser par ordinal.")
    return p.parse_args()


def charger_liste(chemin: Path) -> list[tuple[str, str]]:
    with chemin.open(encoding="utf-8") as f:
        data = json.load(f)
    return list(data.items())


def charger_onyx(chemin: Path) -> dict[int, dict]:
    with chemin.open(encoding="utf-8") as f:
        data = json.load(f)
    index: dict[int, dict] = {}
    for cle, entree in data.items():
        try:
            index[int(entree.get("car_id", cle))] = entree
        except (TypeError, ValueError):
            continue
    return index


def main() -> None:
    args = parse_args()
    entrees = charger_liste(args.liste)

    par_ordinal: dict[int, list[str]] = defaultdict(list)
    noms_vus: dict[str, int] = defaultdict(int)
    non_resolus: list[tuple[str, str]] = []
    ordinal_invalide: list[tuple[str, str]] = []
    annees_hors_plage: list[tuple[int, int, str]] = []

    parsed: dict[int, tuple[int | None, str]] = {}  # ordinal -> (annee, modele)

    for nom, ord_str in entrees:
        noms_vus[nom] += 1
        try:
            ordinal = int(str(ord_str).strip())
        except (TypeError, ValueError):
            ordinal_invalide.append((nom, ord_str))
            continue

        par_ordinal[ordinal].append(nom)

        m = RE_ANNEE.match(nom.strip())
        if not m:
            non_resolus.append((nom, ord_str))
            parsed[ordinal] = (None, nom.strip())
            continue

        annee = int(m.group(1))
        modele = m.group(2).strip()
        parsed[ordinal] = (annee, modele)
        if annee < 1930 or annee > ANNEE_MAX_PLAUSIBLE:
            annees_hors_plage.append((ordinal, annee, modele))

    doublons_ord = {o: noms for o, noms in par_ordinal.items() if len(noms) > 1}
    doublons_nom = {n: c for n, c in noms_vus.items() if c > 1}

    print(f"=== Liste : {len(entrees)} entrées, {len(par_ordinal)} ordinaux distincts ===\n")

    print(f"[1] Ordinaux en double (un ordinal -> plusieurs voitures) : {len(doublons_ord)}")
    for o, noms in sorted(doublons_ord.items()):
        print(f"    ⚠ ordinal {o} -> {noms}")

    print(f"\n[2] Noms d'affichage en double : {len(doublons_nom)}")
    for n, c in sorted(doublons_nom.items()):
        print(f"    ⚠ {c}× « {n} »")

    print(f"\n[3] Noms NON résolus (pas de préfixe année — code asset brut) : {len(non_resolus)}")
    for nom, o in non_resolus:
        print(f"    • {o:>5}  {nom}")

    print(f"\n[4] Ordinaux non entiers : {len(ordinal_invalide)}")
    for nom, o in ordinal_invalide:
        print(f"    ⚠ « {nom} » -> {o!r}")

    print(f"\n[5] Années hors plage 1930..{ANNEE_MAX_PLAUSIBLE} (à relire, pas forcément fausses) : {len(annees_hors_plage)}")
    for o, a, modele in sorted(annees_hors_plage):
        print(f"    • {o:>5}  {a}  {modele}")

    if args.onyx:
        croiser_onyx(parsed, charger_onyx(args.onyx))


def croiser_onyx(parsed: dict[int, tuple[int | None, str]], onyx: dict[int, dict]) -> None:
    ords_liste = set(parsed)
    ords_onyx = set(onyx)

    print(f"\n=== Croisement ONYX ({len(onyx)} entrées) ===")
    absents = sorted(ords_liste - ords_onyx)
    extra = sorted(ords_onyx - ords_liste)
    print(f"[6] Ordinaux de la liste ABSENTS d'ONYX : {len(absents)}")
    for o in absents:
        print(f"    ⚠ {o}  {parsed[o][1]}")
    print(f"\n[7] Ordinaux ONYX absents de la liste : {len(extra)}")
    for o in extra:
        print(f"    • {o}  {onyx[o].get('display_name','')}")

    diffs_annee = []
    for o in sorted(ords_liste & ords_onyx):
        annee_liste = parsed[o][0]
        try:
            annee_onyx = int(onyx[o].get("year"))
        except (TypeError, ValueError):
            annee_onyx = None
        if annee_liste is not None and annee_onyx is not None and annee_liste != annee_onyx:
            diffs_annee.append((o, annee_liste, annee_onyx, parsed[o][1]))

    print(f"\n[8] Années DIFFÉRENTES liste vs ONYX : {len(diffs_annee)}")
    for o, al, ao, modele in diffs_annee:
        print(f"    • {o:>5}  liste={al}  onyx={ao}  {modele}")


if __name__ == "__main__":
    main()
