"""Skill: Finanzas personales.

Se mantiene generica en el system prompt (a diferencia de las otras 4
skills, que arrancan con detalles reales de ella) por no haberse pedido al
usuario informacion economica de su novia por ser sensible. Ahora si tiene
memoria persistente igual que las demas, a pedido del usuario, pero de forma
reactiva: solo guarda lo que ella misma comparta en la conversacion, nunca
lo pide de forma insistente ni asume datos.

Tambien se conecta con su excel real de finanzas (boton "📊", ver
finanzas_excel.py) - una vez conectado, Monito lee su estado financiero real
y anota los gastos que ella le cuente, para que ella nunca tenga que tocar
el archivo a mano.
"""
from pathlib import Path
from tkinter import filedialog

import tema
from config import MEMORY_TOOL, WEB_SEARCH_TOOL
from finanzas_excel import EXCEL_FINANZAS_TOOL, crear_manejador_excel, fijar_archivo_actual, validar_formato
from skills.base import VistaChat, construir_intro_bienvenida
from skills.memoria import crear_manejador_memoria

TITULO = "Monito"

# Primer mensaje que ve Sofi al entrar a la vista, como si la skill le
# hablara primero (ver skills/base.py).
BIENVENIDA = construir_intro_bienvenida(TITULO) + (
    "Te ayudo a organizar tus ingresos y gastos, fijar metas de ahorro y "
    "tomar decisiones practicas de dinero del dia a dia. Si queres que "
    "lleve tu excel de finanzas por vos, toca el boton \"📊\" de arriba y "
    "elegilo una vez - de ahi en mas yo lo leo y lo actualizo. ¿En que te "
    "ayudo hoy?"
)

SYSTEM_PROMPT = """Eres una asistente de presupuesto y finanzas personales.
Ayudas a organizar ingresos y gastos, fijar metas de ahorro y tomar
decisiones practicas de dinero del dia a dia. Se clara y concreta, sin
tecnicismos innecesarios.

Antes de afirmar datos concretos (tasas de interes, productos financieros,
normativa), usa la busqueda web para verificarlo en vez de responder solo de
memoria.

Tenes una herramienta (excel_finanzas) conectada al excel real de sus
finanzas (hojas RESUMEN/GASTOS/TARJETA/DEUDAS) - ella NUNCA edita ese archivo
a mano, todo pasa por vos:
- Antes de responder cualquier pregunta sobre su plata real (cuanto le
  queda, cuanto gasto, cuanto debe), usa 'leer_estado' primero - nunca
  inventes ni asumas numeros de memoria.
- Cada vez que te cuente un gasto nuevo ("gaste tanto en tal cosa"), anotalo
  con 'anotar_gasto' sin que ella tenga que pedirtelo explicitamente -
  confirmale despues en el chat que quedo anotado.
- Si te dice cuanto gano/cobro este mes, usa 'fijar_ingreso_mes'.
- Si te pide armar el archivo de un mes nuevo (ej. "creame el archivo de
  septiembre"), usa 'crear_archivo_mes' - si no te dio el ingreso de ese mes
  todavia, pregintaselo despues de crearlo (la herramienta te avisa si falta).
- Si la herramienta responde que no hay ningun excel conectado, decile que
  toque el boton "📊" (arriba del cuadro de mensaje) para elegirlo - no se
  puede hacer desde el chat.

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


def _conectar_excel(vista):
    """Comando del boton "📊" - corre en el hilo principal (click real de
    Sofi), a diferencia del manejador de la herramienta que corre en el
    hilo de la API, por eso el filedialog vive aca y no en
    finanzas_excel.py."""
    ruta_str = filedialog.askopenfilename(
        title="Elegi tu excel de finanzas",
        filetypes=[("Excel", "*.xlsx")],
    )
    if not ruta_str:
        return

    ruta = Path(ruta_str)
    try:
        validar_formato(ruta)
    except (ValueError, OSError) as error:
        vista._agregar_mensaje("Sistema", "Ese archivo no sirve: {}".format(error))
        return

    fijar_archivo_actual(ruta)
    vista._agregar_mensaje("Sistema", "Excel conectado: {}. Ya puedo leerlo y anotar ahi.".format(ruta.name))


def crear_vista(parent, volver):
    return VistaChat(
        parent,
        titulo=TITULO,
        system_prompt=SYSTEM_PROMPT,
        volver=volver,
        tools=[WEB_SEARCH_TOOL, MEMORY_TOOL, EXCEL_FINANZAS_TOOL],
        acento=tema.ACENTOS[TITULO],
        manejadores_herramientas_cliente={
            "memory": crear_manejador_memoria("finanzas"),
            "excel_finanzas": crear_manejador_excel(),
        },
        mensaje_bienvenida=BIENVENIDA,
        boton_extra_texto="📊",
        boton_extra_comando=_conectar_excel,
    )
