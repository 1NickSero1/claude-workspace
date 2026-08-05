"""Pruebas de memoria.py - proteccion contra path traversal y contra borrar
la carpeta raiz de memoria.

Usan tmp_path directo como "raiz" - estas funciones ya reciben la raiz como
parametro, no hace falta tocar APPDATA para probarlas.
"""
import pytest

from memoria import _borrar, _crear, _resolver_ruta_segura, _ver


def test_resolver_ruta_normal(tmp_path):
    resultado = _resolver_ruta_segura(tmp_path, "/memories/notas.md")
    assert resultado == tmp_path / "notas.md"


def test_resolver_ruta_rechaza_salir_de_la_raiz(tmp_path):
    with pytest.raises(ValueError):
        _resolver_ruta_segura(tmp_path, "/memories/../../fuera_de_la_raiz.txt")


def test_crear_y_ver_funciona(tmp_path):
    _crear(tmp_path, {"path": "/memories/perfil.md", "file_text": "hola"})
    contenido = _ver(tmp_path, {"path": "/memories/perfil.md"})
    assert contenido == "hola"


def test_borrar_archivo_normal_funciona(tmp_path):
    _crear(tmp_path, {"path": "/memories/temporal.md", "file_text": "x"})
    resultado = _borrar(tmp_path, {"path": "/memories/temporal.md"})
    assert "Borrado" in resultado
    assert not (tmp_path / "temporal.md").exists()


def test_borrar_raiz_se_rechaza(tmp_path):
    """Cubre el fix: pedir borrar la carpeta raiz de memoria entera (path
    "/memories" a secas) no debe borrar nada, solo devolver un error."""
    _crear(tmp_path, {"path": "/memories/algo.md", "file_text": "no se debe perder"})

    resultado = _borrar(tmp_path, {"path": "/memories"})

    assert "Error" in resultado
    assert tmp_path.exists()
    assert (tmp_path / "algo.md").exists()
