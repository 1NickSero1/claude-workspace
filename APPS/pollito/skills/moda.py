"""Skill: Moda.

Requiere busqueda web real (requisito explicito del prompt inicial). TODO:
al conectar la API elegida en la pregunta 3, habilitar aqui la herramienta
de busqueda web correspondiente a ese proveedor (por ejemplo, el server tool
web_search de la API de Anthropic) para que esta skill pueda buscar tiendas,
tendencias y precios actuales en vez de responder solo de memoria.

TODO: nombre personalizado de esta skill pendiente (pregunta 2).
"""
from skills.base import VentanaChat

TITULO = "Moda"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una asistente de moda y estilo personal. Ayudas a
encontrar ropa segun el estilo, los gustos y la ocasion de la usuaria. Cuando
la pregunta depende de informacion actual (tiendas, tendencias, precios,
disponibilidad), usa la busqueda web en vez de responder solo de memoria."""

# Marcador para la skill de moda: distingue esta ventana de las demas cuando
# se conecte la API real y haya que decidir que herramientas habilitar.
NECESITA_WEB_SEARCH = True


def abrir_ventana(parent):
    return VentanaChat(parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT)
