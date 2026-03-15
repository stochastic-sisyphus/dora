#!/usr/bin/env python3

from __future__ import annotations

import platform
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sidecar" / "dora_sidecar.py"
BIN_DIR = ROOT / "src-tauri" / "binaries"
BUILD_DIR = ROOT / ".sidecar-build"
NAME = "dora-sidecar"


def detect_target_triple() -> str:
    system = platform.system().lower()
    machine = platform.machine().lower()

    arch_map = {
        "arm64": "aarch64",
        "aarch64": "aarch64",
        "x86_64": "x86_64",
        "amd64": "x86_64",
    }
    os_map = {
        "darwin": "apple-darwin",
        "linux": "unknown-linux-gnu",
        "windows": "pc-windows-msvc",
    }

    arch = arch_map.get(machine, machine)
    os_part = os_map.get(system)
    if os_part is None:
        raise SystemExit(f"Unsupported platform for sidecar build: {system}")
    return f"{arch}-{os_part}"


def main() -> None:
    pyinstaller_cmd: list[str]
    if shutil.which("pyinstaller") is not None:
        pyinstaller_cmd = ["pyinstaller"]
    else:
        pyinstaller_cmd = [sys.executable, "-m", "PyInstaller"]

    target = detect_target_triple()
    output_name = f"{NAME}-{target}"

    BIN_DIR.mkdir(parents=True, exist_ok=True)
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)

    cmd = [
        *pyinstaller_cmd,
        "--onefile",
        "--clean",
        "--noconfirm",
        "--distpath",
        str(BIN_DIR),
        "--workpath",
        str(BUILD_DIR / "build"),
        "--specpath",
        str(BUILD_DIR / "spec"),
        "--name",
        output_name,
        str(SOURCE),
    ]

    subprocess.run(cmd, cwd=ROOT, check=True)
    binary_path = BIN_DIR / output_name
    if sys.platform.startswith("win"):
        binary_path = binary_path.with_suffix(".exe")
    print(f"Built sidecar: {binary_path}")


if __name__ == "__main__":
    main()
