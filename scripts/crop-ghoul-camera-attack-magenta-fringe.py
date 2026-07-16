#!/usr/bin/env python3
"""Crop thin magenta fringe off the edges of the Ghoul camera-attack PNG frames."""
from pathlib import Path
import numpy as np
from PIL import Image

REPO_ROOT = Path("/Users/hynekdarbujan/PhpstormProjects/nocni-hlidac")
MAX_SCAN_PX = 12

def is_magenta(px_row):
    r = px_row[..., 0].astype(int)
    g = px_row[..., 1].astype(int)
    b = px_row[..., 2].astype(int)
    return (r > 150) & (b > 150) & (g < r - 40) & (g < b - 40)

def detect_edges(arr):
    h, w, _ = arr.shape
    result = {}
    for edge, get_line in [
        ("top", lambda i: arr[i, :, :]),
        ("bottom", lambda i: arr[h - 1 - i, :, :]),
        ("left", lambda i: arr[:, i, :]),
        ("right", lambda i: arr[:, w - 1 - i, :]),
    ]:
        count = 0
        for i in range(MAX_SCAN_PX):
            line = get_line(i)
            frac = is_magenta(line).mean()
            if frac > 0.5:
                count = i + 1
            else:
                break
        if count:
            result[edge] = count
    return result

def crop_file(path: Path):
    img = Image.open(path)
    mode = img.mode
    rgb = img.convert("RGB")
    arr = np.array(rgb)
    edges = detect_edges(arr)
    if not edges:
        return None
    h, w, _ = arr.shape
    left = edges.get("left", 0)
    right = w - edges.get("right", 0)
    top = edges.get("top", 0)
    bottom = h - edges.get("bottom", 0)
    cropped = img.crop((left, top, right, bottom))
    cropped.save(path)
    return edges, (w, h), cropped.size

def main():
    files = sorted(REPO_ROOT.glob("public/object_13/camera/*/*_ghoul_attack/*.png"))
    changed = 0
    for f in files:
        result = crop_file(f)
        if result:
            edges, before, after = result
            print(f"{f.relative_to(REPO_ROOT)}: {edges} — {before} -> {after}")
            changed += 1
    print(f"\n{changed} / {len(files)} files cropped")

if __name__ == "__main__":
    main()
