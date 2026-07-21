"""Pollito - ventana principal (menu).

TODO pendiente: nombre personalizado de cada skill (dentro de cada modulo
en skills/) - el usuario los dara mas adelante, antes de cerrar el proyecto.
"""
import customtkinter as ctk
from PIL import Image

import tema
from config import APP_NAME, get_base_path
from skills import finanzas, gym_nutricion, maquillaje_skincare, moda, psicologia

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")  # colores reales aplicados manualmente via tema.py

# Saludo que se muestra arriba de los botones (distinto del titulo de la
# ventana/taskbar, que sigue siendo APP_NAME = "Pollito"). Se usa el simbolo
# clasico "corazon" (U+2665) en vez de un emoji de corazon rosa: los emojis
# nuevos no siempre tienen glifo en todas las fuentes/versiones de Windows
# (se vio como un cuadrito en la maquina de prueba), y la app tiene que
# funcionar tambien en Windows 7.
SALUDO = "Hola mi Sofi ♥"

TAMANO_VENTANA = (420, 580)
TAMANO_MASCOTA = 160

SKILLS = [
    ("Maquillaje y Skincare", maquillaje_skincare.abrir_ventana),
    ("Moda", moda.abrir_ventana),
    ("Finanzas", finanzas.abrir_ventana),
    ("Gym y Nutricion", gym_nutricion.abrir_ventana),
    ("Psicologia", psicologia.abrir_ventana),
]


class MenuPrincipal(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("{}x{}".format(*TAMANO_VENTANA))
        self.resizable(False, False)
        self.configure(fg_color=tema.FONDO)
        self._ventanas_abiertas = {}
        self._aplicar_icono()
        self._construir_ui()
        self._agregar_mascota()

    def _aplicar_icono(self):
        icono = get_base_path() / "assets" / "icons" / "icon.ico"
        if icono.exists():
            try:
                self.iconbitmap(str(icono))
            except Exception:
                pass  # sin icono no rompe la app, solo se ve el default de Tk

    def _construir_ui(self):
        titulo = ctk.CTkLabel(
            self,
            text=SALUDO,
            font=ctk.CTkFont(size=28, weight="bold"),
            text_color=tema.TEXTO,
        )
        titulo.pack(pady=(36, 28))

        # Tipografia "cute" para los nombres de las skills - Segoe Print
        # viene instalada por defecto en Windows y se ve mas tierna que una
        # tipografia generica, sin perder legibilidad.
        fuente_botones = ctk.CTkFont(family="Segoe Print", size=15, weight="bold")

        for nombre, abrir_ventana in SKILLS:
            boton = ctk.CTkButton(
                self,
                text=nombre,
                width=300,
                height=56,
                corner_radius=18,
                font=fuente_botones,
                fg_color=tema.ACENTOS.get(nombre, tema.BOTON_PRINCIPAL),
                hover_color=tema.BOTON_PRINCIPAL_HOVER,
                text_color=tema.TEXTO,
                command=lambda fn=abrir_ventana, n=nombre: self._abrir_skill(n, fn),
            )
            boton.pack(pady=10)

    def _agregar_mascota(self):
        """Pollito decorativo asomando por la esquina inferior derecha,
        parcialmente "afuera" de la ventana (recortado por el borde) -
        reusa el mismo arte que el icono, generado con
        assets/generar_icono.py."""
        ruta_imagen = get_base_path() / "assets" / "icons" / "icon.png"
        if not ruta_imagen.exists():
            return
        imagen_pil = Image.open(ruta_imagen)
        imagen = ctk.CTkImage(
            light_image=imagen_pil, dark_image=imagen_pil, size=(TAMANO_MASCOTA, TAMANO_MASCOTA)
        )
        etiqueta = ctk.CTkLabel(self, image=imagen, text="", fg_color="transparent")

        ancho_ventana, alto_ventana = TAMANO_VENTANA
        # Se muestra ~2/3 de la mascota; el resto queda mas alla del borde
        # de la ventana y Tk simplemente no lo dibuja (efecto "saliendo").
        x = ancho_ventana - int(TAMANO_MASCOTA * 0.62)
        y = alto_ventana - int(TAMANO_MASCOTA * 0.62)
        etiqueta.place(x=x, y=y)
        etiqueta.lower()  # detras de los botones, por si llega a superponerse

    def _abrir_skill(self, nombre, abrir_ventana):
        # Evita abrir dos veces la misma ventana de chat si ya esta abierta.
        ventana_existente = self._ventanas_abiertas.get(nombre)
        if ventana_existente is not None and ventana_existente.winfo_exists():
            ventana_existente.focus()
            return
        nueva_ventana = abrir_ventana(self)
        self._ventanas_abiertas[nombre] = nueva_ventana


if __name__ == "__main__":
    app = MenuPrincipal()
    app.mainloop()
