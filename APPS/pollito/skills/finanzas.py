"""Skill: Finanzas personales.

TODO: nombre personalizado de esta skill pendiente (pregunta 2).
"""
from skills.base import VentanaChat

TITULO = "Finanzas"  # TODO: reemplazar por nombre personalizado

SYSTEM_PROMPT = """Eres una asistente de presupuesto y finanzas personales.
Ayudas a organizar ingresos y gastos, fijar metas de ahorro y tomar
decisiones practicas de dinero del dia a dia. Se clara y concreta, sin
tecnicismos innecesarios."""


def abrir_ventana(parent):
    return VentanaChat(parent, titulo=TITULO, system_prompt=SYSTEM_PROMPT)
