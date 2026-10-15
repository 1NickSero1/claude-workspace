"""Tope mensual de imagenes generadas con Higgsfield (control de costo).

Mismo esquema que uso_mensual.py: contador por mes calendario guardado en
%APPDATA%/Pollito (no en la carpeta de la app), con lock porque las 5 skills
pueden estar generando a la vez desde sus hilos de API. Cada imagen consume
creditos reales de la cuenta de Higgsfield del usuario - el tope es un
freno simple por cantidad (LIMITE_IMAGENES_MENSUAL en config.py).
"""
import json
import os
import threading
from datetime import date
from pathlib import Path

from config import LIMITE_IMAGENES_MENSUAL

_lock_imagenes = threading.Lock()


def _ruta_archivo_uso() -> Path:
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "Pollito"
    base.mkdir(parents=True, exist_ok=True)
    return base / "uso_imagenes.json"


def _mes_actual() -> str:
    hoy = date.today()
    return f"{hoy.year:04d}-{hoy.month:02d}"


def _leer_estado() -> dict:
    ruta = _ruta_archivo_uso()
    mes = _mes_actual()
    if not ruta.exists():
        return {"mes": mes, "cantidad": 0}
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"mes": mes, "cantidad": 0}
    if not isinstance(datos, dict) or datos.get("mes") != mes:
        return {"mes": mes, "cantidad": 0}
    return datos


def _guardar_estado(estado: dict) -> None:
    _ruta_archivo_uso().write_text(json.dumps(estado), encoding="utf-8")


def imagenes_generadas_este_mes() -> int:
    return int(_leer_estado().get("cantidad", 0))


def limite_imagenes_alcanzado() -> bool:
    return imagenes_generadas_este_mes() >= LIMITE_IMAGENES_MENSUAL


def registrar_imagen_generada() -> None:
    with _lock_imagenes:
        estado = _leer_estado()
        estado["cantidad"] = int(estado.get("cantidad", 0)) + 1
        _guardar_estado(estado)
