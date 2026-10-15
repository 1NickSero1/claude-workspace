"""Pruebas de estadisticas_uso.py - tracking real de uso por skill.

Todas usan monkeypatch para redirigir APPDATA a una carpeta temporal, nunca
tocan el %APPDATA%/Pollito/estadisticas_uso.json real del usuario.
"""
import threading

import pytest

import estadisticas_uso


@pytest.fixture(autouse=True)
def appdata_temporal(tmp_path, monkeypatch):
    monkeypatch.setenv("APPDATA", str(tmp_path))
    yield tmp_path


def test_arranca_vacio():
    assert estadisticas_uso.leer_estadisticas() == {}


def test_registrar_apertura_acumula_y_fija_fechas():
    estadisticas_uso.registrar_apertura("Rosita")
    estadisticas_uso.registrar_apertura("Rosita")

    datos = estadisticas_uso.leer_estadisticas()["Rosita"]
    assert datos["aperturas"] == 2
    assert datos["mensajes"] == 0
    assert datos["primer_uso"] == datos["ultimo_uso"]


def test_registrar_mensaje_acumula_independiente_de_aperturas():
    estadisticas_uso.registrar_apertura("Glow")
    estadisticas_uso.registrar_mensaje("Glow")
    estadisticas_uso.registrar_mensaje("Glow")

    datos = estadisticas_uso.leer_estadisticas()["Glow"]
    assert datos["aperturas"] == 1
    assert datos["mensajes"] == 2


def test_skills_distintas_no_se_mezclan():
    estadisticas_uso.registrar_mensaje("Rosita")
    estadisticas_uso.registrar_apertura("Kiwi")

    estadisticas = estadisticas_uso.leer_estadisticas()
    assert estadisticas["Rosita"]["mensajes"] == 1
    assert estadisticas["Rosita"]["aperturas"] == 0
    assert estadisticas["Kiwi"]["aperturas"] == 1
    assert estadisticas["Kiwi"]["mensajes"] == 0


def test_archivo_corrupto_no_explota(appdata_temporal):
    ruta = estadisticas_uso._ruta_archivo_estadisticas()
    ruta.write_text("esto no es json valido", encoding="utf-8")

    assert estadisticas_uso.leer_estadisticas() == {}
    estadisticas_uso.registrar_apertura("Nube")
    assert estadisticas_uso.leer_estadisticas()["Nube"]["aperturas"] == 1


def test_registrar_concurrente_no_pierde_actualizaciones():
    """Mismo caso que test_uso_mensual.py: varias skills registrando uso al
    mismo tiempo (cada una en su propio hilo) no deben perder ninguna
    actualizacion de mensajes."""
    hilos_n = 10
    llamadas_por_hilo = 50

    def trabajo():
        for _ in range(llamadas_por_hilo):
            estadisticas_uso.registrar_mensaje("Monito")

    hilos = [threading.Thread(target=trabajo) for _ in range(hilos_n)]
    for h in hilos:
        h.start()
    for h in hilos:
        h.join()

    assert estadisticas_uso.leer_estadisticas()["Monito"]["mensajes"] == hilos_n * llamadas_por_hilo
