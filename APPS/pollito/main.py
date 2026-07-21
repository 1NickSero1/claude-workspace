"""Pollito - ventana principal (menu).

TODO pendiente de personalizacion (ver 6 preguntas de PECAS en
RECETAS/receta-apps.txt):
- Nombre definitivo de la app (config.APP_NAME)
- Nombre personalizado de cada skill (dentro de cada modulo en skills/)
- Paleta de colores final (por ahora tema por defecto de CustomTkinter)
"""
import customtkinter as ctk

from config import APP_NAME
from skills import finanzas, gym_nutricion, maquillaje_skincare, moda, psicologia

ctk.set_appearance_mode("light")
ctk.set_default_color_theme("blue")  # TODO: reemplazar por paleta pastel/rosada/lavanda

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
        self._ventanas_abiertas = {}
        self._construir_ui()

    def _construir_ui(self):
        titulo = ctk.CTkLabel(
            self, text=APP_NAME, font=ctk.CTkFont(size=28, weight="bold")
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
