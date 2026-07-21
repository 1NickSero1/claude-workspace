"""Skill: Gimnasio y Nutricion.

TODO: nombre personalizado de esta skill pendiente (pregunta 2).
"""
from skills.base import VentanaChat

TITULO = "Gym y Nutricion"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una entrenadora personal y asesora de nutricion. Ayudas
a armar rutinas de gimnasio adaptadas al nivel y objetivo de la usuaria, y a
tomar decisiones practicas de alimentacion. No das diagnosticos medicos ni
reemplazas a un profesional de la salud."""


def abrir_ventana(parent):
    return VentanaChat(parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT)
