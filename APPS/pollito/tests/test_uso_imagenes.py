"""Pruebas de uso_imagenes.py - tope mensual de imagenes generadas.

Redirigen APPDATA a una carpeta temporal, nunca tocan el
%APPDATA%/Pollito/uso_imagenes.json real del usuario.
"""
import json
import threading

import pytest

import uso_imagenes
from config import LIMITE_IMAGENES_MENSUAL


@pytest.fixture(autouse=True)
def appdata_temporal(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    yield tmp_path


def test_arranca_en_cero():
    assert uso_imagenes.imagenes_generadas_este_mes() == 0
    assert uso_imagenes.limite_imagenes_alcanzado() is False


def test_registrar_acumula_y_alcanza_el_limite():
    for _ in range(LIMITE_IMAGENES_MENSUAL - 1):
        uso_imagenes.registrar_imagen_generada()
    assert uso_imagenes.limite_imagenes_alcanzado() is False

    uso_imagenes.registrar_imagen_generada()
    assert uso_imagenes.imagenes_generadas_este_mes() == LIMITE_IMAGENES_MENSUAL
    assert uso_imagenes.limite_imagenes_alcanzado() is True


def test_reinicia_en_nuevo_mes(appdata_temporal):
    ruta = uso_imagenes._ruta_archivo_uso()
    ruta.write_text(
        json.dumps({"mes": "2020-01", "cantidad": LIMITE_IMAGENES_MENSUAL}),
        encoding="utf-8",
    )
    assert uso_imagenes.imagenes_generadas_este_mes() == 0
    assert uso_imagenes.limite_imagenes_alcanzado() is False


def test_archivo_corrupto_no_explota(appdata_temporal):
    uso_imagenes._ruta_archivo_uso().write_text("{no es json", encoding="utf-8")
    assert uso_imagenes.imagenes_generadas_este_mes() == 0
    uso_imagenes.registrar_imagen_generada()
    assert uso_imagenes.imagenes_generadas_este_mes() == 1


def test_registrar_concurrente_no_pierde_actualizaciones():
    hilos_n = 5
    llamadas_por_hilo = 4  # 20 en total, por debajo del tope de 30

    def trabajo():
        for _ in range(llamadas_por_hilo):
            uso_imagenes.registrar_imagen_generada()

    hilos = [threading.Thread(target=trabajo) for _ in range(hilos_n)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    assert uso_imagenes.imagenes_generadas_este_mes() == hilos_n * llamadas_por_hilo
