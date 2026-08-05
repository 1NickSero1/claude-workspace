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

# Herramienta de memoria (cliente): usada por las 5 skills para que "la
# vayan conociendo" entre sesiones, cada una en su propia carpeta - el
# manejador real vive en skills/memoria.py.
MEMORY_TOOL = {"type": "memory_20250818", "name": "memory"}

# En Sonnet 5, si no se manda "thinking", el modelo corre en modo adaptive
# (pensamiento activado) por defecto - no es "sin pensar". Se desactiva
# explicitamente para no gastar tokens de mas en un chat de uso cotidiano.
# Si en el futuro se prefieren respuestas mas razonadas a costa de mas gasto,
# cambiar a {"type": "adaptive"}.
THINKING_CONFIG = {"type": "disabled"}

# NO hay control de "effort" (output_config={"effort": "low"}) en este
# proyecto - el paquete "anthropic" real de PyPI que soporta ese parametro
# requiere Python >=3.9, y el proyecto esta fijado a Python 3.8 a proposito
# (compatibilidad con Windows 7, ver ajustes pollito.txt). La ultima version
# de "anthropic" instalable en Python 3.8 (0.72.0 al 2026-07-22) no acepta
# output_config en messages.create() - mandarlo tira un TypeError local
# ("unexpected keyword argument") antes de llegar siquiera a la red. Si el
# proyecto alguna vez suelta el requisito de Windows 7 y sube a Python 3.9+,
# se puede reinstalar la version mas nueva de anthropic y agregar effort de
# vuelta.

# Limite de mensajes por sesion como control de gasto adicional (pregunta 6).
LIMITE_MENSAJES_SESION = 50

# Limite de gasto mensual en USD (pregunta 6, actualizado 2026-07-31 - antes
# era un tope diario de tokens; se cambio a un tope directo en dolares por
# mes calendario, mas facil de razonar ("$5 maximo por mes") y no depende de
# cuantos tokens entren en cada mensaje.
LIMITE_GASTO_MENSUAL_USD = 5.00

# Precio de Sonnet 5 por millon de tokens, usado para calcular el gasto real
# de cada llamada. Precio ESTANDAR (no el de lanzamiento $2/$10 que vence el
# 2026-08-31) - asi el tope no queda corto apenas termine la promo.
PRECIO_INPUT_POR_MTOK = 3.00
PRECIO_OUTPUT_POR_MTOK = 15.00

# Precios de prompt caching (ephemeral, TTL de 5 minutos - el default de la
# API si no se manda "ttl" explicito en cache_control, ver skills/base.py).
# Escribir en el cache sale mas caro que un input normal (1.25x), pero
# leerlo de ahi en el siguiente mensaje de la misma conversacion sale casi
# gratis (0.1x) - se usa para no repagar el system prompt, las tools y el
# historial ya enviado en cada mensaje nuevo del chat.
PRECIO_CACHE_ESCRITURA_POR_MTOK = PRECIO_INPUT_POR_MTOK * 1.25
PRECIO_CACHE_LECTURA_POR_MTOK = PRECIO_INPUT_POR_MTOK * 0.1


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
