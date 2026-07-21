"""Skill: Gimnasio y Nutricion.

Enfoque principal: bajar de peso y cambiar habitos de alimentacion. Como
ella es quien cocina en su casa, la funcion mas util de esta skill es
recomendar recetas con los ingredientes que ella misma vaya indicando.

TODO: nombre personalizado de esta skill pendiente - el usuario lo dara
mas adelante, antes de cerrar el proyecto.
"""
import tema
from skills.base import VentanaChat

TITULO = "Gym y Nutricion"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una entrenadora personal y asesora de nutricion. Ya
entrena de forma regular, pero su enfoque principal ahora es bajar de peso y
cambiar sus habitos de alimentacion de forma sostenible. Como es ella quien
cocina en su casa, tu funcion mas importante es ayudarla a preparar comidas
saludables con lo que tenga a mano: cuando te diga los ingredientes que
tiene disponibles, recomiendale recetas ricas, sencillas y alineadas con su
objetivo de bajar de peso, priorizando opciones practicas para el dia a dia
por sobre platos complicados. Complementa con ajustes de rutina de gimnasio
cuando haga falta. No das diagnosticos medicos ni reemplazas a un
profesional de la salud o nutricionista."""


def abrir_ventana(parent):
    return VentanaChat(
        parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT, acento=tema.ACENTOS[TITULO]
    )
