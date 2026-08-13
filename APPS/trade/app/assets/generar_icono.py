"""Genera el icono de Trade: un grafico de barras ascendente simple, en el
mismo verde de la paleta (tema.ACENTO) sobre un cuadrado redondeado con el
fondo oscuro de la app (tema.FONDO).

Es un script de desarrollo - no corre dentro de la app en produccion, solo
se ejecuta una vez (o cuando se quiera reajustar el diseño) para producir
los archivos en assets/. Mismo patron que APPS/pollito/assets/generar_icono.py:
se dibuja a 4x la resolucion final y se reduce con un filtro de alta calidad
(LANCZOS) para que los bordes salgan suaves en vez de dentados.

No es un diseño personalizado para Sebas (eso sigue pendiente, ver el TODO
de APP_NAME en config.py) - es un icono simple y profesional para que la
app deje de mostrar el icono generico, se puede reemplazar despues.

Requiere Pillow (ya esta en requirements.txt).
Uso: python assets/generar_icono.py
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import tema  # noqa: E402  (import despues de ajustar sys.path)

ESCALA = 4
TAMANO_FINAL = 512
TAMANO_RENDER = TAMANO_FINAL * ESCALA

CARPETA_ASSETS = Path(__file__).resolve().parent
CARPETA_ICONOS = CARPETA_ASSETS / "icons"

COLOR_FONDO = tema.FONDO
COLOR_BARRAS = tema.ACENTO


def _e(caja):
    """Escala una caja [x0,y0,x1,y1] pensada en coordenadas de 512px."""
    return [valor * ESCALA for valor in caja]


def _dibujar_icono(draw: ImageDraw.ImageDraw) -> None:
    # Fondo: cuadrado con esquinas redondeadas, mismo tono oscuro que la
    # ventana de la app - le da al glifo un "badge" propio en vez de quedar
    # perdido en la barra de tareas a tamano chico.
    draw.rounded_rectangle(_e([16, 16, 496, 496]), radius=100 * ESCALA, fill=COLOR_FONDO)

    # 4 barras ascendentes centradas, esquinas superiores redondeadas -
    # motivo simple de "grafico en alza", sin depender de un dibujo
    # figurativo/personalizado.
    barras = [
        # (x0, x1, y0)  -  y1 siempre 380 (base comun de las barras)
        (128, 184, 280),
        (216, 272, 230),
        (304, 360, 170),
        (392, 448, 110),
    ]
    y_base = 380
    for x0, x1, y0 in barras:
        draw.rounded_rectangle(_e([x0, y0, x1, y_base]), radius=10 * ESCALA, fill=COLOR_BARRAS)


def generar_icono() -> None:
    CARPETA_ICONOS.mkdir(parents=True, exist_ok=True)

    render = Image.new("RGBA", (TAMANO_RENDER, TAMANO_RENDER), (0, 0, 0, 0))
    _dibujar_icono(ImageDraw.Draw(render))

    # Reduccion con LANCZOS: convierte los bordes dentados del dibujo en
    # bordes suaves, como si estuviera antialiased desde el principio.
    imagen = render.resize((TAMANO_FINAL, TAMANO_FINAL), Image.LANCZOS)

    ruta_png = CARPETA_ICONOS / "icon.png"
    imagen.save(ruta_png)

    ruta_ico = CARPETA_ICONOS / "icon.ico"
    imagen.save(ruta_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])

    print("Generados:")
    print(" -", ruta_png)
    print(" -", ruta_ico)


if __name__ == "__main__":
    generar_icono()
