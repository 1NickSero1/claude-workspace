"""Genera el logo/icono/fondo de Pollito: un pollito bebe tierno en tonos rosa.

Es un script de desarrollo - no corre dentro de la app en produccion, solo
se ejecuta una vez (o cuando se quiera reajustar el diseño) para producir
los archivos en assets/. Al ser dibujado con Pillow (no una ilustracion
generada por un modelo de imagen), es un primer diseño simple para iterar
despues si hace falta.

Se dibuja a 4x la resolucion final y se reduce con un filtro de alta calidad
(LANCZOS) para que los bordes de los circulos/ovalos salgan suaves en vez de
dentados - asi se ve mas tierno/pulido y menos "geometrico".

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

COLOR_CUERPO = tema.ACENTOS["Maquillaje y Skincare"]  # rosa bebe suave
COLOR_SOMBRA = tema.BOTON_PRINCIPAL_HOVER  # rosa mas profundo (alas/mejillas)
COLOR_LAZO = tema.ACENTOS["Moda"]  # rosa fucsia
COLOR_PICO = "#F4A15C"  # naranja suave (pico y patitas)
COLOR_OJOS = "#3A2A2E"  # casi negro, tono calido (no negro puro)


def _e(caja):
    """Escala una caja [x0,y0,x1,y1] pensada en coordenadas de 512px."""
    return [valor * ESCALA for valor in caja]


def _p(puntos):
    """Escala una lista de puntos [(x,y), ...] pensada en 512px."""
    return [(x * ESCALA, y * ESCALA) for x, y in puntos]


def _dibujar_pollito(draw: ImageDraw.ImageDraw, cx: int) -> None:
    # Patitas (se asoman debajo del cuerpo, se dibujan primero)
    draw.ellipse(_e([cx - 70, 460, cx - 30, 492]), fill=COLOR_PICO)
    draw.ellipse(_e([cx + 30, 460, cx + 70, 492]), fill=COLOR_PICO)

    # Alas (ovalos a los costados, se dibujan antes del cuerpo para quedar
    # "detras")
    draw.ellipse(_e([cx - 190, 280, cx - 100, 400]), fill=COLOR_SOMBRA)
    draw.ellipse(_e([cx + 100, 280, cx + 190, 400]), fill=COLOR_SOMBRA)

    # Cuerpo (ovalo grande, mitad inferior)
    draw.ellipse(_e([cx - 150, 220, cx + 150, 480]), fill=COLOR_CUERPO)

    # Cabeza (circulo, mitad superior, se superpone al cuerpo)
    draw.ellipse(_e([cx - 140, 60, cx + 140, 340]), fill=COLOR_CUERPO)

    # Mejillas (blush)
    draw.ellipse(_e([cx - 120, 220, cx - 70, 260]), fill=COLOR_SOMBRA)
    draw.ellipse(_e([cx + 70, 220, cx + 120, 260]), fill=COLOR_SOMBRA)

    # Ojos grandes estilo kawaii (circulo oscuro + brillo blanco) - los ojos
    # grandes y bajos en la cara son lo que hace que un personaje se vea
    # "bebe"/tierno en vez de adulto.
    for signo in (-1, 1):
        ex = cx + signo * 45
        draw.ellipse(_e([ex - 24, 155, ex + 24, 203]), fill=COLOR_OJOS)
        draw.ellipse(_e([ex - 9, 162, ex + 3, 174]), fill="#FFFFFF")
        draw.ellipse(_e([ex + 6, 186, ex + 12, 192]), fill="#FFFFFF")

    # Pico (triangulo pequeño, centrado debajo de los ojos)
    draw.polygon(_p([(cx - 20, 210), (cx + 20, 210), (cx, 237)]), fill=COLOR_PICO)

    # Lazo (dos "moños" ovalados + nudo central), centrado arriba de la
    # cabeza - mas reconocible como lazo que triangulos cruzados.
    ly = 72
    draw.ellipse(_e([cx - 62, ly - 20, cx - 14, ly + 20]), fill=COLOR_LAZO)
    draw.ellipse(_e([cx + 14, ly - 20, cx + 62, ly + 20]), fill=COLOR_LAZO)
    draw.ellipse(_e([cx - 16, ly - 16, cx + 16, ly + 16]), fill=COLOR_SOMBRA)


def _agregar_brillo(imagen: Image.Image, cx: int) -> Image.Image:
    """Brillo suave y translucido sobre la cabeza/cuerpo - le da un toque
    tierno/glossy en vez de quedar plano. Se compone en una capa aparte
    porque ImageDraw no mezcla alfa al dibujar directo sobre la imagen."""
    capa = Image.new("RGBA", imagen.size, (0, 0, 0, 0))
    ImageDraw.Draw(capa).ellipse(
        _e([cx - 95, 100, cx - 25, 180]), fill=(255, 255, 255, 90)
    )
    return Image.alpha_composite(imagen, capa)


def generar_icono() -> None:
    CARPETA_ICONOS.mkdir(parents=True, exist_ok=True)

    cx = TAMANO_FINAL // 2
    render = Image.new("RGBA", (TAMANO_RENDER, TAMANO_RENDER), (0, 0, 0, 0))
    _dibujar_pollito(ImageDraw.Draw(render), cx)
    render = _agregar_brillo(render, cx)

    # Reduccion con LANCZOS: convierte los bordes dentados del dibujo en
    # bordes suaves, como si estuviera antialiased desde el principio.
    imagen = render.resize((TAMANO_FINAL, TAMANO_FINAL), Image.LANCZOS)

    ruta_png = CARPETA_ICONOS / "icon.png"
    imagen.save(ruta_png)

    ruta_ico = CARPETA_ICONOS / "icon.ico"
    imagen.save(ruta_ico, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)])

    # Fondo decorativo: mismo dibujo pero tenue (opacidad baja), para usar
    # detras del menu principal sin interferir con la lectura de los botones.
    fondo = imagen.copy()
    canal_alfa = fondo.getchannel("A").point(lambda alfa: int(alfa * 0.12))
    fondo.putalpha(canal_alfa)
    ruta_fondo = CARPETA_ASSETS / "fondo.png"
    fondo.save(ruta_fondo)

    print("Generados:")
    print(" -", ruta_png)
    print(" -", ruta_ico)
    print(" -", ruta_fondo)


if __name__ == "__main__":
    generar_icono()
