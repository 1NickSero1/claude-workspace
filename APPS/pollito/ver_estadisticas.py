"""Muestra en consola cuanto se uso cada skill de Pollito.

Uso: correrlo en la PC donde vive el %APPDATA%/Pollito/estadisticas_uso.json
real (la de Sofi), o pedirle ese archivo puntual y copiarlo a
%APPDATA%/Pollito/ en esta PC antes de correr el script.

No muestra contenido de conversaciones - solo contadores y fechas.
"""
from estadisticas_uso import leer_estadisticas

ANCHO_NOMBRE = 20


def main() -> None:
    estadisticas = leer_estadisticas()
    if not estadisticas:
        print("Todavia no hay ningun uso registrado.")
        return

    total_aperturas = 0
    total_mensajes = 0

    print(f"{'SKILL':<{ANCHO_NOMBRE}}{'APERTURAS':>10}{'MENSAJES':>10}   PRIMER USO           ULTIMO USO")
    for nombre_skill, datos in sorted(estadisticas.items()):
        aperturas = datos.get("aperturas", 0)
        mensajes = datos.get("mensajes", 0)
        total_aperturas += aperturas
        total_mensajes += mensajes
        print(
            f"{nombre_skill:<{ANCHO_NOMBRE}}{aperturas:>10}{mensajes:>10}   "
            f"{datos.get('primer_uso', '-'):<21} {datos.get('ultimo_uso', '-')}"
        )

    print("-" * 70)
    print(f"{'TOTAL':<{ANCHO_NOMBRE}}{total_aperturas:>10}{total_mensajes:>10}")


if __name__ == "__main__":
    main()
