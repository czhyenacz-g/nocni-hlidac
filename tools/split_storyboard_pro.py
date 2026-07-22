from pathlib import Path

script = r'''#!/usr/bin/env python3
"""
Universal storyboard splitter for 4x4, 5x5 and 6x6 image sheets.

Features:
- automatic detection of magenta separator lines,
- automatic grid-size detection (4x4, 5x5, 6x6),
- removal of magenta borders,
- output filename prefix,
- ZIP creation,
- optional manual grid fallback.

Requirements:
    pip install pillow

Examples:
    python split_storyboard_pro.py storyboard.png

    python split_storyboard_pro.py storyboard.png \
        --prefix door_hallway

    python split_storyboard_pro.py storyboard.png \
        --prefix door_hallway \
        --output ./frames

    python split_storyboard_pro.py storyboard.png \
        --grid 4x4 \
        --force-grid

    python split_storyboard_pro.py storyboard.png \
        --padding 2 \
        --format webp
"""

from __future__ import annotations

import argparse
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image


SUPPORTED_GRID_SIZES = {4, 5, 6}


@dataclass(frozen=True)
class Band:
    start: int
    end: int

    @property
    def size(self) -> int:
        return self.end - self.start + 1


def parse_grid(value: str) -> tuple[int, int]:
    try:
        cols_text, rows_text = value.lower().split("x", 1)
        cols = int(cols_text)
        rows = int(rows_text)
    except (ValueError, AttributeError) as exc:
        raise argparse.ArgumentTypeError(
            "Grid must be written as COLSxROWS, for example 4x4, 5x5 or 6x6."
        ) from exc

    if cols not in SUPPORTED_GRID_SIZES or rows not in SUPPORTED_GRID_SIZES:
        raise argparse.ArgumentTypeError(
            "Supported grid dimensions are 4, 5 or 6."
        )

    return cols, rows


def is_magenta(pixel: tuple[int, int, int], tolerance: int) -> bool:
    red, green, blue = pixel

    return (
        red >= 255 - tolerance
        and blue >= 255 - tolerance
        and green <= tolerance
        and abs(red - blue) <= tolerance
    )


def find_separator_bands(
    image: Image.Image,
    axis: str,
    tolerance: int,
    dominance_ratio: float,
) -> list[Band]:
    width, height = image.size
    axis_length = width if axis == "x" else height
    cross_length = height if axis == "x" else width

    sample_step = max(1, cross_length // 350)
    flags: list[bool] = []

    for coordinate in range(axis_length):
        magenta_hits = 0
        total = 0

        for cross in range(0, cross_length, sample_step):
            position = (
                (coordinate, cross)
                if axis == "x"
                else (cross, coordinate)
            )
            pixel = image.getpixel(position)
            magenta_hits += int(is_magenta(pixel, tolerance))
            total += 1

        flags.append(
            total > 0 and magenta_hits / total >= dominance_ratio
        )

    bands: list[Band] = []
    start: int | None = None

    for index, flag in enumerate(flags + [False]):
        if flag and start is None:
            start = index
        elif not flag and start is not None:
            bands.append(Band(start=start, end=index - 1))
            start = None

    return bands


def ranges_between_bands(bands: list[Band]) -> list[tuple[int, int]]:
    if len(bands) < 2:
        return []

    ranges = [
        (bands[index].end + 1, bands[index + 1].start - 1)
        for index in range(len(bands) - 1)
    ]

    return [
        (start, end)
        for start, end in ranges
        if end >= start
    ]


def equal_grid_ranges(length: int, count: int) -> list[tuple[int, int]]:
    boundaries = [
        round(index * length / count)
        for index in range(count + 1)
    ]

    return [
        (boundaries[index], boundaries[index + 1] - 1)
        for index in range(count)
    ]


def validate_detected_grid(
    x_ranges: list[tuple[int, int]],
    y_ranges: list[tuple[int, int]],
) -> tuple[int, int] | None:
    cols = len(x_ranges)
    rows = len(y_ranges)

    if cols == rows and cols in SUPPORTED_GRID_SIZES:
        return cols, rows

    return None


def strip_edge_magenta(
    frame: Image.Image,
    tolerance: int,
    max_trim: int = 12,
) -> Image.Image:
    """
    Removes thin residual magenta fringes from the four edges.
    It never trims more than max_trim pixels from any side.
    """
    image = frame.convert("RGB")
    left = 0
    top = 0
    right = image.width
    bottom = image.height

    def column_is_magenta(x: int) -> bool:
        step = max(1, image.height // 100)
        samples = [
            image.getpixel((x, y))
            for y in range(0, image.height, step)
        ]
        ratio = sum(is_magenta(pixel, tolerance) for pixel in samples) / len(samples)
        return ratio >= 0.35

    def row_is_magenta(y: int) -> bool:
        step = max(1, image.width // 100)
        samples = [
            image.getpixel((x, y))
            for x in range(0, image.width, step)
        ]
        ratio = sum(is_magenta(pixel, tolerance) for pixel in samples) / len(samples)
        return ratio >= 0.35

    while left < min(max_trim, image.width - 1) and column_is_magenta(left):
        left += 1

    trimmed_right = 0
    while (
        trimmed_right < min(max_trim, image.width - 1)
        and column_is_magenta(right - 1)
    ):
        right -= 1
        trimmed_right += 1

    while top < min(max_trim, image.height - 1) and row_is_magenta(top):
        top += 1

    trimmed_bottom = 0
    while (
        trimmed_bottom < min(max_trim, image.height - 1)
        and row_is_magenta(bottom - 1)
    ):
        bottom -= 1
        trimmed_bottom += 1

    if right <= left or bottom <= top:
        return image

    return image.crop((left, top, right, bottom))


def create_zip(zip_path: Path, files: Iterable[Path]) -> None:
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for file_path in files:
            archive.write(file_path, arcname=file_path.name)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Split a magenta-separated storyboard into numbered frames. "
            "Automatically detects 4x4, 5x5 or 6x6 grids."
        )
    )

    parser.add_argument(
        "image",
        type=Path,
        help="Path to the storyboard image.",
    )
    parser.add_argument(
        "--prefix",
        help="Output filename prefix. Default: input filename without extension.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        help="Output directory. Default: <input_stem>_frames next to the image.",
    )
    parser.add_argument(
        "--grid",
        type=parse_grid,
        help="Manual grid fallback: 4x4, 5x5 or 6x6.",
    )
    parser.add_argument(
        "--force-grid",
        action="store_true",
        help="Ignore separators and slice strictly according to --grid.",
    )
    parser.add_argument(
        "--tolerance",
        type=int,
        default=95,
        help="Magenta color tolerance from 0 to 255. Default: 95.",
    )
    parser.add_argument(
        "--dominance-ratio",
        type=float,
        default=0.42,
        help="Required magenta share in separator row/column. Default: 0.42.",
    )
    parser.add_argument(
        "--padding",
        type=int,
        default=0,
        help="Extra pixels removed from every frame edge. Default: 0.",
    )
    parser.add_argument(
        "--format",
        choices=("png", "webp", "jpg"),
        default="png",
        help="Output format. Default: png.",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=92,
        help="JPEG/WebP output quality. Default: 92.",
    )
    parser.add_argument(
        "--no-zip",
        action="store_true",
        help="Do not create a ZIP archive.",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing output files.",
    )
    parser.add_argument(
        "--keep-magenta-fringe",
        action="store_true",
        help="Disable automatic removal of residual magenta edge pixels.",
    )

    return parser


def main() -> int:
    args = build_parser().parse_args()

    image_path = args.image.expanduser().resolve()

    if not image_path.is_file():
        raise SystemExit(f"Input image does not exist: {image_path}")

    if not 0 <= args.tolerance <= 255:
        raise SystemExit("--tolerance must be between 0 and 255.")

    if not 0 < args.dominance_ratio <= 1:
        raise SystemExit("--dominance-ratio must be greater than 0 and at most 1.")

    if args.padding < 0:
        raise SystemExit("--padding cannot be negative.")

    if args.force_grid and args.grid is None:
        raise SystemExit("--force-grid requires --grid.")

    prefix = args.prefix or image_path.stem

    output_dir = (
        args.output.expanduser().resolve()
        if args.output
        else image_path.with_name(f"{image_path.stem}_frames")
    )

    output_dir.mkdir(parents=True, exist_ok=True)

    with Image.open(image_path) as source:
        image = source.convert("RGB")
        width, height = image.size

        if args.force_grid:
            assert args.grid is not None
            cols, rows = args.grid
            x_ranges = equal_grid_ranges(width, cols)
            y_ranges = equal_grid_ranges(height, rows)
            detection_mode = f"forced {cols}x{rows}"
        else:
            x_bands = find_separator_bands(
                image,
                axis="x",
                tolerance=args.tolerance,
                dominance_ratio=args.dominance_ratio,
            )
            y_bands = find_separator_bands(
                image,
                axis="y",
                tolerance=args.tolerance,
                dominance_ratio=args.dominance_ratio,
            )

            x_ranges = ranges_between_bands(x_bands)
            y_ranges = ranges_between_bands(y_bands)

            detected_grid = validate_detected_grid(x_ranges, y_ranges)

            if detected_grid is None:
                if args.grid is None:
                    raise SystemExit(
                        "Could not automatically detect a valid 4x4, 5x5 or 6x6 grid.\n"
                        "Try --grid 4x4, --grid 5x5 or --grid 6x6."
                    )

                cols, rows = args.grid
                x_ranges = equal_grid_ranges(width, cols)
                y_ranges = equal_grid_ranges(height, rows)
                detection_mode = f"fallback {cols}x{rows}"
            else:
                cols, rows = detected_grid
                detection_mode = f"detected {cols}x{rows}"

        total_frames = cols * rows
        number_width = max(2, len(str(total_frames)))

        output_files: list[Path] = []
        frame_number = 1

        for top, bottom in y_ranges:
            for left, right in x_ranges:
                left += args.padding
                top += args.padding
                right -= args.padding
                bottom -= args.padding

                if right < left or bottom < top:
                    raise SystemExit(
                        "Padding is too large for one or more frames."
                    )

                frame = image.crop((left, top, right + 1, bottom + 1))

                if not args.keep_magenta_fringe:
                    frame = strip_edge_magenta(
                        frame,
                        tolerance=args.tolerance,
                    )

                filename = (
                    f"{prefix}_{frame_number:0{number_width}d}.{args.format}"
                )
                output_path = output_dir / filename

                if output_path.exists() and not args.overwrite:
                    raise SystemExit(
                        f"Output already exists: {output_path}\n"
                        "Use --overwrite to replace existing files."
                    )

                save_options: dict[str, int | bool] = {}

                if args.format in {"jpg", "webp"}:
                    save_options["quality"] = args.quality

                if args.format == "jpg":
                    save_options["optimize"] = True

                frame.save(output_path, **save_options)
                output_files.append(output_path)
                frame_number += 1

    zip_path: Path | None = None

    if not args.no_zip:
        zip_path = output_dir.with_suffix(".zip")

        if zip_path.exists() and not args.overwrite:
            raise SystemExit(
                f"ZIP already exists: {zip_path}\n"
                "Use --overwrite to replace it."
            )

        create_zip(zip_path, output_files)

    print(f"Input:  {image_path}")
    print(f"Grid:   {cols}x{rows}")
    print(f"Mode:   {detection_mode}")
    print(f"Frames: {len(output_files)}")
    print(f"Output: {output_dir}")

    if zip_path:
        print(f"ZIP:    {zip_path}")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        raise SystemExit(130)
'''

path = Path("/mnt/data/split_storyboard_pro.py")
path.write_text(script, encoding="utf-8")
path.chmod(0o755)

print(path)
