"""Pollito - ventana principal (menu).

TODO pendiente: nombre personalizado de cada skill (dentro de cada modulo
en skills/) - el usuario los dara mas adelante, antes de cerrar el proyecto.
"""
import customtkinter as ctk

import tema
from config import APP_NAME, get_base_path
from skills import finanzas, gym_nutricion, maquillaje_skincare, moda, psicologia

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")  # colores reales aplicados manualmente via tema.py

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
        self.geometry("420x580")
        self.resizable(False, False)
        self.configure(fg_color=tema.FONDO)
        self._ventanas_abiertas = {}
        self._aplicar_icono()
        self._construir_ui()

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
            text=APP_NAME,
            font=ctk.CTkFont(size=28, weight="bold"),
            text_color=tema.TEXTO,
        )
        titulo.pack(pady=(36, 28))

        for nombre, abrir_ventana in SKILLS:
            boton = ctk.CTkButton(
                self,
                text=nombre,
                width=300,
                height=56,
                corner_radius=18,
                font=ctk.CTkFont(size=16),
                fg_color=tema.ACENTOS.get(nombre, tema.BOTON_PRINCIPAL),
                hover_color=tema.BOTON_PRINCIPAL_HOVER,
                text_color=tema.TEXTO,
                command=lambda fn=abrir_ventana, n=nombre: self._abrir_skill(n, fn),
            )
            boton.pack(pady=10)

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
