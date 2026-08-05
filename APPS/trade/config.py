"""Configuracion central: modelo de LLM, herramientas, presupuesto y
contenido del chat de Trade.
"""
import os
import sys
from pathlib import Path
from typing import Optional

# TODO: nombre definitivo de la app (placeholder, mismo patron que Pollito
# arranco generico y se personalizo despues) - lo mismo aplica al mensaje de
# bienvenida especial que Pollito tiene en main.py (ver
# MENSAJE_BIENVENIDA_ESPECIAL alla) y que aca todavia no existe: falta
# definir con el usuario la ocasion/motivo del regalo para Sebas.
APP_NAME = "Trade"
NOMBRE_USUARIO = "Sebas"

MODEL_ID = "claude-sonnet-5"

# Tope de tokens de salida por respuesta - conservador, mismo criterio que
# Pollito (chat personal, no necesita respuestas de miles de tokens).
MAX_TOKENS_RESPUESTA = 2048

# El trading necesita precios/noticias actualizados con mas frecuencia que
# las skills de Pollito - mismo mecanismo de busqueda web server-side, sin
# tocar max_uses todavia (riesgo ya advertido al usuario: es probable que
# los $10 de presupuesto duren menos que los $5 de Pollito, justamente por
# esto - ver LIMITE_GASTO_MENSUAL_USD mas abajo).
WEB_SEARCH_TOOL = {
    "type": "web_search_20260209",
    "name": "web_search",
    "max_uses": 5,
}

# Herramienta de memoria (cliente) - el manejador real vive en memoria.py.
# A diferencia de Pollito (una carpeta de memoria por cada una de sus 5
# skills), aca hay una sola carpeta: esta app es una unica skill.
MEMORY_TOOL = {"type": "memory_20250818", "name": "memory"}

# Herramientas de la bitacora de trading (cliente) - los manejadores reales
# viven en bitacora.py. A diferencia de MEMORY_TOOL (lo que Trade recuerda
# de Sebas, privado e interno), estas escriben archivos que Sebas puede
# abrir el mismo (Excel + resumenes en texto en su Escritorio).
REGISTRAR_OPERACION_TOOL = {
    "name": "registrar_operacion",
    "description": (
        "Registra una operacion de trading YA CERRADA (con resultado en "
        "USD) en la bitacora de Sebas: agrega una fila al Excel de "
        "operaciones (que recalcula balances diario/semanal/mensual y por "
        "operativa) y una linea al resumen del dia. Usala cuando Sebas "
        "cuente una operacion cerrada con al menos mercado, tipo y "
        "resultado. Si la operacion todavia esta abierta (sin resultado "
        "todavia), NO uses esta herramienta - usa agregar_nota_bitacora en "
        "su lugar y registrala aca recien cuando cierre."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "fecha": {
                "type": "string",
                "description": "Fecha de la operacion en formato YYYY-MM-DD. Si Sebas no la menciona, se usa la fecha de hoy - no preguntes por esto salvo que este cargando algo de un dia anterior.",
            },
            "mercado": {
                "type": "string",
                "description": "Activo operado, ej. EUR/USD, BTC/USDT, AAPL.",
            },
            "operativa": {
                "type": "string",
                "description": "Estrategia o setup usado, ej. 'ruptura de rango', 'pullback a media movil'. Si Sebas no la menciona, dejalo vacio.",
            },
            "tipo": {
                "type": "string",
                "enum": ["Long", "Short"],
                "description": "Direccion de la operacion.",
            },
            "entrada": {"type": "number", "description": "Precio de entrada, si lo menciona."},
            "salida": {"type": "number", "description": "Precio de salida, si lo menciona."},
            "tamano": {
                "type": "number",
                "description": "Tamano de la posicion (lotes, unidades, o USD arriesgados - lo que Sebas te de).",
            },
            "resultado_usd": {
                "type": "number",
                "description": "Ganancia o perdida en USD. Negativo si fue perdida. Obligatorio.",
            },
            "resultado_r": {
                "type": "number",
                "description": "Resultado en multiplos de R (relacion riesgo/beneficio), si Sebas lo menciona o se puede inferir de sus datos.",
            },
            "notas": {
                "type": "string",
                "description": "Contexto relevante: por que entro, como se sintio, que aprendio.",
            },
        },
        "required": ["resultado_usd"],
    },
}

CALCULAR_TAMANO_POSICION_TOOL = {
    "name": "calcular_tamano_posicion",
    "description": (
        "Calcula de forma exacta y deterministica (no de memoria ni estimado) el tamano de "
        "posicion y el riesgo en USD para una entrada, a partir del balance de cuenta, el % de "
        "riesgo, el precio de entrada y el stop-loss. Usala SIEMPRE que Sebas este por entrar a "
        "una operacion y quiera saber cuanto arriesgar o que tamano usar - en especial cuando "
        "hable con alta conviccion, que es justo el momento en que historicamente se salteo este "
        "calculo (llego a arriesgar mas del 50% de una cuenta por exceso de confianza). Si Sebas "
        "no menciona el % de riesgo, pasa 1 (su regla habitual de 1% por operacion) en vez de "
        "preguntarselo o dejarlo vacio."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "balance_cuenta": {
                "type": "number",
                "description": (
                    "Balance actual de la cuenta en USD. Si Sebas ya lo compartio antes en la "
                    "conversacion, usa ese valor (deberia estar en tu memoria) en vez de volver "
                    "a preguntarlo."
                ),
            },
            "riesgo_porcentaje": {
                "type": "number",
                "description": (
                    "Porcentaje del balance a arriesgar en esta operacion. Si Sebas no lo "
                    "menciona, usa 1 (su regla habitual de 1% por operacion) - no lo dejes vacio "
                    "ni lo preguntes salvo que el mismo diga que quiere arriesgar otro %."
                ),
            },
            "precio_entrada": {"type": "number", "description": "Precio de entrada planeado."},
            "stop_loss": {
                "type": "number",
                "description": "Precio de stop-loss planeado. Tiene que ser distinto al precio de entrada.",
            },
            "take_profit": {
                "type": "number",
                "description": (
                    "Precio de take-profit planeado, si Sebas lo tiene definido - se usa para "
                    "calcular la relacion riesgo/beneficio. Opcional."
                ),
            },
        },
        "required": ["balance_cuenta", "precio_entrada", "stop_loss"],
    },
}

AGREGAR_NOTA_BITACORA_TOOL = {
    "name": "agregar_nota_bitacora",
    "description": (
        "Agrega una linea libre al resumen del dia de Sebas en su "
        "bitacora - para cualquier cosa que valga la pena anotar y que NO "
        "sea una operacion cerrada: reflexiones de psicologia, planes, "
        "operaciones todavia abiertas, o simplemente 'hoy no opere pero...'. "
        "Si Sebas describe una operacion ya cerrada con resultado, usa "
        "registrar_operacion en vez de esta."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "nota": {
                "type": "string",
                "description": "El texto de la nota a guardar, en las palabras de Sebas o resumido por vos.",
            },
        },
        "required": ["nota"],
    },
}

# Sin thinking activado por defecto, mismo criterio de costo que Pollito.
THINKING_CONFIG = {"type": "disabled"}

LIMITE_MENSAJES_SESION = 50

# Tope de prueba acordado con el usuario (2026-08-02): $10/mes para
# arrancar, con la idea de que mas adelante Sebas recargue su propia key en
# vez de depender de la del usuario indefinidamente (mismo patron iterativo
# que los $5/mes de Pollito).
LIMITE_GASTO_MENSUAL_USD = 10.00

PRECIO_INPUT_POR_MTOK = 3.00
PRECIO_OUTPUT_POR_MTOK = 15.00

# Precios de prompt caching. main.py usa ttl="1h" (no el default de 5 min)
# para el cache del system+tools - ver _SYSTEM_CACHEADO alla - por eso la
# escritura se tarifa al multiplicador de 1h (2x el precio de input normal)
# y no al de 5 min (1.25x). Lectura (cache hit) sale 0.1x en cualquiera de
# los dos TTL - multiplicadores publicados por Anthropic para Sonnet, no
# numeros inventados (verificado ademas con una llamada real: la API separo
# el gasto en usage.cache_creation.ephemeral_1h_input_tokens).
PRECIO_CACHE_ESCRITURA_POR_MTOK = PRECIO_INPUT_POR_MTOK * 2.0
PRECIO_CACHE_LECTURA_POR_MTOK = PRECIO_INPUT_POR_MTOK * 0.1

BIENVENIDA = (
    f"Hola {NOMBRE_USUARIO} - soy tu copiloto de trading e inversion. Te "
    "ayudo a pensar el analisis de mercado, la gestion de riesgo y a "
    "mantener la cabeza fria a la hora de operar. ¿En que estas mirando hoy?"
)

# Perfil real de Sebas, cargado desde TRADING/sebas.md (test diagnostico de
# la skill TRADE, sesion 2026-08-02/03 - Bloques 1 y 2 completos, todavia
# pendiente profundizar margen/zona de liquidez/binarias). Mismo criterio
# que las skills personalizadas de Pollito: detalles reales en el system
# prompt en vez de generico. Si el diagnostico avanza mas bloques o algo
# cambia, volver a leer TRADING/sebas.md y actualizar esto a mano - no hay
# sincronizacion automatica entre los dos archivos.
# NUNCA usar TRADING/nico.md como fuente aca - es el perfil privado del
# propio usuario para su coaching personal, no tiene nada que ver con este
# proyecto (regla explicita del usuario, ver memoria del proyecto).
SYSTEM_PROMPT = f"""Eres un copiloto de trading e inversion para {NOMBRE_USUARIO}. Tu trabajo no
es dar señales de compra/venta ni garantizar resultados, sino ayudarlo a pensar con claridad y,
sobre todo, a cerrar la brecha entre lo que el ya sabe y lo que hace bajo presion cuando opera.

Lo que ya sabes de {NOMBRE_USUARIO} (perfil real, no generico):

- Opera principalmente forex y cripto, con acciones todavia sin explorar. Tambien opera binarias,
  pero es una debilidad que el mismo reconoce: binarias exige acertar la direccion en una sola
  vela, sin margen para estar "en lo correcto pero temprano" como en forex/spot - choca de frente
  con su estilo selectivo y paciente.
- Gestion de riesgo: normalmente es su fortaleza. Arriesga 1% por operacion, busca relacion
  riesgo/beneficio de 1:2, hace solo 5-6 operaciones al mes en zonas de alta probabilidad (calidad
  sobre cantidad), con una meta de ~10% de crecimiento mensual acumulado. PERO tiene un quiebre
  documentado: en la cuenta que quemo llego a arriesgar mas del 50% en una sola operacion, por
  exceso de confianza que le hizo saltarse el calculo del % de riesgo por completo. El momento en
  que se siente mas seguro es, paradojicamente, el de mayor riesgo real para el - prestale
  atencion especial cuando hable con alta conviccion de una entrada.
- Psicologia: tiene buena autoconciencia (identifica el sintoma de 3+ perdidas seguidas en una
  sesion como señal de alarma), pero el patron real es la brecha entre conocer la regla y
  ejecutarla bajo presion emocional - tanto por exceso de confianza como por frustracion despues
  de perder. No asumas que porque conoce la regla la va a seguir.
- Analisis tecnico basado en fractalidad y "zonas de liquidez" en temporalidades altas, con una
  definicion todavia intuitiva ("donde el precio reacciona mas fuerte") y no un criterio tecnico
  codificado - ayudalo a hacerla mas especifica y auditable cuando surja el tema.
- Ya llevaba un diario de trading informal antes de esta app - la bitacora que tiene aca (ver mas
  abajo) es literalmente la version formal de eso que el ya hacia a mano.

Prioridades de coaching, en el orden que salieron del diagnostico: (1) checklist de riesgo
obligatorio antes de cada entrada, sobre todo en las de alta conviccion; (2) una regla mecanica y
no negociable para rachas de perdidas (ej. pausa obligatoria despues de 2 perdidas seguidas); (3)
ayudarlo a codificar "zona de liquidez" en criterios especificos y verificables; (4) en algun
momento, ayudarlo a decidir si binarias tiene sentido en su mix. No le sueltes las 4 juntas de una
- dejate guiar por lo que el traiga a la conversacion.

Antes de afirmar precios, noticias o datos de mercado, usa la busqueda web
para verificarlos en vez de responder solo de memoria - en trading un dato
viejo puede ser peor que no tener el dato.

{NOMBRE_USUARIO} puede adjuntar capturas de sus propios trades (grafico con
su entrada/salida marcada, ticket de la operacion, etc.). Cuando llegue una
imagen, analizala en detalle: punto de entrada/salida, tamano de posicion si
se puede inferir, relacion riesgo/beneficio, y sobre todo si el setup y la
ejecucion tienen sentido con su perfil de arriba (¿esta operacion se ve como
su 1%/1:2 disciplinado, o como el quiebre de alta conviccion que ya quemo
una cuenta?) - no te limites a describir la imagen.

Tenes memoria persistente entre conversaciones (directorio /memories),
ADEMAS de lo que ya sabes de su perfil de arriba. Usala para lo nuevo que
vaya pasando sesion a sesion (operaciones puntuales, si esta cumpliendo o no
las prioridades de coaching, avances en codificar su criterio tecnico) - no
repitas ahi lo que ya esta en este system prompt.

Ademas de tu memoria privada, {NOMBRE_USUARIO} tiene su propia bitacora de
trading que el mismo puede abrir y leer (un Excel con sus operaciones y
balances, y un resumen de texto por dia) - son archivos DE EL, no tu
memoria interna. Cuando te cuente una operacion ya cerrada con resultado en
USD, usa la herramienta registrar_operacion para cargarla. Para cualquier
otra cosa que valga la pena anotar y no sea una operacion cerrada
(reflexiones, planes, una posicion que sigue abierta, "hoy no opere pero..."),
usa agregar_nota_bitacora. No le preguntes la fecha salvo que este cargando
algo de un dia anterior - por defecto es hoy.

Tambien tenes calcular_tamano_posicion, una herramienta de calculo exacto (no estimado de
memoria) para el tamano de posicion y el riesgo en USD de una entrada. Usala de forma proactiva
vos mismo, no solo cuando {NOMBRE_USUARIO} la pida - insisti especialmente cuando hable con alta
conviccion de una entrada, porque ese es exactamente el momento en el que en el pasado se salteo
el calculo de riesgo por completo y termino arriesgando mas del 50% de una cuenta por exceso de
confianza (ver su perfil arriba). Si no te da el % de riesgo, pasale 1 (su regla habitual de 1%
por operacion) en vez de preguntarselo. Y si en algun momento te comparte su balance de cuenta,
guardalo en tu memoria persistente para no tener que volver a pedirselo cada vez que uses la
herramienta.

Si el resultado de registrar_operacion viene con una alerta de racha de perdidas, no la dejes
pasar de largo ni sigas la conversacion como si nada: frena ahi y hablale directo del tema,
retomando la prioridad de coaching de una regla mecanica para rachas de perdidas (por ejemplo,
pausa de 15 minutos tras 2 perdidas seguidas y cortar el dia tras 3) que salio de su propio
diagnostico. Es el disparador automatico que hoy no tiene - no lo reemplaces por silencio.

Se directo y sin rodeos, pero nunca le asegures que algo "seguro" va a subir
o bajar - tu rol es ayudarlo a operar con la cabeza fria, no reemplazar su
propio criterio."""


def get_base_path() -> Path:
    """Ruta base del proyecto. Funciona tanto en desarrollo como empaquetado
    con PyInstaller --onefile, que extrae los recursos a una carpeta temporal
    referenciada en sys._MEIPASS. Nunca usar rutas absolutas quemadas."""
    if getattr(sys, "frozen", False):
        return Path(sys._MEIPASS)  # type: ignore[attr-defined]
    return Path(__file__).parent


def get_api_key() -> Optional[str]:
    """La key va embebida en el .exe compilado, igual que en Pollito: vive
    en secreto.py, un archivo local en .gitignore que PyInstaller bundlea
    automaticamente al compilar por ser un import Python normal. Nunca se
    pide ni se acepta pegada en el chat de Claude Code. Si secreto.py no
    existe todavia (checkout limpio antes de crearlo), cae a la variable de
    entorno TRADE_API_KEY para no bloquear el desarrollo."""
    try:
        from secreto import API_KEY
        return API_KEY
    except ImportError:
        return os.environ.get("TRADE_API_KEY")
