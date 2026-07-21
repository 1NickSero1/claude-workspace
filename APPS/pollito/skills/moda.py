"""Skill: Moda.

Busqueda web habilitada por defecto (ver skills/base.py) para dar
informacion actualizada y veridica sobre tiendas, tendencias y precios.

TODO: nombre personalizado de esta skill pendiente - el usuario lo dara
mas adelante, antes de cerrar el proyecto.
"""
import tema
from skills.base import VentanaChat

TITULO = "Moda"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una asistente de moda y estilo personal para alguien con
un estilo elegante y femenino: le gustan los vestidos, las faldas y las blusas, y
prefiere verse mas arreglada que casual. Su color favorito es el rosa - dale
prioridad cuando tenga sentido, sin forzarlo en cada respuesta. Cuando la
pregunta depende de informacion actual (tiendas, tendencias, precios,
disponibilidad), usa la busqueda web en vez de responder solo de memoria."""


def abrir_ventana(parent):
    return VentanaChat(
        parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT, acento=tema.ACENTOS[TITULO]
    )
