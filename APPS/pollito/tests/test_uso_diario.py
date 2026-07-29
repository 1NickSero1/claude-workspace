"""Pruebas de uso_diario.py - limite diario de gasto de tokens.

Todas usan monkeypatch para redirigir APPDATA a una carpeta temporal, nunca
tocan el %APPDATA%/Pollito/uso_diario.json real del usuario.
"""
import json
import threading

import pytest

import uso_diario
from config import LIMITE_TOKENS_DIARIOS


@pytest.fixture(autouse=True)
def appdata_temporal(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    yield tmp_path


def test_arranca_en_cero():
    assert uso_diario.tokens_disponibles_hoy() == LIMITE_TOKENS_DIARIOS
    assert uso_diario.limite_alcanzado() is False


def test_registrar_uso_acumula():
    uso_diario.registrar_uso(100)
    uso_diario.registrar_uso(50)
    assert uso_diario.tokens_disponibles_hoy() == LIMITE_TOKENS_DIARIOS - 150


def test_limite_alcanzado_se_activa():
    uso_diario.registrar_uso(LIMITE_TOKENS_DIARIOS)
    assert uso_diario.limite_alcanzado() is True
    # No baja de 0 aunque se registre de mas.
    uso_diario.registrar_uso(500)
    assert uso_diario.tokens_disponibles_hoy() == 0


def test_reinicia_en_nuevo_dia(appdata_temporal):
    ruta = uso_diario._ruta_archivo_uso()
    ruta.write_text(
        json.dumps({"fecha": "2020-01-01", "tokens_usados": LIMITE_TOKENS_DIARIOS}),
        encoding="utf-8",
    )
    # La fecha guardada es vieja - se ignora y arranca de cero para hoy.
    assert uso_diario.tokens_disponibles_hoy() == LIMITE_TOKENS_DIARIOS
    assert uso_diario.limite_alcanzado() is False


def test_registrar_uso_concurrente_no_pierde_actualizaciones():
    """Cubre el fix de la condicion de carrera: muchos hilos (simulando las
    5 skills con una respuesta pendiente a la vez) registrando uso al mismo
    tiempo no deben perder ninguna actualizacion."""
    hilos_n = 10
    llamadas_por_hilo = 50
    tokens_por_llamada = 1

    def trabajo():
        for _ in range(llamadas_por_hilo):
            uso_diario.registrar_uso(tokens_por_llamada)

    hilos = [threading.Thread(target=trabajo) for _ in range(hilos_n)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    esperado = hilos_n * llamadas_por_hilo * tokens_por_llamada
    assert uso_diario.tokens_disponibles_hoy() == LIMITE_TOKENS_DIARIOS - esperado
