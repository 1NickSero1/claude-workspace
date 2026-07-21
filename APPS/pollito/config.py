"""Configuracion central: modelo de LLM, herramientas y manejo de la API key."""
import os
import sys
from pathlib import Path
from typing import Optional

APP_NAME = "Pollito"

# Claude Sonnet 5: buen balance costo/calidad, con herramienta de busqueda
# web nativa server-side (las 5 skills la necesitan - respuesta a pregunta 3).
MODEL_ID = "claude-sonnet-5"

# Tope de tokens de salida por respuesta. Conservador: es un chat personal,
# no necesita respuestas de miles de tokens.
MAX_TOKENS_RESPUESTA = 2048

# Herramienta de busqueda web server-side (Anthropic). La variante _20260209
# soporta "dynamic filtering" (Claude filtra resultados con codigo antes de
# que lleguen al contexto) y esta soportada por Sonnet 5. No requiere beta
# header ni ejecucion del lado cliente - Anthropic la corre por su cuenta.
WEB_SEARCH_TOOL = {
    "type": "web_search_20260209",
    "name": "web_search",
    "max_uses": 5,  # tope de busquedas por turno, control de costo adicional
}

# Effort bajo: reduce la profundidad de razonamiento y el gasto de tokens por
# respuesta. Va anidado en output_config, no como parametro top-level.
OUTPUT_CONFIG = {"effort": "low"}

# En Sonnet 5, si no se manda "thinking", el modelo corre en modo adaptive
# (pensamiento activado) por defecto - no es "sin pensar". Se desactiva
# explicitamente para no gastar tokens de mas en un chat de uso cotidiano.
# Si en el futuro se prefieren respuestas mas razonadas a costa de mas gasto,
# cambiar a {"type": "adaptive"}.
THINKING_CONFIG = {"type": "disabled"}

# Limite de mensajes por sesion como control de gasto adicional (pregunta 6).
LIMITE_MENSAJES_SESION = 50

# Limite de gasto diario en tokens (pregunta 6): 20% de la base diaria del
# usuario. LIMITE_TOKENS_DIARIOS_TOTAL = 100_000 confirmado por el usuario
# (default conservador) -> tope real de 20_000 tokens/dia.
LIMITE_TOKENS_DIARIOS_TOTAL = 100_000
LIMITE_TOKENS_DIARIOS = int(LIMITE_TOKENS_DIARIOS_TOTAL * 0.20)


def get_base_path() -> Path:
    """Ruta base del proyecto. Funciona tanto en desarrollo como empaquetado
    con PyInstaller --onefile, que extrae los recursos a una carpeta temporal
    referenciada en sys._MEIPASS. Nunca usar rutas absolutas quemadas."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).parent


def get_api_key() -> Optional[str]:
    """La key es la del usuario y va embebida en el .exe compilado (pregunta
    5): vive en secreto.py, un archivo local que esta en .gitignore y que
    PyInstaller bundlea automaticamente al compilar por ser un import Python
    normal. Nunca se pide ni se acepta pegada en el chat de Claude Code. Si
    secreto.py no existe todavia (checkout limpio antes de crearlo), cae a
    la variable de entorno POLLITO_API_KEY para no bloquear el desarrollo."""
    try:
        from secreto import API_KEY
        return API_KEY
    except ImportError:
        return os.environ.get("POLLITO_API_KEY")
