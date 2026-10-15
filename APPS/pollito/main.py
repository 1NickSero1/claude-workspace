"""Pollito - ventana principal (menu + vistas de skill).

Una sola ventana para toda la app: cada skill es un panel que cubre la
ventana entera y vuelve al menu con su boton "Atras" (skills/base.py), en
vez de abrir una ventana nueva por skill - asi el icono/titulo de la
ventana es siempre el mismo y no hay que andar cerrando ventanas viejas
para cambiar de skill.
"""
import os
import sys
import tkinter as tk
from pathlib import Path

import customtkinter as ctk
from PIL import Image

import tema
from config import APP_NAME, get_base_path
from estadisticas_uso import registrar_apertura
from skills import finanzas, gym_nutricion, maquillaje_skincare, moda, psicologia

# customtkinter revisa cada 100ms si el DPI del monitor cambio respecto al
# que detecto al crear la ventana (window.winfo_id() -> MonitorFromWindow) y,
# si detecta una diferencia, reescala TODA la UI de golpe - eso es lo que
# causaba que el recuadro de chat se viera bien el primer segundo y despues
# "saltara" con un espacio de mas (columnas internas de CTkScrollableFrame
# recalculadas con otro factor de escala). Ese reajuste automatico no hace
# falta (el cambio de tamano manual de la ventana se maneja aparte, ver
# _al_redimensionar) - se desactiva antes de crear cualquier ventana.
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

# Mensaje especial (pregunta del usuario, 2026-08-02): aparece UNA sola vez,
# la primera vez que Sofi abre Pollito en su PC - despues nunca mas, se
# marca en un archivo aparte en %APPDATA% (ver _ruta_marca_bienvenida).
MENSAJE_BIENVENIDA_ESPECIAL = (
    "Feliz aniversario, mi amor ♥\n\n"
    "Este es tu regalo: te hice a Pollito con mis propias manos, pensando "
    "en vos y en todo lo que sos capaz de lograr.\n\n"
    "Ojala te ayude a expandir tus conocimientos y algun dia te animes a "
    "crear tus propios proyectos, como hice yo con este.\n\n"
    "Te amo muchisimo."
)

# Tamano de arranque, y limites para cuando Sofi la agranda/achica a mano
# (pedido suyo): el minimo es el tamano original, con el que se diseño todo
# el layout; el maximo evita que el fondo decorativo se estire de mas.
TAMANO_VENTANA = (520, 700)
TAMANO_VENTANA_MINIMA = (420, 580)
TAMANO_VENTANA_MAXIMA = (900, 1000)
TAMANO_MASCOTA = 130


def _ruta_marca_bienvenida() -> Path:
    base = Path(os.environ.get("APPDATA", str(Path.home()))) / "Pollito"
    base.mkdir(parents=True, exist_ok=True)
    return base / "bienvenida_especial_mostrada.txt"

SKILLS = [
    ("Rosita", "Maquillaje y Skincare", maquillaje_skincare.crear_vista),
    ("Glow", "Moda", moda.crear_vista),
    ("Monito", "Finanzas", finanzas.crear_vista),
    ("Kiwi", "Gym y Nutricion", gym_nutricion.crear_vista),
    ("Nube", "Psicologia", psicologia.crear_vista),
]


class _Tooltip:
    """Tooltip simple que aparece al pasar el mouse sobre un boton, con la
    categoria "real" de la skill (ej. "Finanzas") - el nombre tierno ya se
    ve en el boton, esto solo aclara que hace. CTk no trae
    tooltips de fabrica, se arma a mano con un Toplevel de tkinter puro sin
    bordes (mas confiable para esto que CTkToplevel, que puede parpadear o
    aparecer en la barra de tareas en algunas configuraciones de Windows)."""

    def __init__(self, widget, texto):
        self._widget = widget
        self._texto = texto
        self._ventana = None
        widget.bind("<Enter>", self._mostrar, add="+")
        widget.bind("<Leave>", self._ocultar, add="+")

    def _mostrar(self, event=None):
        if self._ventana is not None or event is None:
            return
        self._ventana = tk.Toplevel(self._widget)
        self._ventana.wm_overrideredirect(True)
        self._ventana.wm_geometry(f"+{event.x_root + 14}+{event.y_root + 18}")
        tk.Label(
            self._ventana,
            text=self._texto,
            bg=tema.FONDO_SECUNDARIO,
            fg=tema.TEXTO,
            font=("Segoe UI", 10),
            padx=10,
            pady=4,
            relief="solid",
            borderwidth=1,
        ).pack()

    def _ocultar(self, event=None):
        if self._ventana is not None:
            self._ventana.destroy()
            self._ventana = None


class MenuPrincipal(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("{}x{}".format(*TAMANO_VENTANA))
        # minsize/maxsize se los impone Tk a Windows directamente - tambien
        # aplican a maximizar con Win+flecha arriba o Aero Snap.
        self.minsize(*TAMANO_VENTANA_MINIMA)
        self.maxsize(*TAMANO_VENTANA_MAXIMA)
        self.configure(fg_color=tema.FONDO)
        # Vistas de skill ya creadas, cacheadas por nombre para conservar su
        # conversacion al ir y volver del menu (no se recrean de cero cada
        # vez que se re-entra a la misma skill).
        self._vistas_skill = {}
        self._tamano_actual = TAMANO_VENTANA
        self._redimension_pendiente = None
        self._aplicar_icono()
        self._agregar_fondo_sakura()
        self._construir_ui()
        self._agregar_mascota()
        # Un bind en la ventana raiz tambien recibe los <Configure> de todos
        # sus hijos (bindtags de Tk) - _al_configurar filtra por widget.
        self.bind("<Configure>", self._al_configurar)
        # Se agenda con after() para que el menu ya este dibujado y
        # posicionado en pantalla antes de centrar el mensaje especial
        # sobre el (winfo_width/height necesitan la ventana ya mapeada).
        self.after(300, self._mostrar_bienvenida_especial)

    def _al_configurar(self, event=None):
        if event is not None and event.widget is not self:
            return
        tamano = (self.winfo_width(), self.winfo_height())
        if tamano == self._tamano_actual:
            return
        self._tamano_actual = tamano
        # <Configure> llega por cada pixel mientras arrastra el borde - se
        # agrupa y se recalcula una sola vez cuando deja de mover.
        if self._redimension_pendiente is not None:
            self.after_cancel(self._redimension_pendiente)
        self._redimension_pendiente = self.after(150, self._al_redimensionar)

    def _al_redimensionar(self):
        self._redimension_pendiente = None
        self._actualizar_fondo_sakura()
        self._posicionar_mascota()

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
        con la lectura de los botones. Se reescala al tamano actual de la
        ventana en _actualizar_fondo_sakura (tambien al redimensionar)."""
        self._etiqueta_fondo = None
        ruta_imagen = get_base_path() / "assets" / "fondo_sakura.png"
        if not ruta_imagen.exists():
            return
        self._imagen_fondo_pil = Image.open(ruta_imagen)
        self._etiqueta_fondo = ctk.CTkLabel(self, text="", fg_color="transparent")
        self._etiqueta_fondo.place(x=0, y=0)
        self._actualizar_fondo_sakura()

    def _actualizar_fondo_sakura(self):
        if self._etiqueta_fondo is None:
            return
        imagen = ctk.CTkImage(
            light_image=self._imagen_fondo_pil,
            dark_image=self._imagen_fondo_pil,
            size=self._tamano_actual,
        )
        self._etiqueta_fondo.configure(image=imagen)

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
        for nombre, categoria, crear_vista in SKILLS:
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
            _Tooltip(boton, categoria)
            self._ultimo_boton = boton

    def _agregar_mascota(self):
        """Pollito decorativo saliendo por el borde derecho de la ventana
        (recortado por Tk al no dibujar lo que queda fuera del area de la
        ventana) - se ve completo de arriba a abajo, solo se recorta a la
        derecha. Reusa el mismo arte que el icono
        (assets/generar_icono.py). La posicion se recalcula en
        _posicionar_mascota (tambien al redimensionar la ventana)."""
        self._etiqueta_mascota = None
        ruta_imagen = get_base_path() / "assets" / "icons" / "icon.png"
        if not ruta_imagen.exists():
            return
        imagen_pil = Image.open(ruta_imagen)
        imagen = ctk.CTkImage(
            light_image=imagen_pil, dark_image=imagen_pil, size=(TAMANO_MASCOTA, TAMANO_MASCOTA)
        )
        self._etiqueta_mascota = ctk.CTkLabel(self, image=imagen, text="", fg_color="transparent")
        self._posicionar_mascota()

    def _posicionar_mascota(self):
        if self._etiqueta_mascota is None:
            return
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

        self._etiqueta_mascota.place(x=x, y=y)

    def _abrir_skill(self, nombre, crear_vista):
        # Se cuenta cada click, se reuse o no la vista cacheada - asi refleja
        # cuanto entra Sofi a cada skill en la practica (ver
        # estadisticas_uso.py / ver_estadisticas.py).
        registrar_apertura(nombre)
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

    def _mostrar_bienvenida_especial(self):
        """Ventana modal con el mensaje de aniversario - se salta por
        completo si ya se mostro antes (ver _ruta_marca_bienvenida), asi
        que en cualquier apertura despues de la primera esto no hace nada."""
        if _ruta_marca_bienvenida().exists():
            return

        ancho, alto = 340, 420
        ventana = ctk.CTkToplevel(self)
        ventana.title("")
        ventana.geometry(f"{ancho}x{alto}")
        ventana.resizable(False, False)
        ventana.configure(fg_color=tema.FONDO)
        # transient + grab_set: queda encima del menu y bloquea que se
        # interactue con el de fondo hasta que la cierre - un mensaje asi
        # no deberia poder ignorarse sin querer de refilon.
        ventana.transient(self)
        ventana.grab_set()
        # Cerrar con la X de la ventana cuenta igual que el boton - en
        # cualquiera de los dos casos no debe volver a aparecer despues.
        ventana.protocol("WM_DELETE_WINDOW", lambda: self._cerrar_bienvenida_especial(ventana))

        ctk.CTkLabel(
            ventana,
            text=MENSAJE_BIENVENIDA_ESPECIAL,
            font=ctk.CTkFont(family="Segoe Print", size=14),
            text_color=tema.TEXTO,
            wraplength=280,
            justify="center",
        ).pack(pady=(36, 20), padx=24)

        ctk.CTkButton(
            ventana,
            text="Gracias, mi amor ♥",
            fg_color=tema.BOTON_PRINCIPAL,
            hover_color=tema.BOTON_PRINCIPAL_HOVER,
            text_color=tema.TEXTO,
            command=lambda: self._cerrar_bienvenida_especial(ventana),
        ).pack(pady=(0, 30))

        # Centrada sobre la ventana principal, no en una esquina cualquiera.
        self.update_idletasks()
        x = self.winfo_x() + (self.winfo_width() - ancho) // 2
        y = self.winfo_y() + (self.winfo_height() - alto) // 2
        ventana.geometry(f"+{x}+{y}")

    def _cerrar_bienvenida_especial(self, ventana):
        _ruta_marca_bienvenida().touch()
        ventana.destroy()


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
