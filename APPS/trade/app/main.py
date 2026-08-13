"""Trade - ventana principal.

A diferencia de Pollito (menu + 5 vistas de skill que se abren por
separado), esta app es una sola skill: la ventana ES el chat directamente,
sin pantalla de menu ni boton "Atras".
"""
import base64
import io
import os
import sys
import threading
import tkinter.font as tkfont
from pathlib import Path
from tkinter import filedialog

import anthropic
import customtkinter as ctk
import httpx
from PIL import Image

import tema
from bitacora import agregar_nota_bitacora, registrar_operacion
from config import (
    AGREGAR_NOTA_BITACORA_TOOL,
    APP_NAME,
    BIENVENIDA,
    CALCULAR_TAMANO_POSICION_TOOL,
    LIMITE_MENSAJES_SESION,
    MAX_TOKENS_RESPUESTA,
    MEMORY_TOOL,
    MENSAJE_BIENVENIDA_ESPECIAL,
    MODEL_ID,
    NOMBRE_USUARIO,
    REGISTRAR_OPERACION_TOOL,
    SYSTEM_PROMPT,
    THINKING_CONFIG,
    WEB_SEARCH_TOOL,
    get_api_key,
    get_base_path,
)
from memoria import manejador_memoria
from riesgo import calcular_tamano_posicion
from uso_mensual import limite_alcanzado, registrar_uso

# Despacho de herramientas de cliente por nombre - con una sola herramienta
# (memory) alcanzaba con llamarla directo, pero con mas de una hace falta
# mirar bloque.name para saber cual manejador le corresponde a cada una.
_MANEJADORES_HERRAMIENTAS_CLIENTE = {
    "memory": manejador_memoria,
    "registrar_operacion": registrar_operacion,
    "agregar_nota_bitacora": agregar_nota_bitacora,
    "calcular_tamano_posicion": calcular_tamano_posicion,
}


def _ejecutar_herramienta_cliente(bloque) -> dict:
    manejador = _MANEJADORES_HERRAMIENTAS_CLIENTE.get(bloque.name)
    contenido = (
        manejador(bloque.input) if manejador else f"Herramienta desconocida: {bloque.name}"
    )
    return {"type": "tool_result", "tool_use_id": bloque.id, "content": contenido}


def _resultados_sinteticos_pendientes(respuesta) -> list:
    """Construye tool_result sinteticos para cualquier bloque tool_use sin
    resolver en una respuesta (pasa cuando _llamar_api llega al tope de
    reintentos justo con una herramienta pendiente). Sin esto, ese tool_use
    queda sin su tool_result inmediatamente despues en el historial, y la
    API rechaza el PROXIMO mensaje con un error 400 hasta que se reinicia
    la app. Funcion pura (no toca self) para poder testearla sin mockear
    toda la ventana."""
    return [
        {
            "type": "tool_result",
            "tool_use_id": bloque.id,
            "content": "No se pudo completar - se alcanzo el limite de intentos de esta conversacion.",
            "is_error": True,
        }
        for bloque in respuesta.content
        if bloque.type == "tool_use"
    ]

# Prompt caching: el system prompt y las tools son identicos en CADA llamada
# de toda la sesion (tools nunca cambia; SYSTEM_PROMPT es una constante) -
# sin marcarlos como cacheables, cada llamada (incluidas las de
# continuacion dentro de un mismo turno cuando el modelo usa una
# herramienta) vuelve a pagar el precio completo de ~6000 tokens de system+
# tools de nuevo. El breakpoint va en el ULTIMO bloque de "system" - por el
# orden fijo con el que Anthropic arma el prefijo cacheable (tools, despues
# system, despues messages), un solo cache_control aca cubre tools+system
# juntos, no hace falta marcar tambien el ultimo tool por separado.
#
# ttl="1h" en vez del default de 5 min (verificado con una llamada real que
# la API lo acepta - usage.cache_creation.ephemeral_1h_input_tokens lo
# confirma): la escritura sale mas cara (2x el precio de input en vez de
# 1.25x), pero para el patron real de uso de Sebas -chatea, se toma su
# tiempo pensando/mirando su broker, vuelve- una ventana de 1h da muchos
# mas cache hits por sesion real que una de 5 min.
_SYSTEM_CACHEADO = [
    {
        "type": "text",
        "text": SYSTEM_PROMPT,
        "cache_control": {"type": "ephemeral", "ttl": "1h"},
    }
]
_TOOLS = [WEB_SEARCH_TOOL, MEMORY_TOOL, REGISTRAR_OPERACION_TOOL, AGREGAR_NOTA_BITACORA_TOOL, CALCULAR_TAMANO_POSICION_TOOL]

ctk.deactivate_automatic_dpi_awareness()
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")  # colores reales aplicados manualmente via tema.py

TAMANO_VENTANA = (420, 580)
TAMANO_MAX_MINIATURA = (220, 220)

# Formatos soportados por la API de Anthropic (vision). La extension manda
# el media_type - no se confia en el contenido del archivo para esto.
FORMATOS_IMAGEN = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}

# Limite de tamano de archivo de la API para imagenes (5 MB) - se valida
# antes de gastar tiempo/tokens codificando y mandando algo que la API va a
# rechazar de entrada.
TAMANO_MAX_IMAGEN_BYTES = 5 * 1024 * 1024

# El cuadro de mensaje crece con lo que va escribiendo (ver
# _ajustar_alto_entrada) hasta este tope de lineas visuales - de ahi para
# arriba sigue escribiendo pero el cuadro no crece mas (auto-scroll interno
# del widget, como WhatsApp/Telegram). Mismo patron y mismos nombres que
# APPS/pollito/skills/base.py.
_ENTRADA_LINEAS_MIN = 1
_ENTRADA_LINEAS_MAX = 5

# Tope de reintentos si el loop server-side de busqueda web pausa
# (stop_reason == "pause_turn") por llegar a su limite interno de
# iteraciones. Evita un loop infinito en un caso patologico.
_MAX_REINTENTOS_PAUSE_TURN = 5

_cliente = None
_cliente_lock = threading.Lock()


def _obtener_cliente() -> anthropic.Anthropic:
    """Cliente de Anthropic, creado de forma perezosa (recien en el primer
    mensaje) y una sola vez. trust_env=False fuerza a httpx a ignorar
    cualquier proxy configurado en Windows (registro/env vars) - sin esto,
    un proxy local activado por otro programa puede romper la conexion con
    un WinError 10054 en pleno handshake TLS."""
    global _cliente
    if _cliente is None:
        with _cliente_lock:
            if _cliente is None:
                _cliente = anthropic.Anthropic(
                    api_key=get_api_key(),
                    http_client=httpx.Client(trust_env=False),
                )
    return _cliente


class VentanaTrade(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title(APP_NAME)
        self.geometry("{}x{}".format(*TAMANO_VENTANA))
        self.resizable(False, False)
        # resizable(False, False) ya saca el boton de maximizar y el
        # arrastre de bordes, pero Windows igual puede maximizar la ventana
        # con Win+flecha arriba o Aero Snap - este bind lo revierte apenas
        # pasa, para que el tamano de la ventana sea siempre el mismo.
        self.bind("<Configure>", self._bloquear_maximizado)
        self.configure(fg_color=tema.FONDO)
        self._aplicar_icono()

        self.historial = []
        self._mensajes_enviados = 0
        # Evita mandar dos mensajes en paralelo (doble Enter, click repetido
        # en "Enviar") mientras se espera la respuesta de la API.
        self._esperando_respuesta = False
        # Imagen elegida (dict con media_type/data_b64/nombre/bytes) en
        # espera de que el usuario presione "Enviar" - None si no hay nada
        # adjunto todavia.
        self._imagen_adjunta = None
        # CTkImage no se puede recrear sobre la marcha sin mantener una
        # referencia propia - Tkinter la recolecta como basura si nada la
        # retiene, y la miniatura desaparece del chat sola.
        self._miniaturas_refs = []
        # Estado del cuadro de mensaje (CTkTextbox, sin placeholder nativo
        # como tenia el CTkEntry viejo - se reimplementa a mano, mismo
        # patron que APPS/pollito/skills/base.py, ver
        # _fijar_texto_gris/_limpiar_texto_gris/_al_desenfocar_entrada).
        self._placeholder_activo = False
        self._placeholder_texto_actual = "Escribe tu mensaje..."
        self._entrada_tiene_foco = False

        self._construir_ui()
        # Burbuja fija que explica que hace la app, mostrada como si hablara
        # primero - texto estatico, no se manda a la API ni cuenta contra el
        # limite de mensajes ni el gasto mensual.
        self._agregar_mensaje(APP_NAME, BIENVENIDA)
        # Se agenda con after() para que la ventana ya este dibujada y
        # posicionada en pantalla antes de centrar el mensaje especial sobre
        # ella (winfo_width/height necesitan la ventana ya mapeada).
        self.after(300, self._mostrar_bienvenida_especial)

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

    def _ruta_marca_bienvenida(self) -> Path:
        """Carpeta interna bajo el codename de proyecto ("Trade"), no bajo
        el nombre de marca ("TradePilot") - mismo criterio que
        memoria.py/uso_mensual.py/bitacora.py, para que esto no dependa de
        que el nombre de marca no vuelva a cambiar en el futuro."""
        base = Path(os.environ.get("APPDATA", str(Path.home()))) / "Trade"
        base.mkdir(parents=True, exist_ok=True)
        return base / "bienvenida_especial_mostrada.txt"

    def _mostrar_bienvenida_especial(self):
        """Ventana modal con el mensaje de cumpleanos - se salta por
        completo si ya se mostro antes (ver _ruta_marca_bienvenida), asi
        que en cualquier apertura despues de la primera esto no hace nada.
        Mismo mecanismo que Pollito, con la estetica propia de TradePilot
        (sin la tipografia/mascota pensadas para el tema rosa de Pollito)."""
        if self._ruta_marca_bienvenida().exists():
            return

        ancho, alto = 340, 420
        ventana = ctk.CTkToplevel(self)
        ventana.title("")
        ventana.geometry(f"{ancho}x{alto}")
        ventana.resizable(False, False)
        ventana.configure(fg_color=tema.FONDO)
        # transient + grab_set: queda encima de la ventana principal y
        # bloquea que se interactue con ella hasta que la cierre - un
        # mensaje asi no deberia poder ignorarse sin querer de refilon.
        ventana.transient(self)
        ventana.grab_set()
        ventana.protocol("WM_DELETE_WINDOW", lambda: self._cerrar_bienvenida_especial(ventana))

        ctk.CTkLabel(
            ventana,
            text=MENSAJE_BIENVENIDA_ESPECIAL,
            font=ctk.CTkFont(size=14),
            text_color=tema.TEXTO,
            wraplength=280,
            justify="center",
        ).pack(pady=(36, 20), padx=24)

        ctk.CTkButton(
            ventana,
            text="Gracias 💪",
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
        self._ruta_marca_bienvenida().touch()
        ventana.destroy()

    def _construir_ui(self):
        ctk.CTkLabel(
            self,
            text=APP_NAME,
            font=ctk.CTkFont(size=24, weight="bold"),
            text_color=tema.TEXTO,
        ).pack(pady=(20, 12))

        self.area_chat = ctk.CTkScrollableFrame(
            self,
            fg_color=tema.FONDO_SECUNDARIO,
            border_color=tema.ACENTO,
            border_width=2,
        )
        self.area_chat.pack(fill="both", expand=True, padx=16, pady=(0, 8))
        # Arranca oculta - recien se muestra cuando la conversacion ya no
        # entra completa en la ventana (ver _actualizar_scrollbar). Mismo
        # mecanismo ya probado en APPS/pollito/skills/base.py: no hay una
        # opcion publica en CTkScrollableFrame para esto, se maneja el
        # widget interno directamente.
        _pf = self.area_chat._parent_frame
        self._border_spacing = _pf._apply_widget_scaling(_pf._corner_radius + _pf._border_width)
        self.area_chat._scrollbar.grid_remove()
        self.area_chat._parent_canvas.grid_configure(padx=(self._border_spacing, self._border_spacing))
        self.area_chat._parent_canvas.bind(
            "<Configure>", lambda evento: self._actualizar_scrollbar(), add="+"
        )

        # Chip de imagen adjunta - se crea sin pack() (arranca oculto) y
        # solo se muestra/rellena cuando hay una imagen elegida
        # (ver _mostrar_adjunto / _quitar_adjunto).
        self.frame_adjunto = ctk.CTkFrame(self, fg_color=tema.FONDO_SECUNDARIO, corner_radius=10)

        frame_input = ctk.CTkFrame(self, fg_color="transparent")
        frame_input.pack(fill="x", padx=16, pady=(0, 16))
        self.frame_input = frame_input

        self.boton_adjuntar = ctk.CTkButton(
            frame_input,
            text="📷",
            width=40,
            fg_color=tema.FONDO_SECUNDARIO,
            hover_color=tema.BOTON_PRINCIPAL_HOVER,
            text_color=tema.TEXTO,
            command=self._elegir_imagen,
        )
        self.boton_adjuntar.pack(side="left", padx=(0, 8))

        # CTkTextbox en vez de CTkEntry: crece de a poco a medida que
        # escribe (ver _ajustar_alto_entrada) para que pueda ver todo el
        # mensaje, algo que un CTkEntry (una sola linea, sin wrap) no puede
        # hacer. No tiene placeholder nativo como el CTkEntry - se
        # reimplementa a mano (_fijar_texto_gris/_limpiar_texto_gris).
        # Mismo patron que APPS/pollito/skills/base.py.
        self._entrada_alto_base_px = 32
        self.entrada = ctk.CTkTextbox(
            frame_input,
            height=self._entrada_alto_base_px,
            fg_color=tema.FONDO,
            text_color=tema.TEXTO_SECUNDARIO,
            border_color=tema.ACENTO,
            border_width=1,
            wrap="word",
            activate_scrollbars=False,
        )
        self._entrada_alto_por_linea_px = tkfont.Font(
            font=self.entrada._textbox.cget("font")
        ).metrics("linespace")
        self.entrada.pack(side="left", fill="x", expand=True, padx=(0, 8))
        # <Return> manda el mensaje en vez de insertar un salto de linea
        # ("break" corta la propagacion al binding de clase que inserta el
        # \n por defecto) - Shift+Return es una secuencia distinta, no la
        # toca este binding, asi que sigue insertando un salto de linea
        # normal si alguna vez hace falta un mensaje de varias lineas.
        self.entrada.bind("<Return>", self._al_apretar_enter)
        self.entrada.bind("<KeyRelease>", self._ajustar_alto_entrada)
        # CTkTextbox no cambia de color al enfocarse y tampoco tiene
        # placeholder propio, asi que ambas cosas se resuelven en el mismo
        # handler de foco.
        self.entrada.bind("<FocusIn>", self._al_enfocar_entrada)
        self.entrada.bind("<FocusOut>", self._al_desenfocar_entrada)
        self._fijar_texto_gris(self._placeholder_texto_actual)

        self.boton_enviar = ctk.CTkButton(
            frame_input,
            text="Enviar",
            width=80,
            fg_color=tema.BOTON_PRINCIPAL,
            hover_color=tema.BOTON_PRINCIPAL_HOVER,
            text_color=tema.TEXTO,
            command=self._enviar,
        )
        self.boton_enviar.pack(side="right")

    def _texto_entrada_crudo(self) -> str:
        """Contenido real del cuadro de mensaje, sin el "-1c" final que
        tkinter.Text siempre agrega (el \\n implicito de fin de buffer)."""
        return self.entrada.get("1.0", "end-1c")

    def _ajustar_alto_entrada(self, evento=None):
        """Agranda (o achica) el cuadro de mensaje segun cuantas lineas
        visuales ocupa el texto actual (contando el wrap real, no solo los
        saltos de linea explicitos), hasta el tope _ENTRADA_LINEAS_MAX -
        asi puede ver todo lo que va escribiendo en vez de quedar cortado
        en una sola linea."""
        lineas = self.entrada._textbox.count("1.0", "end", "displaylines")
        lineas = lineas[0] if isinstance(lineas, tuple) else (lineas or 1)
        lineas = max(_ENTRADA_LINEAS_MIN, min(lineas, _ENTRADA_LINEAS_MAX))
        alto = self._entrada_alto_base_px + (lineas - 1) * self._entrada_alto_por_linea_px
        if alto != getattr(self, "_entrada_alto_actual_px", None):
            self._entrada_alto_actual_px = alto
            self.entrada.configure(height=alto)

    def _resetear_alto_entrada(self):
        """Vuelve el cuadro a su alto base (una linea) sin medir nada -
        usado al limpiar el texto o poner un placeholder (siempre entran en
        una linea). A diferencia de _ajustar_alto_entrada, no depende de
        que el widget ya tenga su ancho real asignado por el geometry
        manager."""
        if getattr(self, "_entrada_alto_actual_px", None) != self._entrada_alto_base_px:
            self._entrada_alto_actual_px = self._entrada_alto_base_px
            self.entrada.configure(height=self._entrada_alto_base_px)

    def _al_apretar_enter(self, evento=None):
        self._enviar()
        return "break"

    def _fijar_texto_gris(self, texto: str):
        """Sobreescribe el cuadro con un texto gris (el placeholder normal
        o el aviso "Esperando respuesta..." mientras llega la API) -
        respeta el estado disabled/normal en el que este (un Text
        deshabilitado no deja hacer insert/delete, hay que reactivarlo un
        instante y devolverlo como estaba)."""
        self._placeholder_activo = True
        # CTkTextbox.cget() no reconoce "state" (solo lo pasa a construir /
        # configure) - hay que leerlo del tkinter.Text interno directamente.
        estado_previo = self.entrada._textbox.cget("state")
        if estado_previo == "disabled":
            self.entrada.configure(state="normal")
        self.entrada.delete("1.0", "end")
        self.entrada.insert("1.0", texto)
        self.entrada.configure(text_color=tema.TEXTO_SECUNDARIO)
        if estado_previo == "disabled":
            self.entrada.configure(state="disabled")
        self._resetear_alto_entrada()

    def _limpiar_texto_gris(self):
        if self._placeholder_activo:
            self._placeholder_activo = False
            self.entrada.delete("1.0", "end")
            self.entrada.configure(text_color=tema.TEXTO)
            self._resetear_alto_entrada()

    def _al_enfocar_entrada(self, evento=None):
        self._entrada_tiene_foco = True
        self.entrada.configure(border_color=tema.TEXTO)
        self._limpiar_texto_gris()

    def _al_desenfocar_entrada(self, evento=None):
        self._entrada_tiene_foco = False
        self.entrada.configure(border_color=tema.ACENTO)
        if self._texto_entrada_crudo() == "":
            self._fijar_texto_gris(self._placeholder_texto_actual)

    def _elegir_imagen(self):
        ruta_elegida = filedialog.askopenfilename(
            title="Elegi una captura del trade",
            filetypes=[("Imagenes", "*.png *.jpg *.jpeg *.webp *.gif")],
        )
        if not ruta_elegida:
            return

        ruta = Path(ruta_elegida)
        media_type = FORMATOS_IMAGEN.get(ruta.suffix.lower())
        if media_type is None:
            self._agregar_mensaje(
                "Sistema", "Formato de imagen no soportado. Usa PNG, JPG, WEBP o GIF."
            )
            return

        datos = ruta.read_bytes()
        if len(datos) > TAMANO_MAX_IMAGEN_BYTES:
            self._agregar_mensaje(
                "Sistema", "La imagen pesa demasiado (maximo 5 MB). Proba con una mas liviana."
            )
            return

        self._imagen_adjunta = {
            "media_type": media_type,
            "data_b64": base64.b64encode(datos).decode("ascii"),
            "nombre": ruta.name,
            "bytes": datos,
        }
        self._mostrar_adjunto(ruta.name)

    def _mostrar_adjunto(self, nombre_archivo: str):
        for widget in self.frame_adjunto.winfo_children():
            widget.destroy()

        ctk.CTkLabel(
            self.frame_adjunto,
            text=f"🖼 {nombre_archivo}",
            text_color=tema.TEXTO_SECUNDARIO,
            font=ctk.CTkFont(size=12),
        ).pack(side="left", padx=(10, 6), pady=6)

        ctk.CTkButton(
            self.frame_adjunto,
            text="✕",
            width=24,
            height=24,
            corner_radius=12,
            fg_color=tema.FONDO,
            hover_color=tema.BOTON_PRINCIPAL_HOVER,
            text_color=tema.TEXTO,
            command=self._quitar_adjunto,
        ).pack(side="right", padx=(6, 10), pady=6)

        # before=frame_input asegura que el chip quede siempre arriba del
        # campo de texto sin importar el orden real de llamadas a pack().
        self.frame_adjunto.pack(fill="x", padx=16, pady=(0, 6), before=self.frame_input)

    def _quitar_adjunto(self):
        self._imagen_adjunta = None
        self.frame_adjunto.pack_forget()

    def _crear_miniatura(self, datos_bytes: bytes):
        imagen_pil = Image.open(io.BytesIO(datos_bytes))
        imagen_pil.thumbnail(TAMANO_MAX_MINIATURA)
        miniatura = ctk.CTkImage(
            light_image=imagen_pil, dark_image=imagen_pil, size=imagen_pil.size
        )
        # Ver comentario junto a self._miniaturas_refs en __init__.
        self._miniaturas_refs.append(miniatura)
        return miniatura

    def _agregar_mensaje(self, remitente: str, texto: str, miniatura=None):
        """Agrega un mensaje al chat como burbuja (estilo WhatsApp): los
        propios a la derecha, las respuestas de la app a la izquierda. Los
        avisos del sistema (errores, limites) van centrados y sin burbuja.
        miniatura (CTkImage opcional) se dibuja arriba del texto, para las
        capturas de trades que el usuario adjunta."""
        fila = ctk.CTkFrame(self.area_chat, fg_color="transparent")
        fila.pack(fill="x", pady=4)

        if remitente == "Sistema":
            ctk.CTkLabel(
                fila,
                text=texto,
                text_color=tema.TEXTO_SECUNDARIO,
                font=ctk.CTkFont(size=12, slant="italic"),
                wraplength=340,
                justify="center",
            ).pack(anchor="center")
        else:
            es_propio = remitente == NOMBRE_USUARIO
            contenedor = ctk.CTkFrame(fila, fg_color="transparent")
            contenedor.pack(
                side="right" if es_propio else "left",
                anchor="e" if es_propio else "w",
            )

            ctk.CTkLabel(
                contenedor,
                text=remitente,
                text_color=tema.TEXTO_SECUNDARIO,
                font=ctk.CTkFont(size=11, weight="bold"),
            ).pack(anchor="e" if es_propio else "w", padx=4)

            # Antes la burbuja era un CTkLabel directo (un solo texto). Ahora
            # es un frame contenedor porque puede llevar miniatura + texto,
            # o solo uno de los dos.
            burbuja = ctk.CTkFrame(
                contenedor,
                fg_color=tema.BOTON_PRINCIPAL if es_propio else tema.BURBUJA_TRADE,
                corner_radius=16,
            )
            burbuja.pack(anchor="e" if es_propio else "w")

            if miniatura is not None:
                ctk.CTkLabel(burbuja, image=miniatura, text="").pack(
                    padx=8, pady=(8, 4 if texto else 8)
                )
            if texto:
                ctk.CTkLabel(
                    burbuja,
                    text=texto,
                    text_color=tema.TEXTO,
                    wraplength=280,
                    justify="left",
                    anchor="w",
                ).pack(padx=10, pady=(0, 8) if miniatura is not None else (6, 6), fill="x")

        self.after(10, self._refrescar_scroll)

    def _refrescar_scroll(self):
        self.area_chat._parent_canvas.yview_moveto(1.0)
        self._actualizar_scrollbar()

    def _actualizar_scrollbar(self):
        """Muestra la barra de scroll solo si la conversacion ya no entra
        completa en el area visible - el resto del tiempo queda
        completamente afuera del layout (no solo escondida), igual que en
        Pollito."""
        canvas = self.area_chat._parent_canvas
        # Fuerza a Tkinter a terminar el recalculo de layout pendiente antes
        # de leer bbox/altura - sin esto, a veces la comparacion de abajo
        # corre con medidas todavia viejas y la barra no aparece aunque el
        # contenido desborde.
        self.update_idletasks()
        bbox = canvas.bbox("all")
        if bbox is None:
            return
        contenido_alto = bbox[3] - bbox[1]
        if contenido_alto > canvas.winfo_height():
            self.area_chat._scrollbar.grid()
            canvas.grid_configure(padx=(self._border_spacing, 0))
        else:
            self.area_chat._scrollbar.grid_remove()
            canvas.grid_configure(padx=(self._border_spacing, self._border_spacing))

    def _enviar(self):
        if self._esperando_respuesta:
            return

        mensaje = "" if self._placeholder_activo else self._texto_entrada_crudo().strip()
        # Se puede mandar solo imagen (sin texto), solo texto, o ambos - lo
        # unico invalido es no mandar nada.
        if not mensaje and self._imagen_adjunta is None:
            return

        if self._mensajes_enviados >= LIMITE_MENSAJES_SESION:
            self._agregar_mensaje(
                "Sistema",
                f"Se alcanzo el limite de mensajes de esta sesion. Reinicia "
                f"{APP_NAME} para seguir chateando.",
            )
            return

        # Verificacion del limite de gasto mensual ANTES de llamar a la API.
        if limite_alcanzado():
            self._agregar_mensaje(
                "Sistema",
                "Se alcanzo el limite de gasto mensual. Intenta de nuevo el "
                "mes que viene.",
            )
            return

        self.entrada.delete("1.0", "end")
        self._resetear_alto_entrada()

        bloques = []
        miniatura = None
        if self._imagen_adjunta is not None:
            bloques.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": self._imagen_adjunta["media_type"],
                        "data": self._imagen_adjunta["data_b64"],
                    },
                }
            )
            miniatura = self._crear_miniatura(self._imagen_adjunta["bytes"])
        if mensaje:
            bloques.append({"type": "text", "text": mensaje})

        self._agregar_mensaje(NOMBRE_USUARIO, mensaje, miniatura=miniatura)
        self.historial.append({"role": "user", "content": bloques})
        self._mensajes_enviados += 1

        self._imagen_adjunta = None
        self.frame_adjunto.pack_forget()

        self._esperando_respuesta = True
        self._placeholder_texto_actual = "Esperando respuesta..."
        self.entrada.configure(state="disabled")
        self._fijar_texto_gris(self._placeholder_texto_actual)
        self.boton_enviar.configure(state="disabled")
        self.boton_adjuntar.configure(state="disabled")

        threading.Thread(target=self._llamar_api, daemon=True).start()

    def _finalizar_envio(self):
        self._esperando_respuesta = False
        self.entrada.configure(state="normal")
        self.boton_enviar.configure(state="normal")
        self.boton_adjuntar.configure(state="normal")
        self._placeholder_texto_actual = "Escribe tu mensaje..."
        # Mandar con Enter no le saca el foco al campo - si sigue enfocado
        # no hay que insertar el placeholder, porque no se va a limpiar
        # solo cuando siga escribiendo (no se dispara un <FocusIn> nuevo).
        # Sin este chequeo el placeholder queda insertado de verdad y lo
        # que escriba a continuacion se pega DESPUES ("Escribe tu
        # mensaje...hola") en vez de reemplazarlo - este es justo el bug
        # que se arreglo en Pollito y se porta aca igual.
        if self._entrada_tiene_foco:
            self._limpiar_texto_gris()
        else:
            self._fijar_texto_gris(self._placeholder_texto_actual)

    def _llamar_api(self):
        mensajes = list(self.historial)
        tokens_entrada_totales = 0
        tokens_salida_totales = 0
        tokens_cache_escritura_totales = 0
        tokens_cache_lectura_totales = 0
        intentos = 0

        try:
            cliente = _obtener_cliente()

            while True:
                respuesta = cliente.messages.create(
                    model=MODEL_ID,
                    max_tokens=MAX_TOKENS_RESPUESTA,
                    system=_SYSTEM_CACHEADO,
                    tools=_TOOLS,
                    thinking=THINKING_CONFIG,
                    messages=mensajes,
                )
                tokens_entrada_totales += respuesta.usage.input_tokens
                tokens_salida_totales += respuesta.usage.output_tokens
                # getattr con default: campos nuevos de la API (prompt
                # caching) - por las dudas de correr contra una version
                # vieja del SDK/API que todavia no los devuelva.
                tokens_cache_escritura_totales += (
                    getattr(respuesta.usage, "cache_creation_input_tokens", 0) or 0
                )
                tokens_cache_lectura_totales += (
                    getattr(respuesta.usage, "cache_read_input_tokens", 0) or 0
                )

                if intentos >= _MAX_REINTENTOS_PAUSE_TURN:
                    break

                if respuesta.stop_reason == "tool_use":
                    # Herramientas de cliente (memoria, bitacora) ejecutadas
                    # del lado cliente, despachadas por nombre (ver
                    # _ejecutar_herramienta_cliente). Se ejecuta cada bloque
                    # tool_use, se devuelven todos los tool_result juntos en
                    # un solo mensaje de usuario, y se vuelve a llamar a la
                    # API para que continue con el resultado.
                    resultados = [
                        _ejecutar_herramienta_cliente(bloque)
                        for bloque in respuesta.content
                        if bloque.type == "tool_use"
                    ]
                    mensajes = mensajes + [
                        {"role": "assistant", "content": respuesta.content},
                        {"role": "user", "content": resultados},
                    ]
                    intentos += 1
                    continue

                if respuesta.stop_reason == "pause_turn":
                    # El loop server-side de busqueda web llego a su limite
                    # interno de iteraciones. Se reenvia el historial
                    # completo mas el turno del asistente pausado - NO se
                    # agrega ningun mensaje nuevo de usuario tipo
                    # "Continue", la API detecta el bloque server_tool_use
                    # pendiente y retoma sola.
                    mensajes = mensajes + [{"role": "assistant", "content": respuesta.content}]
                    intentos += 1
                    continue

                break

        except anthropic.AuthenticationError:
            self.after(
                0,
                lambda: self._agregar_mensaje(
                    "Sistema", "Falta configurar la API key correctamente (revisa secreto.py)."
                ),
            )
            return
        except anthropic.APIConnectionError:
            self.after(
                0,
                lambda: self._agregar_mensaje(
                    "Sistema", "No se pudo conectar a internet. Intenta de nuevo."
                ),
            )
            return
        except anthropic.RateLimitError:
            self.after(
                0,
                lambda: self._agregar_mensaje(
                    "Sistema",
                    "Demasiadas solicitudes por ahora. Espera un momento e "
                    "intenta de nuevo.",
                ),
            )
            return
        except anthropic.APIStatusError:
            self.after(
                0,
                lambda: self._agregar_mensaje(
                    "Sistema", "Hubo un error con el servicio de IA. Intenta de nuevo mas tarde."
                ),
            )
            return
        except Exception:
            self.after(
                0,
                lambda: self._agregar_mensaje(
                    "Sistema", "Ocurrio un error inesperado. Intenta de nuevo."
                ),
            )
            return
        finally:
            # Corre siempre (exito o cualquiera de los except de arriba, aun
            # con el "return" adentro) - reactiva el input una sola vez por
            # llamada, sin duplicar la logica en cada camino de salida.
            self.after(0, self._finalizar_envio)

        # Concatena solo los bloques de texto, ignorando bloques de busqueda
        # web (server_tool_use / web_search_tool_result) y de pensamiento.
        texto_final = "".join(
            bloque.text for bloque in respuesta.content if bloque.type == "text"
        )

        # Se guarda el turno completo del asistente (response.content, no
        # solo el texto) para conservar contexto de las herramientas
        # server-side usadas en proximos mensajes.
        self.historial.append({"role": "assistant", "content": respuesta.content})

        if respuesta.stop_reason == "tool_use":
            # Solo puede pasar aca si el loop de arriba corto por el tope de
            # reintentos (_MAX_REINTENTOS_PAUSE_TURN) con una herramienta
            # todavia sin resolver - ver _resultados_sinteticos_pendientes.
            self.historial.append(
                {"role": "user", "content": _resultados_sinteticos_pendientes(respuesta)}
            )
            if not texto_final:
                texto_final = (
                    "Se tardo mas de la cuenta procesando esto - proba de nuevo "
                    "con un mensaje mas simple."
                )

        registrar_uso(
            tokens_entrada_totales,
            tokens_salida_totales,
            tokens_cache_escritura_totales,
            tokens_cache_lectura_totales,
        )

        self.after(
            0,
            lambda: self._agregar_mensaje(APP_NAME, texto_final or "(sin respuesta)"),
        )


if __name__ == "__main__":
    if sys.platform == "win32":
        # Sin esto, al correr main.py directo con python.exe (antes de
        # compilarlo a .exe con PyInstaller) Windows agrupa la ventana bajo
        # el icono generico de python.exe en la barra de tareas. Forzar un
        # AppUserModelID propio hace que Windows trate este proceso como su
        # propia app. Una vez compilado a .exe esto deja de hacer falta,
        # pero no molesta dejarlo.
        import ctypes

        try:
            ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
                "trade.sebas.app"
            )
        except Exception:
            pass
    app = VentanaTrade()
    app.mainloop()
