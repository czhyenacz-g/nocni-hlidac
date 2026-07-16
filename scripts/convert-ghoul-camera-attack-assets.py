#!/usr/bin/env python3
"""Convert the Ghoul camera-attack PNG frame sequences to WebP in place.

Zdrojové PNG snímky zůstávají (stejná konvence jako zbytek
public/object_13/camera/<kamera>/ — .png i .webp verze koexistují vedle
sebe), runtime hry (game/cameras/cameraAttackAnimation.object13.ts) používá
výhradně .webp cesty.

Použití:
    python3 scripts/convert-ghoul-camera-attack-assets.py [--overwrite]

Bez --overwrite se soubor přeskočí, pokud .webp už existuje a je novější
než zdrojové .png (idempotentní opakované spuštění).
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CAMERA_ROOT = REPO_ROOT / "public" / "object_13" / "camera"

# Zdrojové složky (viz zadání) — cesty relativní ke CAMERA_ROOT. outdoor
# přibyl později (viz zadání "doplnil jsem fotky i pro outdoor_ghoul_attack")
# a má jiný (menší) počet snímků než ostatní čtyři — frameDurationMs se
# odvozuje z počtu, takže to nevadí (viz cameraAttackAnimation.object13.ts).
SOURCE_FOLDERS = [
    "left_hallway/left_hallway_ghoul_attack",
    "right_hallway/right_hallway_ghoul_attack",
    "door_hallway/door_hallway_ghoul_attack",
    "door_hallway_light/door_hallway_light_ghoul_attack",
    "outdoor/outdoor_ghoul_attack",
]

FRAME_NUMBER_RE = re.compile(r"(\d+)(?=\.png$)")

# -q hodnota vhodná pro web (viz zadání "rozumná kvalita"), -m6 = nejlepší
# komprese (rychlost při konverzi nevadí, jde o build-time krok, ne runtime).
CWEBP_ARGS = ["-q", "85", "-m", "6"]


def numeric_key(path: Path) -> int:
    """Číselný klíč z názvu souboru (ne lexikografické řazení, viz zadání "1, 10, 11, 2" bug)."""
    match = FRAME_NUMBER_RE.search(path.name)
    if not match:
        raise ValueError(f"Soubor {path} nemá rozpoznatelné číslo snímku v názvu.")
    return int(match.group(1))


def convert_folder(folder: Path, overwrite: bool) -> int:
    if not folder.is_dir():
        raise SystemExit(f"CHYBA: složka {folder} neexistuje.")

    pngs = sorted(folder.glob("*.png"), key=numeric_key)
    if not pngs:
        raise SystemExit(f"CHYBA: složka {folder} neobsahuje žádné PNG snímky.")

    converted = 0
    for png in pngs:
        webp = png.with_suffix(".webp")
        if not overwrite and webp.exists() and webp.stat().st_mtime >= png.stat().st_mtime:
            continue
        result = subprocess.run(
            ["cwebp", *CWEBP_ARGS, str(png), "-o", str(webp)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise SystemExit(f"CHYBA: cwebp selhal na {png}:\n{result.stderr}")
        converted += 1

    print(f"{folder.relative_to(REPO_ROOT)}: {len(pngs)} snímků celkem, {converted} nově převedeno na WebP")
    return len(pngs)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--overwrite", action="store_true", help="Přepsat i už existující/aktuální .webp soubory.")
    args = parser.parse_args()

    if subprocess.run(["which", "cwebp"], capture_output=True).returncode != 0:
        raise SystemExit("CHYBA: cwebp není nainstalovaný (brew install webp).")

    total = 0
    for folder_rel in SOURCE_FOLDERS:
        total += convert_folder(CAMERA_ROOT / folder_rel, args.overwrite)

    print(f"Hotovo — {total} snímků celkem napříč {len(SOURCE_FOLDERS)} sekvencemi.")


if __name__ == "__main__":
    main()
