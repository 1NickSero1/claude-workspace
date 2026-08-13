"""Calculadora de tamano de posicion / riesgo de Trade.

A diferencia de bitacora.py y memoria.py, este modulo no toca disco en
absoluto - es un calculo deterministico puro. El objetivo es que Sebas
tenga un numero exacto y confiable en vez de depender de la aritmetica del
modelo o de su propio calculo mental en el momento (que es justamente lo
que se salta cuando esta sobreconfiado - ver su perfil en config.py).
"""


def _a_numero_requerido(entrada: dict, campo: str) -> float:
    valor = entrada.get(campo)
    if valor is None or valor == "":
        raise ValueError(f"Falta {campo} - no se puede calcular el tamano de posicion.")
    try:
        return float(valor)
    except (TypeError, ValueError):
        raise ValueError(f"{campo} tiene que ser un numero.")


def _normalizar_calculo(entrada: dict) -> dict:
    balance_cuenta = _a_numero_requerido(entrada, "balance_cuenta")
    if balance_cuenta <= 0:
        raise ValueError("balance_cuenta tiene que ser mayor a 0.")

    riesgo_crudo = entrada.get("riesgo_porcentaje")
    if riesgo_crudo in (None, ""):
        # El SYSTEM_PROMPT ya le pide a Claude pasar 1 cuando Sebas no lo
        # especifica (su regla habitual), pero no hay defaults server-side
        # en tool calling - este es un segundo resguardo del lado Python
        # por si igual llega ausente.
        riesgo_porcentaje = 1.0
    else:
        try:
            riesgo_porcentaje = float(riesgo_crudo)
        except (TypeError, ValueError):
            raise ValueError("riesgo_porcentaje tiene que ser un numero.")
    if riesgo_porcentaje <= 0:
        raise ValueError("riesgo_porcentaje tiene que ser mayor a 0.")

    precio_entrada = _a_numero_requerido(entrada, "precio_entrada")
    stop_loss = _a_numero_requerido(entrada, "stop_loss")
    if precio_entrada == stop_loss:
        raise ValueError("precio_entrada y stop_loss no pueden ser iguales (division por cero).")

    tp_crudo = entrada.get("take_profit")
    if tp_crudo in (None, ""):
        take_profit = None
    else:
        try:
            take_profit = float(tp_crudo)
        except (TypeError, ValueError):
            raise ValueError("take_profit tiene que ser un numero.")

    return {
        "balance_cuenta": balance_cuenta,
        "riesgo_porcentaje": riesgo_porcentaje,
        "precio_entrada": precio_entrada,
        "stop_loss": stop_loss,
        "take_profit": take_profit,
    }


def _calcular_posicion(datos: dict) -> dict:
    """Pura - asume datos ya normalizados por _normalizar_calculo."""
    riesgo_usd = datos["balance_cuenta"] * (datos["riesgo_porcentaje"] / 100)
    distancia_stop = abs(datos["precio_entrada"] - datos["stop_loss"])
    tamano_posicion = riesgo_usd / distancia_stop

    relacion_riesgo_beneficio = None
    if datos["take_profit"] is not None:
        distancia_tp = abs(datos["take_profit"] - datos["precio_entrada"])
        relacion_riesgo_beneficio = distancia_tp / distancia_stop

    return {
        "riesgo_usd": riesgo_usd,
        "distancia_stop": distancia_stop,
        "tamano_posicion": tamano_posicion,
        "relacion_riesgo_beneficio": relacion_riesgo_beneficio,
    }


def calcular_tamano_posicion(entrada: dict) -> str:
    """Manejador de la herramienta calcular_tamano_posicion (ver config.py).
    Sin acceso a disco, asi que solo hace falta atajar ValueError de la
    validacion - a diferencia de bitacora.py no hay PermissionError/OSError
    posibles aca."""
    try:
        datos = _normalizar_calculo(entrada)
        resultado = _calcular_posicion(datos)
    except ValueError as error:
        return f"Error: {error}"

    texto = (
        f"Tamano de posicion sugerido: {resultado['tamano_posicion']:.4f} unidades del activo "
        f"(riesgo {datos['riesgo_porcentaje']:.2f}% de {datos['balance_cuenta']:.2f} USD = "
        f"{resultado['riesgo_usd']:.2f} USD, distancia al stop {resultado['distancia_stop']:.5f})."
    )
    if resultado["relacion_riesgo_beneficio"] is not None:
        texto += f" Relacion riesgo/beneficio: 1:{resultado['relacion_riesgo_beneficio']:.2f}."
    texto += (
        " Nota: 'unidades del activo' es literal (unidades/monedas/acciones) - para forex con "
        "lotes estandar, convertilo al tamano de lote de tu broker antes de operar."
    )
    return texto
