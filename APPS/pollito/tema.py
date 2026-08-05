"""Paleta de colores de Pollito (pregunta 4).

Una sola paleta cohesiva que usa distintos tonos de rosa para cada rol de
la interfaz - variedad de rosas en vez de un solo rosa repetido en todos
lados.
"""

FONDO = "#FFF5F8"
FONDO_SECUNDARIO = "#FCE8EF"
TEXTO = "#4A2C34"
# Mismo tono mauve que antes (#9C6B7A), mas oscuro - el original daba 4.1:1
# de contraste sobre FONDO, por debajo del minimo AA de WCAG (4.5:1) para
# texto normal. Este valor da 5.25:1 sobre FONDO y 4.78:1 sobre
# FONDO_SECUNDARIO (donde se pintan los avisos de "Sistema"), pasando el
# minimo en los dos fondos donde se usa.
TEXTO_SECUNDARIO = "#8A5A69"

BOTON_PRINCIPAL = "#F2A6C4"
BOTON_PRINCIPAL_HOVER = "#E8829F"

# Un tono de rosa distinto por skill - diferencia cada ventana de chat sin
# salirse de la misma familia de colores.
ACENTOS = {
    "Rosita": "#F7B6D2",  # rosa bebe (Maquillaje y Skincare)
    "Glow": "#EC7FA9",  # rosa fucsia suave (Moda)
    "Monito": "#D9A4B5",  # rosa antiguo / mauve (Finanzas)
    "Kiwi": "#F48FB1",  # rosa chicle (Gym y Nutricion)
    "Nube": "#E6A8C0",  # rosa polvo, tono mas calmado (Psicologia)
}
