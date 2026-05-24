"""
Better Rivals FH6 — Script de télémétrie UDP Sécurisé (Version Dashboard & Menu)
========================================================================
"""

import socket
import struct
import sys
import requests
import os

# ============================================================
# CONFIGURATION
# ============================================================
UDP_IP        = "0.0.0.0"
UDP_PORT      = 5300
API_URL       = "https://better-rivals-web.vercel.app/api/times"
API_TOKEN     = "MotDePasseForza2026"

DRIVETRAINS = {0: "FWD", 1: "RWD", 2: "AWD"}
CAR_CLASSES = {0: "D", 1: "C", 2: "B", 3: "A", 4: "S1", 5: "S2", 6: "X"}

# Liste officielle des circuits disponibles pour le relais
CIRCUITS_OFFICIELS = {
    1: "Goliath",
    2: "Colossus",
    3: "Le Titan",
    4: "Le Gauntlet",
    5: "Le Juggernaut",
    14: "Sprint du Festival",
    99: "Circuit de Test Custom"
}

CAR_DASH_FIELDS = {
    "is_race_on":           (0, "<i"),
    "car_ordinal":          (212, "<i"),
    "car_class":            (216, "<i"),
    "car_pi":               (220, "<i"),
    "drivetrain":           (224, "<i"),
    "num_cylinders":        (228, "<i"),
    "best_lap_s":           (296, "<f"),
    "lap_valid":            (316, "<i"),
}

# --- Palette de couleurs (Codes ANSI) ---
VERT = '\033[92m'
ROUGE = '\033[91m'
VIOLET = '\033[95m'
BLEU = '\033[94m'
JAUNE = '\033[93m'
GRAS = '\033[1m'
RESET = '\033[0m'

def effacer_ecran():
    """Efface tout le contenu de la console pour faire un affichage propre."""
    os.system('cls' if os.name == 'nt' else 'clear')

def afficher_en_tete():
    """Affiche le grand logo Better Rivals en ASCII Art."""
    logo = rf"""{VIOLET}{GRAS}
  ____       _   _                 _____  _            _     
 |  _ \     | | | |               |  __ \(_)          | |    
 | |_) | ___| |_| |_ ___ _ __     | |__) |_ _   ____ _| |___ 
 |  _ < / _ \ __| __/ _ \ '__|    |  _  /| \ \ / / _` | / __|
 | |_) |  __/ |_| |_|  __/ |      | | \ \| |\ V / (_| | \__ \
 |____/ \___|\__|\__\___|_|       |_|  \_\_| \_/ \__,_|_|___/
    {RESET}"""
    print(logo)
    print(f" {BLEU}═{RESET}" * 58)
    print(f" {JAUNE}  Relais de Télémétrie Sécurisé pour Forza Horizon 6{RESET}")
    print(f" {BLEU}═{RESET}" * 58 + "\n")

def parse_packet(data: bytes) -> dict:
    if len(data) < 324: return {}
    return {name: struct.unpack_from(fmt, data, offset)[0] for name, (offset, fmt) in CAR_DASH_FIELDS.items()}

def format_time(ms: int) -> str:
    return f"{ms // 60000:02d}:{(ms % 60000) / 1000:06.3f}"

def prompt_session_info() -> dict:
    effacer_ecran()
    afficher_en_tete()
    
    print(f" {JAUNE}⚠️ IMPORTANT : Utilise ton Gamertag exact pour être reconnu.{RESET}")
    pseudo = input(f" {GRAS}👤 Ton Gamertag : {RESET}").strip()
    
    if not pseudo:
        print(f"\n {ROUGE}❌ Gamertag obligatoire. Fermeture du relais.{RESET}")
        sys.exit(1)
        
    pin = input(f" {GRAS}🔑 Ton code PIN (6 chiffres) : {RESET}").strip()
    
    if not pin:
        print(f"\n {ROUGE}❌ Code PIN obligatoire. Fermeture du relais.{RESET}")
        sys.exit(1)
        
    # --- AFFICHAGE DU MENU DES CIRCUITS ---
    print(f"\n {BLEU}┌──────────────────────────────────────────────┐{RESET}")
    print(f" {BLEU}│{RESET} {GRAS}       SÉLECTION DU CIRCUIT OFFICIEL        {RESET} {BLEU}│{RESET}")
    print(f" {BLEU}├──────────────────────────────────────────────┤{RESET}")
    
    for track_id, track_name in CIRCUITS_OFFICIELS.items():
        # Formatage pour que tout soit bien aligné
        print(f" {BLEU}│{RESET}  {VIOLET}[{track_id:2d}]{RESET} - {track_name:<32} {BLEU}│{RESET}")
        
    print(f" {BLEU}└──────────────────────────────────────────────┘{RESET}\n")
    
    while True:
        circuit_input = input(f" {GRAS}🏁 Entre le numéro du circuit : {RESET}").strip()
        
        # On vérifie que le joueur a bien tapé un numéro qui existe dans notre liste
        if circuit_input.isdigit() and int(circuit_input) in CIRCUITS_OFFICIELS:
            circuit_id = int(circuit_input)
            nom_circuit = CIRCUITS_OFFICIELS[circuit_id]
            break
        else:
            print(f" {ROUGE}❌ Numéro invalide. Choisis un numéro dans la liste.{RESET}")
    
    # On renvoie le nom du circuit en plus de l'ID pour pouvoir l'afficher joliment dans le dashboard
    return {"pseudo": pseudo, "pin": pin, "track_id": circuit_id, "track_name": nom_circuit}

def dessiner_dashboard(session, statut, dernier_chrono="--:--.---", message_api=""):
    """Met à jour l'interface visuelle fixe."""
    effacer_ecran()
    afficher_en_tete()
    
    print(f" {GRAS}Joueur  : {RESET}{session['pseudo']}")
    print(f" {GRAS}Circuit : {RESET}{session['track_name']} (ID: {session['track_id']})\n")
    
    print(f" {BLEU}┌──────────────────────────────────────────────┐{RESET}")
    print(f" {BLEU}│{RESET}  {GRAS}MEILLEUR TEMPS DÉTECTÉ : {JAUNE}{dernier_chrono:<19}{RESET} {BLEU}│{RESET}")
    print(f" {BLEU}└──────────────────────────────────────────────┘{RESET}\n")
    
    print(f" {GRAS}Statut du relais : {RESET}{statut}")
    if message_api:
        print(f" {GRAS}Dernière action  : {RESET}{message_api}")
    
    print(f"\n {GRAS}(Appuie sur Ctrl+C pour arrêter le relais){RESET}")

def main():
    # Activation des couleurs ANSI sur Windows
    if os.name == 'nt':
        os.system('color')

    session = prompt_session_info()
    
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    sock.settimeout(2.0)

    statut_actuel = f"⏳ En attente des données de Forza (Port {UDP_PORT})..."
    dessiner_dashboard(session, statut_actuel)

    last_best_ms = -1
    submitted_ms = set()

    try:
        while True:
            try:
                data, _ = sock.recvfrom(1024)
            except socket.timeout: 
                continue

            fields = parse_packet(data)
            if not fields or fields.get("is_race_on") == 0: 
                continue

            best_s = fields.get("best_lap_s", 0.0)
            best_ms = int(best_s * 1000) if best_s > 0.0 else -1

            # Si un nouveau meilleur temps est détecté
            if best_ms > 0 and best_ms != last_best_ms:
                last_best_ms = best_ms
                chrono_formate = format_time(best_ms)

                if best_ms not in submitted_ms:
                    # Le jeu nous dit que le temps est meilleur, mais on vérifie avec le joueur
                    statut_actuel = f"{JAUNE}⚠️ Nouveau record : {chrono_formate} !{RESET}"
                    dessiner_dashboard(session, statut_actuel, chrono_formate, "En attente de validation manuelle...")
                    
                    print(f"\n {GRAS}Ton tour était-il propre (sans point d'exclamation) ? (O/N) : {RESET}", end="")
                    validation = input().strip().upper()

                    if validation == 'O':
                        statut_actuel = f"{VERT}🚀 Envoi au serveur en cours...{RESET}"
                        dessiner_dashboard(session, statut_actuel, chrono_formate, "Préparation du colis...")
                        
                        # Préparation des données complètes pour l'API
                        payload = {
                            "player_id": session["pseudo"],
                            "pin_code": session["pin"],
                            "car_id": str(fields["car_ordinal"]),
                            "track_id": session["track_id"],
                            "lap_time": round(best_s, 3),
                            "is_valid": True,
                            "drivetrain": DRIVETRAINS.get(fields.get("drivetrain"), "AWD"),
                            "car_class": CAR_CLASSES.get(fields.get("car_class"), "A"),
                            "car_pi": fields.get("car_pi"),
                            "num_cylinders": fields.get("num_cylinders") if fields.get("num_cylinders", 0) > 0 else None
                        }
                        
                        try:
                            # Envoi au douanier
                            res = requests.post(
                                API_URL, 
                                json=payload, 
                                headers={"Authorization": f"Bearer {API_TOKEN}", "Content-Type": "application/json"}
                            )
                            if res.status_code == 200:
                                message = f"{VERT}✅ Chrono validé et sauvegardé sur Better Rivals !{RESET}"
                            else:
                                message = f"{ROUGE}❌ Erreur du serveur : {res.text}{RESET}"
                        except Exception as e:
                            message = f"{ROUGE}❌ Impossible de joindre le site : {e}{RESET}"
                        
                    else:
                        # Le joueur avoue avoir touché un mur ou rembobiné
                        message = f"{ROUGE}❌ Tour signalé ignoré. On remet les gaz !{RESET}"
                    
                    # Qu'il soit validé ou ignoré, on l'ajoute aux "soumis" pour ne pas le redemander
                    submitted_ms.add(best_ms)
                    
                    # Mise à jour de l'affichage final
                    statut_actuel = f"🚗 En attente du prochain tour..."
                    dessiner_dashboard(session, statut_actuel, chrono_formate, message)
                        
    except KeyboardInterrupt:
        effacer_ecran()
        afficher_en_tete()
        print(f" {VERT}👋 Session terminée. À bientôt sur la piste !{RESET}\n")
    finally:
        sock.close()

if __name__ == "__main__":
    main()