"""Control de gasto mensual en USD - limite de seguridad de gasto.

Guarda el gasto acumulado del mes en un archivo dentro de la carpeta de datos
del usuario (%APPDATA%), no en la carpeta de la app: con PyInstaller --onefile
la app se extrae a una carpeta temporal distinta cada vez que se abre, asi que
guardar el conteo ahi lo borraria en cada arranque.
"""
import json
import os
import threading
from datetime import date
from pathlib import Path

from config import (
    LIMITE_GASTO_MENSUAL_USD,
    PRECIO_CACHE_ESCRITURA_POR_MTOK,
    PRECIO_CACHE_LECTURA_POR_MTOK,
    PRECIO_INPUT_POR_MTOK,
    PRECIO_OUTPUT_POR_MTOK,
)

# Protege contra dos llamadas a registrar_uso() casi simultaneas (ej. una
# respuesta larga en curso y otra que arranca) - sin este lock, ambas pueden
# leer el mismo valor viejo y pisarse la actualizacion, subcontando el gasto
# real del mes.
_lock_uso = threading.Lock()


def _ruta_archivo_uso() -> Path:
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "Trade"
    base.mkdir(parents=True, exist_ok=True)
    return base / "uso_mensual.json"


def _mes_actual() -> str:
    hoy = date.today()
    return f"{hoy.year:04d}-{hoy.month:02d}"


def _leer_estado() -> dict:
    ruta = _ruta_archivo_uso()
    mes = _mes_actual()
    if not ruta.exists():
        return {"mes": mes, "gasto_usd": 0.0}
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {"mes": mes, "gasto_usd": 0.0}
    if datos.get("mes") != mes:
        return {"mes": mes, "gasto_usd": 0.0}
    return datos


def _guardar_estado(estado: dict) -> None:
    _ruta_archivo_uso().write_text(json.dumps(estado), encoding="utf-8")


def calcular_costo_usd(
    tokens_entrada: int,
    tokens_salida: int,
    tokens_cache_escritura: int = 0,
    tokens_cache_lectura: int = 0,
) -> float:
    """Convierte los tokens de una llamada a la API en costo real en USD -
    entrada, salida y los dos tipos de token de prompt caching tienen precio
    distinto cada uno, por eso hace falta el conteo separado en vez de un
    total combinado. Los parametros de cache tienen default 0 para no
    romper llamadas viejas (una respuesta sin cache hit/miss, ej. la
    primera vez que se activa el caching en una sesion nueva)."""
    return (
        tokens_entrada * PRECIO_INPUT_POR_MTOK / 1_000_000
        + tokens_salida * PRECIO_OUTPUT_POR_MTOK / 1_000_000
        + tokens_cache_escritura * PRECIO_CACHE_ESCRITURA_POR_MTOK / 1_000_000
        + tokens_cache_lectura * PRECIO_CACHE_LECTURA_POR_MTOK / 1_000_000
    )


def gasto_disponible_este_mes() -> float:
    estado = _leer_estado()
    return max(LIMITE_GASTO_MENSUAL_USD - estado["gasto_usd"], 0.0)


def limite_alcanzado() -> bool:
    return gasto_disponible_este_mes() <= 0


def registrar_uso(
    tokens_entrada: int,
    tokens_salida: int,
    tokens_cache_escritura: int = 0,
    tokens_cache_lectura: int = 0,
) -> None:
    with _lock_uso:
        estado = _leer_estado()
        estado["gasto_usd"] += calcular_costo_usd(
            tokens_entrada, tokens_salida, tokens_cache_escritura, tokens_cache_lectura
        )
        _guardar_estado(estado)
