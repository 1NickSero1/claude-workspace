"""Pruebas de uso_mensual.py - limite mensual de gasto en USD.

Todas usan monkeypatch para redirigir APPDATA a una carpeta temporal, nunca
tocan el %APPDATA%/Pollito/uso_mensual.json real del usuario.
"""
import json
import threading

import pytest

import uso_mensual
from config import LIMITE_GASTO_MENSUAL_USD


@pytest.fixture(autouse=True)
def appdata_temporal(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    yield tmp_path


def test_arranca_en_cero():
    assert uso_mensual.gasto_disponible_este_mes() == LIMITE_GASTO_MENSUAL_USD
    assert uso_mensual.limite_alcanzado() is False


def test_calcular_costo_usa_precio_distinto_por_entrada_y_salida():
    # 1M de entrada + 1M de salida = PRECIO_INPUT_POR_MTOK + PRECIO_OUTPUT_POR_MTOK.
    costo = uso_mensual.calcular_costo_usd(1_000_000, 1_000_000)
    assert costo == pytest.approx(3.00 + 15.00)


def test_calcular_costo_incluye_cache_escritura_y_lectura():
    # 1M de cada tipo: escritura a 1.25x input ($3.75) + lectura a 0.1x input ($0.30).
    costo = uso_mensual.calcular_costo_usd(
        0, 0, tokens_cache_escritura=1_000_000, tokens_cache_lectura=1_000_000
    )
    assert costo == pytest.approx(3.75 + 0.30)


def test_registrar_uso_acumula_tokens_de_cache():
    uso_mensual.registrar_uso(0, 0, tokens_cache_escritura=1_000_000)  # $3.75
    uso_mensual.registrar_uso(0, 0, tokens_cache_lectura=1_000_000)  # $0.30
    esperado = LIMITE_GASTO_MENSUAL_USD - (3.75 + 0.30)
    assert uso_mensual.gasto_disponible_este_mes() == pytest.approx(esperado)


def test_registrar_uso_acumula():
    uso_mensual.registrar_uso(1_000_000, 0)  # $3.00
    uso_mensual.registrar_uso(0, 100_000)  # $1.50
    esperado = LIMITE_GASTO_MENSUAL_USD - 4.50
    assert uso_mensual.gasto_disponible_este_mes() == pytest.approx(esperado)


def test_limite_alcanzado_se_activa():
    # Suficiente salida (la mas cara) para superar el tope de $5.
    uso_mensual.registrar_uso(0, 1_000_000)
    assert uso_mensual.limite_alcanzado() is True
    # No baja de 0 aunque se registre de mas.
    uso_mensual.registrar_uso(0, 500_000)
    assert uso_mensual.gasto_disponible_este_mes() == 0


def test_reinicia_en_nuevo_mes(appdata_temporal):
    ruta = uso_mensual._ruta_archivo_uso()
    ruta.write_text(
        json.dumps({"mes": "2020-01", "gasto_usd": LIMITE_GASTO_MENSUAL_USD}),
        encoding="utf-8",
    )
    # El mes guardado es viejo - se ignora y arranca de cero para el mes actual.
    assert uso_mensual.gasto_disponible_este_mes() == LIMITE_GASTO_MENSUAL_USD
    assert uso_mensual.limite_alcanzado() is False


def test_registrar_uso_concurrente_no_pierde_actualizaciones():
    """Cubre el fix de la condicion de carrera: muchos hilos (simulando las
    5 skills con una respuesta pendiente a la vez) registrando uso al mismo
    tiempo no deben perder ninguna actualizacion."""
    hilos_n = 10
    llamadas_por_hilo = 50
    # $0.0015 c/u a $15/MTok - el total (500 llamadas) tiene que quedar por
    # debajo del tope de $5, si no el resultado se satura en 0 y la prueba
    # no puede distinguir "se perdio una actualizacion" de "llego al tope".
    tokens_salida_por_llamada = 100

    def trabajo():
        for _ in range(llamadas_por_hilo):
            uso_mensual.registrar_uso(0, tokens_salida_por_llamada)

    hilos = [threading.Thread(target=trabajo) for _ in range(hilos_n)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    costo_por_llamada = uso_mensual.calcular_costo_usd(0, tokens_salida_por_llamada)
    esperado = LIMITE_GASTO_MENSUAL_USD - (hilos_n * llamadas_por_hilo * costo_por_llamada)
    assert uso_mensual.gasto_disponible_este_mes() == pytest.approx(esperado)
