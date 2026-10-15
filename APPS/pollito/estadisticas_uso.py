"""Estadisticas de uso real por skill (aperturas y mensajes enviados).

Igual que uso_mensual.py, guarda el estado en la carpeta de datos del
usuario (%APPDATA%), no en la carpeta de la app: con PyInstaller --onefile
la app se extrae a una carpeta temporal distinta cada vez que se abre, asi
que guardar el conteo ahi lo borraria en cada arranque.

No mide costo ni gasto (ver uso_mensual.py para eso) - esto es solo para que
el usuario pueda ver cuanto se usa cada skill en la practica, sin depender
de que se lo cuenten de memoria (ver ver_estadisticas.py).
"""
import json
import os
import threading
from datetime import datetime
from pathlib import Path

# Mismo motivo que uso_mensual.py:_lock_uso - las 5 skills pueden estar
# registrando aperturas/mensajes en paralelo (una por hilo de UI/API), sin
# este lock dos escrituras casi simultaneas pueden pisarse el conteo.
_lock_estadisticas = threading.Lock()


def _ruta_archivo_estadisticas() -> Path:
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "Pollito"
    base.mkdir(parents=True, exist_ok=True)
    return base / "estadisticas_uso.json"


def _leer_estado() -> dict:
    ruta = _ruta_archivo_estadisticas()
    if not ruta.exists():
        return {}
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    return datos if isinstance(datos, dict) else {}


def _guardar_estado(estado: dict) -> None:
    _ruta_archivo_estadisticas().write_text(json.dumps(estado), encoding="utf-8")


def _actualizar_skill(nombre_skill: str, campo_contador: str) -> None:
    ahora = datetime.now().isoformat()
    with _lock_estadisticas:
        estado = _leer_estado()
        entrada = estado.setdefault(
            nombre_skill,
            {"aperturas": 0, "mensajes": 0, "primer_uso": ahora, "ultimo_uso": ahora},
        )
        entrada[campo_contador] = entrada.get(campo_contador, 0) + 1
        entrada.setdefault("primer_uso", ahora)
        entrada["ultimo_uso"] = ahora
        _guardar_estado(estado)


def registrar_apertura(nombre_skill: str) -> None:
    _actualizar_skill(nombre_skill, "aperturas")


def registrar_mensaje(nombre_skill: str) -> None:
    _actualizar_skill(nombre_skill, "mensajes")


def leer_estadisticas() -> dict:
    return _leer_estado()
