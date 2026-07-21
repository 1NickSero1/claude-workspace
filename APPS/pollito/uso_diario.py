"""Control de uso diario de tokens - limite de seguridad de gasto (pregunta 6).

Guarda el conteo de tokens usados por dia en un archivo dentro de la carpeta
de datos del usuario (%APPDATA%), no en la carpeta de la app: con
PyInstaller --onefile la app se extrae a una carpeta temporal distinta cada
vez que se abre, asi que guardar el conteo ahi lo borraria en cada arranque.
"""
import json
import os
from datetime import date
from pathlib import Path

from config import LIMITE_TOKENS_DIARIOS


def _ruta_archivo_uso() -> Path:
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "Pollito"
    base.mkdir(parents=True, exist_ok=True)
    return base / "uso_diario.json"


def _leer_estado() -> dict:
    ruta = _ruta_archivo_uso()
    hoy = str(date.today())
    if not ruta.exists():
        return {"fecha": hoy, "tokens_usados": 0}
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"fecha": hoy, "tokens_usados": 0}
    if datos.get("fecha") != hoy:
        return {"fecha": hoy, "tokens_usados": 0}
    return datos


def _guardar_estado(estado: dict) -> None:
    _ruta_archivo_uso().write_text(json.dumps(estado), encoding="utf-8")


def tokens_disponibles_hoy() -> int:
    estado = _leer_estado()
    return max(LIMITE_TOKENS_DIARIOS - estado["tokens_usados"], 0)


def limite_alcanzado() -> bool:
    return tokens_disponibles_hoy() <= 0


def registrar_uso(tokens_usados_en_esta_llamada: int) -> None:
    estado = _leer_estado()
    estado["tokens_usados"] += tokens_usados_en_esta_llamada
    _guardar_estado(estado)
