"""Pruebas de las funciones puras de main.py que no dependen de la ventana
(customtkinter) - main.py solo crea la ventana bajo el guard
"if __name__ == '__main__'", asi que importarlo como modulo es seguro.
"""
from types import SimpleNamespace

import main


def _bloque(tipo, id_=None):
    return SimpleNamespace(type=tipo, id=id_)


def test_resultados_sinteticos_pendientes_uno_por_cada_tool_use():
    respuesta = SimpleNamespace(content=[_bloque("tool_use", "abc"), _bloque("text")])
    resultados = main._resultados_sinteticos_pendientes(respuesta)
    assert len(resultados) == 1
    assert resultados[0]["tool_use_id"] == "abc"
    assert resultados[0]["type"] == "tool_result"
    assert resultados[0]["is_error"] is True


def test_resultados_sinteticos_pendientes_varios_tool_use():
    respuesta = SimpleNamespace(content=[_bloque("tool_use", "a"), _bloque("tool_use", "b")])
    resultados = main._resultados_sinteticos_pendientes(respuesta)
    assert [r["tool_use_id"] for r in resultados] == ["a", "b"]


def test_resultados_sinteticos_pendientes_sin_tool_use_da_lista_vacia():
    respuesta = SimpleNamespace(content=[_bloque("text")])
    assert main._resultados_sinteticos_pendientes(respuesta) == []
