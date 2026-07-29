"""Pollito - ventana principal (menu + vistas de skill).

Una sola ventana para toda la app: cada skill es un panel que cubre la
ventana entera y vuelve al menu con su boton "Atras" (skills/base.py), en
vez de abrir una ventana nueva por skill - asi el icono/titulo de la
ventana es siempre el mismo y no hay que andar cerrando ventanas viejas
para cambiar de skill.

TODO pendiente: nombre personalizado de cada skill (dentro de cada modulo
en skills/) - el usuario los dara mas adelante, antes de cerrar el proyecto.
"""
import sys

import customtkinter as ctk
from PIL import Image

import tema
from config import APP_NAME, get_base_path
from skills import finanzas, gym_nutricion, maquillaje_skincare, moda, psicologia

# customtkinter revisa cada 100ms si el DPI del monitor cambio respecto al
# que detecto al crear la ventana (window.winfo_id() -> MonitorFromWindow) y,
# si detecta una diferencia, reescala TODA la UI de golpe - eso es lo que
# causaba que el recuadro de chat se viera bien el primer segundo y despues
# "saltara" con un espacio de mas (columnas internas de CTkScrollableFrame
# recalculadas con otro factor de escala). La ventana es de tamano fijo
# (ver TAMANO_VENTANA / _bloquear_maximizado), no hace falta ese reajuste
# automatico - se desactiva antes de crear cualquier ventana.
ctk.deactivate_automatic_dpi_awareness()

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
TAMANO_MASCOTA = 130

SKILLS = [
    ("Maquillaje y Skincare", maquillaje_skincare.crear_vista),
    ("Moda", moda.crear_vista),
    ("Finanzas", finanzas.crear_vista),
    ("Gym y Nutricion", gym_nutricion.crear_vista),
    ("Psicologia", psicologia.crear_vista),
]


class MenuPrincipal(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("{}x{}".format(*TAMANO_VENTANA))
        self.resizable(False, False)
        # resizable(False, False) ya saca el boton de maximizar y el
        # arrastre de bordes, pero Windows igual puede maximizar la ventana
        # con Win+flecha arriba o Aero Snap contra el borde superior - este
        # bind lo revierte apenas pasa, para que el tamano de la ventana sea
        # siempre el mismo (el del onboarding), tanto en el menu como en
        # cualquier skill.
        self.bind("<Configure>", self._bloquear_maximizado)
        self.configure(fg_color=tema.FONDO)
        # Vistas de skill ya creadas, cacheadas por nombre para conservar su
        # conversacion al ir y volver del menu (no se recrean de cero cada
        # vez que se re-entra a la misma skill).
        self._vistas_skill = {}
        self._aplicar_icono()
        self._agregar_fondo_sakura()
        self._construir_ui()
        self._agregar_mascota()

    def _bloquear_maximizado(self, event=None):
        if self.state() == "zoomed":
            self.state("normal")
            self.geometry("{}x{}".format(*TAMANO_VENTANA))

    def _aplicar_icono(self):
        icono = get_base_path() / "assets" / "icons" / "icon.ico"
        if icono.exists():
            try:
                self.iconbitmap(str(icono))
            except Exception:
                pass  # sin icono no rompe la app, solo se ve el default de Tk

    def _agregar_fondo_sakura(self):
        """Ramas de sakura decorativas en dos esquinas opuestas (ver
        assets/generar_fondo_sakura.py) - se crea antes que el resto de la
        UI para quedar detras en el orden de apilado de Tk, sin competir
        con la lectura de los botones."""
        ruta_imagen = get_base_path() / "assets" / "fondo_sakura.png"
        if not ruta_imagen.exists():
            return
        imagen_pil = Image.open(ruta_imagen)
        imagen = ctk.CTkImage(
            light_image=imagen_pil, dark_image=imagen_pil, size=TAMANO_VENTANA
        )
        etiqueta = ctk.CTkLabel(self, image=imagen, text="", fg_color="transparent")
        etiqueta.place(x=0, y=0)

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

        self._ultimo_boton = None
        for nombre, crear_vista in SKILLS:
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
                command=lambda fn=crear_vista, n=nombre: self._abrir_skill(n, fn),
            )
            boton.pack(pady=10)
            self._ultimo_boton = boton

    def _agregar_mascota(self):
        """Pollito decorativo saliendo por el borde derecho de la ventana
        (recortado por Tk al no dibujar lo que queda fuera del area de la
        ventana) - se ve completo de arriba a abajo, solo se recorta a la
        derecha. Reusa el mismo arte que el icono
        (assets/generar_icono.py)."""
        ruta_imagen = get_base_path() / "assets" / "icons" / "icon.png"
        if not ruta_imagen.exists():
            return
        imagen_pil = Image.open(ruta_imagen)
        imagen = ctk.CTkImage(
            light_image=imagen_pil, dark_image=imagen_pil, size=(TAMANO_MASCOTA, TAMANO_MASCOTA)
        )
        etiqueta = ctk.CTkLabel(self, image=imagen, text="", fg_color="transparent")

        self.update_idletasks()
        ancho_ventana = self.winfo_width()
        alto_ventana = self.winfo_height()

        y_libre_de_botones = self._ultimo_boton.winfo_y() + self._ultimo_boton.winfo_height() + 24
        y_apoyado_abajo = alto_ventana - TAMANO_MASCOTA
        # Si hay lugar de sobra debajo del ultimo boton, apoya la mascota
        # bien abajo (se ve completa, sin recorte vertical). Si no entra,
        # prioriza no tapar los botones antes que evitar un recorte chico.
        y = max(y_libre_de_botones, y_apoyado_abajo)

        # Solo se muestra ~65% del ancho - el resto "sale" por el borde
        # derecho de la ventana.
        x = ancho_ventana - int(TAMANO_MASCOTA * 0.65)

        etiqueta.place(x=x, y=y)

    def _abrir_skill(self, nombre, crear_vista):
        # Reusa la vista si ya se creo antes (conserva su conversacion) -
        # solo se crea de cero la primera vez que se entra a esa skill.
        vista = self._vistas_skill.get(nombre)
        if vista is None:
            vista = crear_vista(self, self._volver_al_menu)
            self._vistas_skill[nombre] = vista
        # La vista cubre toda la ventana (mismo tamano que el menu, no
        # cambia) y queda por encima del menu (boton, fondo sakura, mascota)
        # sin necesidad de ocultarlos aparte.
        vista.place(x=0, y=0, relwidth=1, relheight=1)
        vista.lift()

    def _volver_al_menu(self):
        for vista in self._vistas_skill.values():
            vista.place_forget()


if __name__ == "__main__":
    if sys.platform == "win32":
        # Sin esto, al correr main.py directo con python.exe (antes de
        # compilarlo a .exe con PyInstaller) Windows agrupa la ventana bajo
        # el icono generico de python.exe en la barra de tareas, sin
        # importar lo que ya se le paso a iconbitmap() en _aplicar_icono().
        # Forzar un AppUserModelID propio hace que Windows trate este
        # proceso como su propia app y respete el icono real (icon.ico)
        # tambien ahi. Una vez compilado a .exe esto deja de hacer falta,
        # pero no molesta dejarlo.
        import ctypes

        try:
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
                "pollito.sofi.app"
            )
        except Exception:
            pass
    app = MenuPrincipal()
    app.mainloop()
