"""
track_mapper.py — Enregistreur de trajectoire Forza Horizon 6
Écoute les paquets UDP FH6, trace la trajectoire d'un lap et exporte JSON + SVG.

Aucune dépendance externe (stdlib uniquement).
Cible principale : Windows (msvcrt). Fallback Linux via termios/select.
"""

import json
import math
import os
import queue
import socket
import struct
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

# ─── Paramètres configurables ─────────────────────────────────────────────────
UDP_PORT       = 5300    # port configuré dans FH6 (même que le relais Better Rivals)
SAMPLE_EVERY_N = 10      # 1 sample tous les N paquets (≈ 6 Hz à 60 Hz)
OUTPUT_DIR     = "."     # dossier d'export (relatif au script)
DEBUG          = False   # True → affiche X/Y/Z bruts toutes les secondes
SITE_URL       = "https://better-rivals-fh6.org"  # API liste des circuits
# ─────────────────────────────────────────────────────────────────────────────

PACKET_SIZE = 324

# Offsets FH6 (float32 little-endian sauf indication)
OFF_IS_RACE_ON        = 0    # int32
OFF_POSITION_X        = 244  # float32  (232 standard FM + 12 décalage FH6)
OFF_POSITION_Y        = 248  # float32  (hauteur, non utilisée dans le SVG)
OFF_POSITION_Z        = 252  # float32
OFF_SPEED             = 256  # float32  m/s
OFF_DISTANCE_TRAVELED = 292  # float32  m (reset à 0 au départ)
OFF_BEST_LAP          = 296  # float32  s
OFF_CURRENT_LAP       = 304  # float32  s
OFF_LAP_NUMBER        = 312  # uint16


# ─── Parseur de paquet ────────────────────────────────────────────────────────

def parse_packet(data: bytes) -> dict | None:
    if len(data) != PACKET_SIZE:
        return None
    try:
        return {
            'is_race_on': struct.unpack_from('<i', data, OFF_IS_RACE_ON)[0],
            'x':          struct.unpack_from('<f', data, OFF_POSITION_X)[0],
            'y':          struct.unpack_from('<f', data, OFF_POSITION_Y)[0],
            'z':          struct.unpack_from('<f', data, OFF_POSITION_Z)[0],
            'speed':      struct.unpack_from('<f', data, OFF_SPEED)[0],
            'dist_m':     struct.unpack_from('<f', data, OFF_DISTANCE_TRAVELED)[0],
            'best_lap':   struct.unpack_from('<f', data, OFF_BEST_LAP)[0],
            't_s':        struct.unpack_from('<f', data, OFF_CURRENT_LAP)[0],
            'lap_number': struct.unpack_from('<H', data, OFF_LAP_NUMBER)[0],
        }
    except struct.error:
        return None


# ─── État partagé ─────────────────────────────────────────────────────────────

_lock         = threading.Lock()
_samples: list      = []          # {x, z, y, dist_m, t_s, spd_ms}
_checkpoints: list  = []          # {label, sample_index, x, z, dist_m}
_last_packet: dict  = {}
_lap_number   = 0
_recording    = False             # True quand is_race_on==1 et LapNumber>=1
_had_recording = False            # a-t-on déjà commencé à enregistrer ce lap ?
_lap_done     = False
_lap_time_s   = 0.0

# Queue clavier (thread KB → main)
_key_queue: queue.Queue = queue.Queue()


# ─── Thread UDP ───────────────────────────────────────────────────────────────

def _udp_listener() -> None:
    global _lap_number, _last_packet, _recording, _had_recording, _lap_done, _lap_time_s

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.bind(('', UDP_PORT))
    sock.settimeout(1.0)

    pkt_since_sample = 0

    while True:
        try:
            data, _ = sock.recvfrom(1024)
        except socket.timeout:
            continue

        p = parse_packet(data)
        if p is None:
            continue

        with _lock:
            _last_packet = p
            pkt_since_sample += 1

            now_recording = (p['is_race_on'] == 1 and p['lap_number'] >= 1)

            # Détection fin de lap : LapNumber s'incrémente ET on enregistrait
            if _had_recording and p['lap_number'] > _lap_number and _lap_number >= 1:
                _lap_done   = True
                _lap_time_s = p['best_lap'] if p['best_lap'] > 0.1 else p['t_s']

            _lap_number  = p['lap_number']
            _recording   = now_recording
            if now_recording:
                _had_recording = True

            # Stockage du sample
            if now_recording and pkt_since_sample >= SAMPLE_EVERY_N:
                _samples.append({
                    'x':      p['x'],
                    'z':      p['z'],
                    'y':      p['y'],
                    'dist_m': p['dist_m'],
                    't_s':    p['t_s'],
                    'spd_ms': p['speed'],
                })
                pkt_since_sample = 0


# ─── Thread clavier ───────────────────────────────────────────────────────────

def _kb_thread_windows() -> None:
    import msvcrt
    while True:
        if msvcrt.kbhit():
            ch = msvcrt.getch()
            try:
                _key_queue.put(ch.decode('utf-8', errors='ignore').lower())
            except Exception:
                pass
        time.sleep(0.02)


def _kb_thread_linux() -> None:
    import tty, termios, select as _sel
    fd  = sys.stdin.fileno()
    old = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        while True:
            r, _, _ = _sel.select([sys.stdin], [], [], 0.1)
            if r:
                ch = sys.stdin.read(1)
                _key_queue.put(ch.lower())
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)


def _start_kb_thread() -> None:
    if sys.platform == 'win32':
        t = threading.Thread(target=_kb_thread_windows, daemon=True)
    else:
        t = threading.Thread(target=_kb_thread_linux, daemon=True)
    t.start()


def _get_key() -> str | None:
    try:
        return _key_queue.get_nowait()
    except queue.Empty:
        return None


# ─── Fonctions de traitement ──────────────────────────────────────────────────

def mark_checkpoint() -> None:
    with _lock:
        if not _samples:
            _print_msg('⚠  Pas encore de position enregistrée.')
            return
        idx   = len(_samples) - 1
        s     = _samples[idx]
        n     = len(_checkpoints) + 1
        label = f'CP{n}'
        _checkpoints.append({
            'label':        label,
            'sample_index': idx,
            'x':            s['x'],
            'z':            s['z'],
            'dist_m':       s['dist_m'],
        })
        _print_msg(f'✓ {label} marqué à {s["dist_m"]:.1f} m.')


def normalize_path(samples: list) -> list[tuple[float, float]]:
    if not samples:
        return []
    CANVAS, MARGIN = 800, 40
    xs = [s['x'] for s in samples]
    zs = [s['z'] for s in samples]
    x_min, x_max = min(xs), max(xs)
    z_min, z_max = min(zs), max(zs)
    x_rng = x_max - x_min or 1
    z_rng = z_max - z_min or 1
    scale    = (CANVAS - 2 * MARGIN) / max(x_rng, z_rng)
    x_offset = MARGIN + ((CANVAS - 2 * MARGIN) - x_rng * scale) / 2
    z_offset = MARGIN + ((CANVAS - 2 * MARGIN) - z_rng * scale) / 2
    result = []
    for s in samples:
        px = x_offset + (s['x'] - x_min) * scale
        pz = (CANVAS - z_offset) - (s['z'] - z_min) * scale   # SVG Y=0 en haut
        result.append((px, pz))
    return result


def export_svg(samples: list, checkpoints: list, track_name: str, out_path: Path) -> None:
    coords = normalize_path(samples)
    if not coords:
        return

    CP_COLORS = ['#e91e8c', '#22c55e', '#f59e0b', '#3b82f6']
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">',
        '  <rect width="800" height="800" fill="#0f0f0f"/>',
        f'  <title>{track_name}</title>',
    ]

    # Tracé
    path_d = ' '.join(
        f'{"M" if i == 0 else "L"}{x:.1f},{z:.1f}'
        for i, (x, z) in enumerate(coords)
    )
    lines.append(
        f'  <path d="{path_d}" stroke="#ffffff" stroke-width="2" '
        f'fill="none" stroke-linejoin="round" stroke-linecap="round"/>'
    )

    # START
    sx, sz = coords[0]
    lines.append(f'  <circle cx="{sx:.1f}" cy="{sz:.1f}" r="5" fill="#ffffff"/>')
    lines.append(
        f'  <text x="{sx + 8:.1f}" y="{sz + 4:.1f}" fill="#ffffff" '
        f'font-family="Segoe UI, sans-serif" font-size="11">START</text>'
    )

    # Checkpoints
    for i, cp in enumerate(checkpoints):
        idx = cp['sample_index']
        if not (0 <= idx < len(coords)):
            continue
        cx, cz = coords[idx]
        color  = CP_COLORS[i % len(CP_COLORS)]
        lines.append(f'  <circle cx="{cx:.1f}" cy="{cz:.1f}" r="6" fill="{color}"/>')
        lines.append(
            f'  <text x="{cx + 9:.1f}" y="{cz + 4:.1f}" fill="#ffffff" '
            f'font-family="Segoe UI, sans-serif" font-size="11">{cp["label"]}</text>'
        )

    lines.append('</svg>')
    out_path.write_text('\n'.join(lines), encoding='utf-8')


def export_json(samples: list, checkpoints: list, track_name: str,
                lap_time_s: float, out_path: Path, track_id: int | None = None) -> None:
    data = {
        'track_id':         track_id,
        'track_name':       track_name,
        'recorded_at':      datetime.now().isoformat(timespec='seconds'),
        'lap_time_s':       round(lap_time_s, 3),
        'total_distance_m': round(samples[-1]['dist_m'], 2) if samples else 0.0,
        'sample_count':     len(samples),
        'path': [
            {
                'x':      round(s['x'],      3),
                'z':      round(s['z'],      3),
                'y':      round(s['y'],      3),
                'dist_m': round(s['dist_m'], 2),
                't_s':    round(s['t_s'],    3),
                'spd_ms': round(s['spd_ms'], 2),
            }
            for s in samples
        ],
        'checkpoints': checkpoints,
    }
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


def do_export(samples: list, checkpoints: list, track_name: str,
              lap_time_s: float, track_id: int | None = None) -> None:
    ts      = datetime.now().strftime('%Y%m%d_%H%M%S')
    stem    = track_name.replace(' ', '_').replace('/', '-')
    out_dir = Path(OUTPUT_DIR)
    j_out   = out_dir / f'{stem}_{ts}.json'
    s_out   = out_dir / f'{stem}_{ts}.svg'
    export_json(samples, checkpoints, track_name, lap_time_s, j_out, track_id)
    export_svg(samples, checkpoints, track_name, s_out)
    print(f'\n✅ Exporté :\n   {j_out}\n   {s_out}')


# ─── Affichage ────────────────────────────────────────────────────────────────

_pending_msg: str | None = None


def _print_msg(msg: str) -> None:
    global _pending_msg
    _pending_msg = msg


def _flush_msg() -> None:
    global _pending_msg
    if _pending_msg:
        print(f'\r{_pending_msg:<78}')
        _pending_msg = None


def _live_display(p: dict, n_samples: int, n_cp: int) -> None:
    racing = p.get('is_race_on', 0)
    lap    = p.get('lap_number', 0)
    dist   = p.get('dist_m', 0.0)
    t      = p.get('t_s', 0.0)
    spd    = p.get('speed', 0.0) * 3.6
    status = '🔴 Pause/Menu' if not racing else f'🟢 Lap {lap}'

    line = (
        f'{status}  {dist:>7.1f} m  {t:>6.1f} s  {spd:>5.0f} km/h  '
        f'| {n_samples} pts  {n_cp} CP  '
        f'| [Espace]=CP  [Q]=Export'
    )
    print(f'\r{line:<78}', end='', flush=True)

    if DEBUG:
        x = p.get('x', 0.0)
        y = p.get('y', 0.0)
        z = p.get('z', 0.0)
        print(f'\n  [DEBUG] X={x:>10.2f}  Y={y:>8.2f}  Z={z:>10.2f}', flush=True)


def _wait_key_choice(valid: str) -> str:
    while True:
        k = _get_key()
        if k and k in valid:
            return k
        time.sleep(0.05)


# ─── Sélection du circuit ─────────────────────────────────────────────────────

def _fetch_circuits(timeout: float = 6.0) -> list:
    """Liste des circuits approuvés via GET {SITE_URL}/api/circuits (public)."""
    req = urllib.request.Request(
        f'{SITE_URL}/api/circuits', headers={'User-Agent': 'track_mapper'}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        payload = json.loads(resp.read().decode('utf-8'))
    return payload.get('circuits', [])


def _saisie_manuelle() -> tuple[int | None, str]:
    nom = input('Nom du circuit : ').strip() or 'Circuit'
    return None, nom


def choisir_circuit() -> tuple[int | None, str]:
    """Menu numéroté depuis l'API → (track_id, track_name).
    track_id None = saisie manuelle (réseau coupé, API vide, ou choix [M])."""
    try:
        circuits = _fetch_circuits()
    except (urllib.error.URLError, OSError, ValueError) as e:
        print(f'⚠  Liste des circuits indisponible ({e.__class__.__name__}).')
        print('   → saisie manuelle (le tracé ne sera pas rattaché à un track_id).')
        return _saisie_manuelle()

    if not circuits:
        print('⚠  Aucun circuit renvoyé par l\'API → saisie manuelle.')
        return _saisie_manuelle()

    print(f'\n{len(circuits)} circuits disponibles (★ = officiel) :\n')
    for i, c in enumerate(circuits, 1):
        km   = f'{c["length_km"]:.1f} km' if c.get('length_km') else '—'
        kind = 'sprint' if c.get('is_sprint') else (c.get('type') or 'circuit')
        off  = '★' if c.get('is_official') else ' '
        print(f'  {i:>3}. {off} {c["name"]:<32} ({kind}, {km})')
    print('    M.   Saisie manuelle (autre nom)')

    while True:
        choix = input('\nChoisis un circuit (numéro ou M) : ').strip().lower()
        if choix == 'm':
            return _saisie_manuelle()
        if choix.isdigit():
            n = int(choix)
            if 1 <= n <= len(circuits):
                c = circuits[n - 1]
                return c['id'], c['name']
        print('  Entrée invalide.')


# ─── Boucle principale ────────────────────────────────────────────────────────

def main() -> None:
    global _samples, _checkpoints, _lap_number, _had_recording, _lap_done, _lap_time_s

    print('╔══════════════════════════════════════════════════════════╗')
    print('║       track_mapper.py — Better Rivals FH6               ║')
    print('╠══════════════════════════════════════════════════════════╣')
    print(f'║  Port UDP  : {UDP_PORT:<45}║')
    print(f'║  Debug     : {"ON — X/Y/Z affichés" if DEBUG else "OFF (DEBUG=True pour valider les offsets)":<45}║')
    print('║  [Espace]  : marquer un checkpoint                      ║')
    print('║  [Q]       : forcer export et quitter                   ║')
    print('║                                                          ║')
    print(f'║  FH6 : Paramètres → Télémétrie → 127.0.0.1:{UDP_PORT}        ║')
    print('╚══════════════════════════════════════════════════════════╝')
    print()

    track_id, track_name = choisir_circuit()
    ref = f'track_id #{track_id}' if track_id is not None else 'saisie manuelle'
    print(f'\nEnregistrement pour « {track_name} » ({ref}) — en attente des paquets...\n')

    # Démarrage des threads (après input() pour éviter conflit sur stdin)
    threading.Thread(target=_udp_listener, daemon=True).start()
    _start_kb_thread()

    last_display   = 0.0
    saved_samples: list  = []
    saved_cps: list      = []
    saved_lap_t: float   = 0.0

    while True:
        now = time.monotonic()

        # Affichage live toutes les secondes
        if now - last_display >= 1.0:
            _flush_msg()
            with _lock:
                p    = dict(_last_packet)
                n_s  = len(_samples)
                n_cp = len(_checkpoints)
            if p:
                _live_display(p, n_s, n_cp)
            last_display = now

        # Clavier
        key = _get_key()
        if key == ' ':
            mark_checkpoint()
            last_display = 0.0
        elif key == 'q':
            print('\n\n[Q] — export en cours...')
            with _lock:
                s  = list(_samples)
                cp = list(_checkpoints)
                lt = _lap_time_s
            if s:
                do_export(s, cp, track_name, lt, track_id)
            else:
                print('⚠  Aucun sample enregistré.')
            break

        # Détection fin de lap
        with _lock:
            done = _lap_done
            if done:
                _lap_done      = False
                _had_recording = False
                saved_samples  = list(_samples)
                saved_cps      = list(_checkpoints)
                saved_lap_t    = _lap_time_s
                _samples.clear()
                _checkpoints.clear()

        if done:
            t_fmt = f'{saved_lap_t:.3f} s' if saved_lap_t > 0.1 else '—'
            print(f'\n\n🏁 Lap terminé — {t_fmt}  ({len(saved_samples)} points)')
            print('   [S] Sauvegarder   [R] Recommencer   [Q] Quitter')
            choice = _wait_key_choice('srq')

            if choice == 's':
                do_export(saved_samples, saved_cps, track_name, saved_lap_t, track_id)
                print('\n[Espace]=nouveau CP  [Q]=quitter — continue à rouler...\n')
            elif choice == 'r':
                print('↺ Nouveau lap — roule !\n')
            elif choice == 'q':
                do_export(saved_samples, saved_cps, track_name, saved_lap_t, track_id)
                break

        time.sleep(0.02)


if __name__ == '__main__':
    main()
