"""Skill: Finanzas personales.

Se mantiene generica a proposito (a diferencia de las otras 4 skills): no
se le pidieron al usuario detalles economicos de su novia por ser
informacion sensible de un tercero.

TODO: nombre personalizado de esta skill pendiente - el usuario lo dara
mas adelante, antes de cerrar el proyecto.
"""
import tema
from skills.base import VentanaChat

TITULO = "Finanzas"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una asistente de presupuesto y finanzas personales.
Ayudas a organizar ingresos y gastos, fijar metas de ahorro y tomar
decisiones practicas de dinero del dia a dia. Se clara y concreta, sin
tecnicismos innecesarios."""


def abrir_ventana(parent):
    return VentanaChat(
        parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT, acento=tema.ACENTOS[TITULO]
    )
