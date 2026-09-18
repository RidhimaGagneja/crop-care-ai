"""Safe startup wrapper for the CropCare AI FastAPI backend.

- Picks host: prefers 127.0.0.1 to avoid WinError 10013 socket permission issues
  that occur with 0.0.0.0 on locked-down Windows sandboxes.
- Auto-fallback: starts on 8000 first; if that's taken, moves to 8001.
- Prepends the local ``vendor/`` folder to sys.path before importing anything
  from the app, so ``uvicorn``/``python-multipart`` installed via
  ``pip install --target vendor`` are used consistently.
"""

from __future__ import annotations

import os
import socket
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
VENDOR_DIR = BACKEND_DIR / "vendor"
if VENDOR_DIR.is_dir():
    vendor_str = os.fspath(VENDOR_DIR)
    if vendor_str not in sys.path:
        sys.path.insert(0, vendor_str)
if os.fspath(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, os.fspath(BACKEND_DIR))


def port_is_free(host: str, port: int) -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((host, port))
    except OSError:
        return False
    finally:
        try:
            s.close()
        except OSError:
            pass
    return True


def pick_host() -> str:
    # 0.0.0.0 can trigger WinError 10013 on locked-down Windows boxes.
    for host in ("127.0.0.1", "0.0.0.0"):
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            s.bind((host, 0))
            s.close()
            return host
        except OSError:
            continue
    return "127.0.0.1"


def pick_port(host: str, preferred: int = 8000, fallback: int = 8001) -> int:
    if port_is_free(host, preferred):
        return preferred
    if port_is_free(host, fallback):
        return fallback
    raise RuntimeError(
        f"Neither port {preferred} nor {fallback} are free on {host}. "
        f"Free a port or edit run_backend.py and add more fallbacks."
    )


def main() -> None:
    import uvicorn

    host = pick_host()
    port = pick_port(host)
    print(f"[run_backend] Starting CropCare AI FastAPI on http://{host}:{port}")
    uvicorn.run("main:app", host=host, port=port, log_level="info", access_log=True)


if __name__ == "__main__":
    main()
