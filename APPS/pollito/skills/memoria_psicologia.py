"""Manejador de memoria persistente para la skill de Psicologia.

Implementa el backend de la herramienta de memoria de Claude (memory_20250818):
un directorio local que persiste entre sesiones para que la skill vaya
conociendo a la novia del usuario con el tiempo (informacion sobre ella,
conceptos de psicologia que ya se le explicaron), en vez de arrancar de cero
cada vez que se cierra y abre la ventana.

Cada operacion valida que la ruta pedida por el modelo se mantenga dentro del
directorio de memoria - nunca se confia en el path tal cual llega (evita
path traversal via "..", rutas absolutas ajenas, etc.).
"""
import os
import shutil
from pathlib import Path


def _raiz_memoria() -> Path:
    base = (
        Path(os.environ.get("APPDATA", str(Path.home())))
        / "Pollito"
        / "memoria_psicologia"
    )
    base.mkdir(parents=True, exist_ok=True)
    return base


def _resolver_ruta_segura(path_pedido: str) -> Path:
    """Convierte una ruta tipo /memories/algo.md (la que usa el modelo) a una
    ruta real dentro de la raiz de memoria, rechazando cualquier intento de
    salir de ese directorio."""
    relativo = path_pedido.lstrip("/")
    if relativo.startswith("memories/"):
        relativo = relativo[len("memories/"):]
    elif relativo == "memories":
        relativo = ""

    raiz = _raiz_memoria().resolve()
    candidato = (raiz / relativo).resolve()

    if candidato != raiz and raiz not in candidato.parents:
        raise ValueError("Ruta fuera del directorio de memoria: {}".format(path_pedido))

    return candidato


def ejecutar_comando_memoria(entrada: dict) -> str:
    """Ejecuta un comando de la herramienta de memoria y devuelve el texto
    de resultado (o un mensaje de error legible, nunca deja pasar una
    excepcion cruda hacia el hilo de la UI)."""
    comando = entrada.get("command")

    try:
        if comando == "view":
            return _ver(entrada)
        if comando == "create":
            return _crear(entrada)
        if comando == "str_replace":
            return _reemplazar(entrada)
        if comando == "insert":
            return _insertar(entrada)
        if comando == "delete":
            return _borrar(entrada)
        if comando == "rename":
            return _renombrar(entrada)
        return "Comando de memoria desconocido: {}".format(comando)
    except ValueError as error:
        return "Error: {}".format(error)
    except OSError as error:
        return "Error de archivo: {}".format(error)


def _ver(entrada: dict) -> str:
    ruta = _resolver_ruta_segura(entrada["path"])
    if ruta.is_dir():
        nombres = sorted(p.name for p in ruta.iterdir())
        return "Directorio {}:\n{}".format(entrada["path"], "\n".join(nombres) or "(vacio)")
    if not ruta.exists():
        return "No existe: {}".format(entrada["path"])
    contenido = ruta.read_text(encoding="utf-8")
    rango = entrada.get("view_range")
    if rango:
        lineas = contenido.splitlines()
        inicio, fin = rango[0] - 1, rango[1]
        contenido = "\n".join(lineas[inicio:fin])
    return contenido


def _crear(entrada: dict) -> str:
    ruta = _resolver_ruta_segura(entrada["path"])
    ruta.parent.mkdir(parents=True, exist_ok=True)
    ruta.write_text(entrada.get("file_text", ""), encoding="utf-8")
    return "Archivo creado: {}".format(entrada["path"])


def _reemplazar(entrada: dict) -> str:
    ruta = _resolver_ruta_segura(entrada["path"])
    contenido = ruta.read_text(encoding="utf-8")
    ocurrencias = contenido.count(entrada["old_str"])
    if ocurrencias != 1:
        return "Error: se esperaba 1 ocurrencia de old_str, se encontraron {}".format(
            ocurrencias
        )
    ruta.write_text(contenido.replace(entrada["old_str"], entrada["new_str"]), encoding="utf-8")
    return "Reemplazo hecho en {}".format(entrada["path"])


def _insertar(entrada: dict) -> str:
    ruta = _resolver_ruta_segura(entrada["path"])
    lineas = ruta.read_text(encoding="utf-8").splitlines()
    posicion = entrada["insert_line"]
    lineas[posicion:posicion] = [entrada["insert_text"]]
    ruta.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    return "Texto insertado en {}".format(entrada["path"])


def _borrar(entrada: dict) -> str:
    ruta = _resolver_ruta_segura(entrada["path"])
    if ruta.is_dir():
        shutil.rmtree(ruta)
    elif ruta.exists():
        ruta.unlink()
    return "Borrado: {}".format(entrada["path"])


def _renombrar(entrada: dict) -> str:
    origen = _resolver_ruta_segura(entrada["old_path"])
    destino = _resolver_ruta_segura(entrada["new_path"])
    destino.parent.mkdir(parents=True, exist_ok=True)
    origen.rename(destino)
    return "Renombrado {} -> {}".format(entrada["old_path"], entrada["new_path"])
