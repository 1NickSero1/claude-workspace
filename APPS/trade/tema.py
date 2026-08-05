"""Paleta de colores de Trade.

Un solo acento (a diferencia de Pollito, que tenia un tono de rosa distinto
por cada una de sus 5 skills) porque esta app es una sola skill. Tema oscuro
con acento verde (referencia a "estar en verde"/ganancia), pensado para
Sebas en vez del rosa/sakura de Pollito (pensado para Sofi).
"""

FONDO = "#0F172A"
FONDO_SECUNDARIO = "#1E293B"
TEXTO = "#E2E8F0"
TEXTO_SECUNDARIO = "#94A3B8"

# Oscurecidos (2026-08-04, hallazgo de ESTETIK): los tonos originales
# #16A34A/#22C55E daban 2.67:1 y 1.85:1 de contraste contra TEXTO - muy por
# debajo del minimo WCAG AA (4.5:1). Estos dos pasan a 7.39:1 y 5.78:1
# (verificado con la formula real de contraste, no a ojo).
BOTON_PRINCIPAL = "#14532D"
BOTON_PRINCIPAL_HOVER = "#0F3D22"

# Se usa SOLO como color de borde/acento decorativo (area_chat, entrada) -
# ahi no hay texto encima, no tiene requisito de contraste, y le conviene
# seguir siendo el verde vivo original. Para el fondo de la burbuja de
# mensajes de Trade (que SI tiene texto encima) usar BURBUJA_TRADE en vez
# de este.
ACENTO = "#22C55E"

# Fondo de la burbuja de los mensajes de Trade (antes reusaba ACENTO, que
# es demasiado claro para el texto encima - ver comentario de BOTON_PRINCIPAL).
BURBUJA_TRADE = "#166534"
