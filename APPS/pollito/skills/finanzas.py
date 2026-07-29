"""Skill: Finanzas personales.

Se mantiene generica en el system prompt (a diferencia de las otras 4
skills, que arrancan con detalles reales de ella) por no haberse pedido al
usuario informacion economica de su novia por ser sensible. Ahora si tiene
memoria persistente igual que las demas, a pedido del usuario, pero de forma
reactiva: solo guarda lo que ella misma comparta en la conversacion, nunca
lo pide de forma insistente ni asume datos.

TODO: nombre personalizado de esta skill pendiente - el usuario lo dara
mas adelante, antes de cerrar el proyecto.
"""
import tema
from config import MEMORY_TOOL, WEB_SEARCH_TOOL
from skills.base import VistaChat, construir_intro_bienvenida
from skills.memoria import crear_manejador_memoria

TITULO = "Finanzas"  # TODO: reemplazar por nombre personalizado

# Primer mensaje que ve Sofi al entrar a la vista, como si la skill le
# hablara primero (ver skills/base.py).
BIENVENIDA = construir_intro_bienvenida(TITULO) + (
    "Te ayudo a organizar tus ingresos y gastos, fijar metas de ahorro y "
    "tomar decisiones practicas de dinero del dia a dia. ¿En que te ayudo "
    "hoy?"
)

SYSTEM_PROMPT = """Eres una asistente de presupuesto y finanzas personales.
Ayudas a organizar ingresos y gastos, fijar metas de ahorro y tomar
decisiones practicas de dinero del dia a dia. Se clara y concreta, sin
tecnicismos innecesarios.

Antes de afirmar datos concretos (tasas de interes, productos financieros,
normativa), usa la busqueda web para verificarlo en vez de responder solo de
memoria.

Tenes memoria persistente entre conversaciones (directorio /memories). Al
empezar cada conversacion, revisa primero que hay guardado ahi para recordar
sus metas de ahorro y lo que ya te haya contado sobre sus ingresos o gastos
- no le vuelvas a preguntar cosas que ya te conto. Guarda en /memories solo
lo que ella misma comparta de forma espontanea en la conversacion: nunca le
pidas datos economicos de forma insistente ni asumas cifras que no te dio.

La persona que usa esta app es Sofi - toda la memoria que guardes es sobre
ella especificamente. Si en algun momento la conversacion no parece ser con
ella (quien te escribe se identifica como otra persona, o lo que cuenta no
encaja con lo que ya sabes de ella), no lo guardes como si fuera de Sofi para
no mezclar su informacion con la de alguien mas."""


def crear_vista(parent, volver):
    return VistaChat(
        parent,
        titulo=TITULO,
        system_prompt=SYSTEM_PROMPT,
        volver=volver,
        tools=[WEB_SEARCH_TOOL, MEMORY_TOOL],
        acento=tema.ACENTOS[TITULO],
        manejador_herramienta_cliente=crear_manejador_memoria("finanzas"),
        mensaje_bienvenida=BIENVENIDA,
    )
