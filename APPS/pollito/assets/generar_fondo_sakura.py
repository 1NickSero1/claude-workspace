"""Genera fondo_sakura.png: ramas de flor de sakura decorativas para el menu
principal.

Script de desarrollo (no corre en produccion) - genera una imagen del mismo
tamaño que la ventana principal (ver TAMANO_VENTANA en main.py) con dos
ramas de sakura en esquinas opuestas (arriba-derecha y abajo-izquierda,
dejando libre la esquina abajo-derecha donde ya vive la mascota pollito) mas
un puñado de petalos sueltos cayendo, todo a baja opacidad para no competir
con la lectura de los botones ni verse "cargado" - la idea es un acento de
esquina, no un papel tapiz que cubra toda la ventana.

Usa el mismo enfoque que generar_icono.py: se dibuja a 4x resolucion y se
reduce con LANCZOS para bordes suaves.

Requiere Pillow (ya esta en requirements.txt).
Uso: python assets/generar_fondo_sakura.py
"""
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import tema  # noqa: E402  (import despues de ajustar sys.path)

ESCALA = 4
ANCHO, ALTO = 420, 580  # debe coincidir con TAMANO_VENTANA en main.py
ANCHO_RENDER, ALTO_RENDER = ANCHO * ESCALA, ALTO * ESCALA

CARPETA_ASSETS = Path(__file__).resolve().parent

COLOR_RAMA = "#A97C6D"  # marron calido suave, no compite con la paleta rosa
COLOR_PETALO = tema.ACENTOS["Maquillaje y Skincare"]  # rosa bebe
COLOR_PETALO_CENTRO = tema.ACENTOS["Moda"]  # rosa fucsia suave, centro de la flor
COLOR_PETALO_SUELTO = tema.FONDO_SECUNDARIO  # rosa muy palido, para los que caen

OPACIDAD = 0.55  # acento de esquina, no papel tapiz - se aplica al final


def _e(caja):
    return [v * ESCALA for v in caja]


def _p(puntos):
    return [(x * ESCALA, y * ESCALA) for x, y in puntos]


def _rama(draw, puntos, ancho):
    draw.line(_p(puntos), fill=COLOR_RAMA, width=ancho * ESCALA, joint="curve")


def _flor(draw, cx, cy, radio, color_petalo=COLOR_PETALO):
    """5 petalos ovalados alrededor de un centro, estilo flor de sakura."""
    for i in range(5):
        ang = math.radians(72 * i - 90)
        px = cx + math.cos(ang) * radio * 0.6
        py = cy + math.sin(ang) * radio * 0.6
        draw.ellipse(
            _e([px - radio * 0.55, py - radio * 0.4, px + radio * 0.55, py + radio * 0.4]),
            fill=color_petalo,
        )
    draw.ellipse(
        _e([cx - radio * 0.28, cy - radio * 0.28, cx + radio * 0.28, cy + radio * 0.28]),
        fill=COLOR_PETALO_CENTRO,
    )


def _capullo(draw, cx, cy, radio):
    """Flor cerrada: un ovalo simple, mas chico que una flor abierta - da
    variedad sin sumar otra flor completa."""
    draw.ellipse(
        _e([cx - radio * 0.4, cy - radio * 0.55, cx + radio * 0.4, cy + radio * 0.55]),
        fill=COLOR_PETALO_CENTRO,
    )


def _rama_esquina_superior_derecha(draw):
    ox, oy = ANCHO, 0
    _rama(draw, [(ox, oy), (ox - 65, oy + 40)], 5)
    _rama(draw, [(ox - 65, oy + 40), (ox - 100, oy + 28)], 4)
    _rama(draw, [(ox - 65, oy + 40), (ox - 85, oy + 68)], 4)
    _flor(draw, ox - 100, oy + 28, 15)
    _flor(draw, ox - 85, oy + 68, 16)
    _flor(draw, ox - 35, oy + 14, 13)
    _capullo(draw, ox - 20, oy + 42, 9)


def _rama_esquina_inferior_izquierda(draw):
    ox, oy = 0, ALTO
    _rama(draw, [(ox, oy), (ox + 55, oy - 38)], 5)
    _rama(draw, [(ox + 55, oy - 38), (ox + 82, oy - 62)], 4)
    _flor(draw, ox + 82, oy - 62, 15)
    _flor(draw, ox + 30, oy - 14, 13)
    _capullo(draw, ox + 15, oy - 44, 8)


def _petalos_cayendo(draw):
    """Puñado de petalos sueltos, muy pocos, para dar sensacion de
    movimiento sin llenar la pantalla."""
    posiciones = [(250, 85), (300, 150), (140, 470), (340, 390), (200, 250)]
    for x, y in posiciones:
        draw.ellipse(_e([x - 6, y - 4, x + 6, y + 4]), fill=COLOR_PETALO_SUELTO)


def generar_fondo_sakura() -> None:
    render = Image.new("RGBA", (ANCHO_RENDER, ALTO_RENDER), (0, 0, 0, 0))
    draw = ImageDraw.Draw(render)
    _rama_esquina_superior_derecha(draw)
    _rama_esquina_inferior_izquierda(draw)
    _petalos_cayendo(draw)

    imagen = render.resize((ANCHO, ALTO), Image.LANCZOS)

    canal_alfa = imagen.getchannel("A").point(lambda alfa: int(alfa * OPACIDAD))
    imagen.putalpha(canal_alfa)

    ruta = CARPETA_ASSETS / "fondo_sakura.png"
    imagen.save(ruta)
    print("Generado:", ruta)


if __name__ == "__main__":
    generar_fondo_sakura()
