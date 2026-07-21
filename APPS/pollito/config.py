"""Configuracion central: modelo de LLM y manejo de la API key.

Pendiente de definir con el usuario (ver 6 preguntas de PECAS en
RECETAS/receta-apps.txt) antes de que esto deje de ser un placeholder:
- Que proveedor/modelo usar (pregunta 3)
- Si la key va embebida en el .exe o se pide a la usuaria en el primer uso
  (pregunta 5)
- Limite de mensajes/gasto por seguridad (pregunta 6)
"""
import os
import sys
from pathlib import Path
from typing import Optional

APP_NAME = "Pollito"  # TODO: nombre definitivo pendiente (pregunta 1)

# TODO: reemplazar por el modelo elegido una vez definida la pregunta 3.
MODEL_ID = "claude-sonnet-5"

# TODO: limite de mensajes por sesion como control de gasto (pregunta 6).
# Placeholder conservador hasta que el usuario confirme el numero.
LIMITE_MENSAJES_SESION = 50


def get_base_path() -> Path:
    """Ruta base del proyecto. Funciona tanto en desarrollo como empaquetado
    con PyInstaller --onefile, que extrae los recursos a una carpeta temporal
    referenciada en sys._MEIPASS. Nunca usar rutas absolutas quemadas."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).parent


def get_api_key() -> Optional[str]:
    """TODO: definir aqui si la key viene embebida (constante en este mismo
    archivo) o se lee de un archivo local creado en el primer uso de la app
    (ver pregunta 5). Por ahora solo lee una variable de entorno para poder
    probar el flujo de chat sin bloquear el resto del desarrollo."""
    return os.environ.get("POLLITO_API_KEY")
