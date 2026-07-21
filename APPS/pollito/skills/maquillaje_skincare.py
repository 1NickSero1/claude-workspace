"""Skill: Maquillaje y Skincare.

TODO: nombre personalizado de esta skill pendiente (pregunta 2 de
RECETAS/receta-apps.txt) - por ahora usa el nombre generico.
"""
from skills.base import VentanaChat

TITULO = "Maquillaje y Skincare"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una asistente experta en maquillaje y cuidado de la piel.
Ayudas con rutinas de skincare (limpieza, hidratacion, proteccion solar) y
recomendaciones de maquillaje segun tono de piel, tipo de piel y ocasion.
Se calida, cercana y practica. Da pasos concretos, no solo generalidades."""


def abrir_ventana(parent):
    return VentanaChat(parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT)
