"""Pruebas de riesgo.py - calculadora de tamano de posicion. Todo es calculo
puro, sin I/O, asi que ninguna prueba necesita tmp_path ni monkeypatch.
"""
import pytest

import riesgo


def _entrada(**overrides):
    base = {
        "balance_cuenta": 10000,
        "riesgo_porcentaje": 1,
        "precio_entrada": 100,
        "stop_loss": 95,
    }
    base.update(overrides)
    return base


# --- Normalizacion ----------------------------------------------------

def test_normalizar_calculo_default_riesgo_a_uno_si_falta():
    datos = riesgo._normalizar_calculo(_entrada(riesgo_porcentaje=None))
    assert datos["riesgo_porcentaje"] == 1.0


def test_normalizar_calculo_falta_balance_cuenta():
    entrada = _entrada()
    del entrada["balance_cuenta"]
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(entrada)


def test_normalizar_calculo_falta_precio_entrada():
    entrada = _entrada()
    del entrada["precio_entrada"]
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(entrada)


def test_normalizar_calculo_falta_stop_loss():
    entrada = _entrada()
    del entrada["stop_loss"]
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(entrada)


def test_normalizar_calculo_balance_no_numerico():
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(_entrada(balance_cuenta="abc"))


@pytest.mark.parametrize("balance", [0, -100])
def test_normalizar_calculo_balance_no_positivo(balance):
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(_entrada(balance_cuenta=balance))


def test_normalizar_calculo_riesgo_porcentaje_no_positivo():
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(_entrada(riesgo_porcentaje=0))


def test_normalizar_calculo_entrada_igual_a_stop_loss_rechazado():
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(_entrada(precio_entrada=100, stop_loss=100))


def test_normalizar_calculo_take_profit_ausente_es_none():
    datos = riesgo._normalizar_calculo(_entrada())
    assert datos["take_profit"] is None


def test_normalizar_calculo_take_profit_no_numerico():
    with pytest.raises(ValueError):
        riesgo._normalizar_calculo(_entrada(take_profit="abc"))


# --- Calculo -------------------------------------------------------------

def test_calcular_posicion_caso_simple():
    datos = riesgo._normalizar_calculo(_entrada(balance_cuenta=10000, riesgo_porcentaje=1, precio_entrada=100, stop_loss=95))
    resultado = riesgo._calcular_posicion(datos)
    assert resultado["riesgo_usd"] == 100
    assert resultado["distancia_stop"] == 5
    assert resultado["tamano_posicion"] == 20
    assert resultado["relacion_riesgo_beneficio"] is None


def test_calcular_posicion_con_take_profit_calcula_relacion_riesgo_beneficio():
    datos = riesgo._normalizar_calculo(
        _entrada(balance_cuenta=10000, riesgo_porcentaje=1, precio_entrada=100, stop_loss=95, take_profit=115)
    )
    resultado = riesgo._calcular_posicion(datos)
    assert resultado["relacion_riesgo_beneficio"] == 3.0


# --- Entrypoint publico ----------------------------------------------------

def test_calcular_tamano_posicion_feliz_incluye_tamano_y_riesgo():
    texto = riesgo.calcular_tamano_posicion(_entrada(balance_cuenta=10000, riesgo_porcentaje=1, precio_entrada=100, stop_loss=95))
    assert "20.0000" in texto
    assert "100.00" in texto


def test_calcular_tamano_posicion_input_invalido_da_mensaje_de_error():
    entrada = _entrada()
    del entrada["balance_cuenta"]
    resultado = riesgo.calcular_tamano_posicion(entrada)
    assert resultado.startswith("Error:")


def test_calcular_tamano_posicion_default_riesgo_visible_en_texto():
    entrada = _entrada()
    del entrada["riesgo_porcentaje"]
    texto = riesgo.calcular_tamano_posicion(entrada)
    assert "1.00%" in texto
