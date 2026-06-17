#!/usr/bin/env python3
"""Correctif des ANNÉES de la table `cars` d'après la base de référence ONYX (FH6).

Décision validée : pour les lignes qui ONT déjà un car_ordinal, l'année de référence
est celle d'ONYX. On ne touche À RIEN d'autre (ni name, ni manufacturer, ni model,
ni car_ordinal).

Le script NE FAIT AUCUNE écriture en base (RLS fermée sur `cars`, audit du 11 juin).
Il produit, dans --out :
  - annees_diff_review.csv : à relire AVANT d'appliquer
  - annees_update.sql      : les UPDATE, encadrés BEGIN; ... COMMIT;
  - annees_skipped.csv     : ordinaux absents d'ONYX ou année ONYX invalide

Idempotent : relancé sur une base déjà corrigée, il produit 0 UPDATE.

Usage :
  python correctif_annees_cars.py \
      --onyx car_database_generated_cleaned.json \
      --cars export.csv \
      --out ./out
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

# Console Windows : forcer l'UTF-8 pour éviter le mojibake sur les accents.
for flux in (sys.stdout, sys.stderr):
    try:
        flux.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (AttributeError, ValueError):
        pass

ANNEE_MIN = 1900
ANNEE_MAX = datetime.now().year  # bornes de plausibilité (incluses)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Génère un correctif d'années pour la table cars (revue + SQL).",
    )
    p.add_argument("--onyx", required=True, type=Path,
                   help="car_database_generated_cleaned.json (dict { ordinal: {...} }).")
    p.add_argument("--cars", required=True, type=Path,
                   help="Export CSV des voitures (colonnes car_ordinal,year,manufacturer,name).")
    p.add_argument("--out", required=True, type=Path,
                   help="Dossier de sortie (créé si absent).")
    return p.parse_args()


def annee_valide(valeur) -> int | None:
    """Retourne l'année en int si plausible (ANNEE_MIN..ANNEE_MAX), sinon None."""
    try:
        annee = int(str(valeur).strip())
    except (TypeError, ValueError):
        return None
    return annee if ANNEE_MIN <= annee <= ANNEE_MAX else None


def annee_courante(valeur) -> int | None:
    """Année actuelle d'une ligne cars, en int si parseable, sinon None.

    Pas de borne de plausibilité ici : on veut comparer fidèlement à la valeur
    en base (qui peut justement être aberrante, c'est tout l'intérêt du correctif).
    """
    texte = "" if valeur is None else str(valeur).strip()
    if texte == "" or texte.lower() == "null":
        return None
    try:
        return int(texte)
    except ValueError:
        return None


def charger_onyx(chemin: Path) -> dict[int, dict]:
    """Indexe ONYX par car_id (== ordinal). Clé int -> entrée."""
    with chemin.open(encoding="utf-8") as f:
        data = json.load(f)

    index: dict[int, dict] = {}
    for cle, entree in data.items():
        # La clé du dict et entree["car_id"] désignent le même ordinal ; on se
        # fie à car_id quand il est présent, sinon à la clé.
        brut = entree.get("car_id", cle)
        try:
            ordinal = int(brut)
        except (TypeError, ValueError):
            continue
        index[ordinal] = entree
    return index


def charger_cars(chemin: Path) -> list[dict]:
    """Charge les lignes cars ayant un car_ordinal entier. Dernier doublon gagne."""
    par_ordinal: dict[int, dict] = {}
    with chemin.open(encoding="utf-8-sig", newline="") as f:
        lecteur = csv.DictReader(f)
        manquantes = {"car_ordinal", "year", "manufacturer", "name"} - set(lecteur.fieldnames or [])
        if manquantes:
            sys.exit(f"Colonnes absentes du CSV cars : {', '.join(sorted(manquantes))}")

        for ligne in lecteur:
            brut = (ligne.get("car_ordinal") or "").strip()
            if brut == "" or brut.lower() == "null":
                continue  # sans ordinal : hors périmètre (jointure impossible)
            try:
                ordinal = int(brut)
            except ValueError:
                continue
            par_ordinal[ordinal] = {
                "car_ordinal": ordinal,
                "year": ligne.get("year"),
                "manufacturer": (ligne.get("manufacturer") or "").strip(),
                "name": (ligne.get("name") or "").strip(),
            }
    return [par_ordinal[o] for o in sorted(par_ordinal)]


def main() -> None:
    args = parse_args()
    onyx = charger_onyx(args.onyx)
    cars = charger_cars(args.cars)

    args.out.mkdir(parents=True, exist_ok=True)

    revue: list[dict] = []   # années différentes + ONYX plausible -> UPDATE
    ignores: list[dict] = []  # absents d'ONYX ou année ONYX invalide

    for car in cars:
        ordinal = car["car_ordinal"]
        actuelle = annee_courante(car["year"])
        ref = onyx.get(ordinal)

        if ref is None:
            ignores.append({
                "ordinal": ordinal,
                "manufacturer": car["manufacturer"],
                "name": car["name"],
                "annee_actuelle": "" if actuelle is None else actuelle,
                "annee_onyx": "",
                "raison": "absent d'ONYX",
            })
            continue

        onyx_year = annee_valide(ref.get("year"))
        if onyx_year is None:
            ignores.append({
                "ordinal": ordinal,
                "manufacturer": car["manufacturer"],
                "name": car["name"],
                "annee_actuelle": "" if actuelle is None else actuelle,
                "annee_onyx": ref.get("year"),
                "raison": "année ONYX invalide",
            })
            continue

        if actuelle == onyx_year:
            continue  # déjà correct -> aucun UPDATE (idempotence)

        revue.append({
            "ordinal": ordinal,
            "manufacturer": car["manufacturer"],
            "name": car["name"],
            "annee_actuelle": "" if actuelle is None else actuelle,
            "annee_onyx": onyx_year,
            "asset": ref.get("asset", ""),
        })

    revue.sort(key=lambda r: r["ordinal"])
    ignores.sort(key=lambda r: r["ordinal"])

    ecrire_review(args.out / "annees_diff_review.csv", revue)
    ecrire_sql(args.out / "annees_update.sql", revue)
    ecrire_skipped(args.out / "annees_skipped.csv", ignores)

    print(f"Voitures avec ordinal traitées : {len(cars)}")
    print(f"UPDATE générés (années à corriger) : {len(revue)}")
    print(f"Ignorés (absents d'ONYX / année invalide) : {len(ignores)}")
    print(f"Sorties écrites dans : {args.out.resolve()}")


def ecrire_review(chemin: Path, lignes: list[dict]) -> None:
    colonnes = ["ordinal", "manufacturer", "name", "annee_actuelle", "annee_onyx", "asset"]
    with chemin.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=colonnes)
        w.writeheader()
        w.writerows(lignes)


def ecrire_skipped(chemin: Path, lignes: list[dict]) -> None:
    colonnes = ["ordinal", "manufacturer", "name", "annee_actuelle", "annee_onyx", "raison"]
    with chemin.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=colonnes)
        w.writeheader()
        w.writerows(lignes)


def ecrire_sql(chemin: Path, lignes: list[dict]) -> None:
    horodatage = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with chemin.open("w", encoding="utf-8", newline="\n") as f:
        f.write("-- Correctif des ANNÉES de la table `cars` d'après la base de référence ONYX (FH6).\n")
        f.write("-- ⚠️  RELIRE annees_diff_review.csv AVANT d'exécuter ce script.\n")
        f.write("-- Ne modifie QUE la colonne `year`, ligne par ligne via car_ordinal.\n")
        f.write("-- Aucune autre colonne n'est touchée (name / manufacturer / model / car_ordinal inchangés).\n")
        f.write("-- À exécuter dans le SQL editor Supabase (rôle owner -> contourne la RLS).\n")
        f.write(f"-- Généré le {horodatage} — {len(lignes)} mise(s) à jour.\n")
        f.write("--\n")
        f.write("-- Encadré par BEGIN; ... COMMIT; : remplace COMMIT; par ROLLBACK; pour annuler.\n")
        f.write("\n")
        f.write("BEGIN;\n")
        for ligne in lignes:
            f.write(
                f"UPDATE cars SET year = {ligne['annee_onyx']} "
                f"WHERE car_ordinal = {ligne['ordinal']};\n"
            )
        f.write("COMMIT;\n")


if __name__ == "__main__":
    main()
