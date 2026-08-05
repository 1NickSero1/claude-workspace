"""Vista de chat generica, reutilizada por cada una de las 5 skills.

Cada skill le pasa su propio system_prompt; el codigo de vista/UI es el
mismo para las 5. No es una ventana propia (ver main.py): es un panel que
ocupa toda la ventana principal y vuelve al menu con el boton "Atras" en
vez de abrir/cerrar una ventana nueva por cada skill. _llamar_api() hace la
llamada real a la API de Anthropic (Claude Sonnet 5), con busqueda web
server-side habilitada por defecto. Tambien soporta adjuntar una foto o un
PDF por mensaje (boton 📎) - se manda como bloque de imagen/documento nativo
de la API, asi que las 5 skills lo "leen" solas sin cambios propios.
"""
import base64
import threading
import tkinter.font as tkfont
from pathlib import Path
from tkinter import filedialog
from typing import Callable, Optional

import anthropic
import customtkinter as ctk
import httpx

import tema
from config import (
    LIMITE_MENSAJES_SESION,
    MAX_TOKENS_RESPUESTA,
    MODEL_ID,
    THINKING_CONFIG,
    WEB_SEARCH_TOOL,
    get_api_key,
)
from uso_mensual import limite_alcanzado, registrar_uso

# Tope de reintentos si el loop server-side de busqueda web pausa
# (stop_reason == "pause_turn") por llegar a su limite interno de
# iteraciones. Evita un loop infinito en un caso patologico.
_MAX_REINTENTOS_PAUSE_TURN = 5

# Extensiones soportadas para adjuntar, mapeadas a su media_type real (no al
# tipo de bloque de la API - ver ADJUNTOS_TIPO_BLOQUE) y su tamano maximo en
# bytes. Limites de la API de Anthropic: 5MB por imagen, 32MB por documento.
_TIPOS_IMAGEN = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
}
_TIPOS_DOCUMENTO = {".pdf": "application/pdf"}
_TAMANO_MAXIMO_IMAGEN_BYTES = 5 * 1024 * 1024
_TAMANO_MAXIMO_DOCUMENTO_BYTES = 32 * 1024 * 1024

# El cuadro de mensaje crece con lo que va escribiendo (ver
# _ajustar_alto_entrada) hasta este tope de lineas visuales - de ahi para
# arriba sigue escribiendo pero el cuadro no crece mas (auto-scroll interno
# del widget, como WhatsApp/Telegram).
_ENTRADA_LINEAS_MIN = 1
_ENTRADA_LINEAS_MAX = 5


def construir_intro_bienvenida(nombre: str) -> str:
    """Introduccion compartida al inicio del saludo de bienvenida de las 5
    skills (ver mensaje_bienvenida en VistaChat) - mismo texto en las 5,
    una sola funcion para editarlo. Recibe el nombre propio que Sofi le
    ponga a cada asistente (hoy cada skill usa su TITULO generico como
    placeholder - ej. "Finanzas" - hasta que ella los defina, ver TODO en
    cada archivo de skills/). Corazon clasico U+2665, no emoji rosa, por la
    misma razon de compatibilidad que en main.py (SALUDO)."""
    return (
        f"¡Hola Sofi! ♥ Soy {nombre}, creado por tu novio para ayudarte en "
        "tus tareas diarias. Recorda que el te quiere mucho. "
    )


_cliente: Optional[anthropic.Anthropic] = None
_cliente_lock = threading.Lock()


def _marcar_cache_en_ultimo_mensaje(mensaje: dict) -> dict:
    """Copia el mensaje con cache_control en su ultimo bloque de contenido -
    marca hasta donde cachear el historial de la conversacion para esta
    llamada puntual. No modifica el mensaje original (self.historial queda
    intacto): cada llamada arma su propia copia con la marca en el nuevo
    ultimo mensaje, no hace falta "borrar" la marca de la llamada anterior -
    el cache busca el prefijo mas largo que calce con lo ya guardado, sin
    importar en que mensaje viejo haya quedado un cache_control anterior."""
    contenido = mensaje["content"]
    if isinstance(contenido, str):
        bloques = [{"type": "text", "text": contenido}]
    else:
        # Los turnos del asistente guardan los bloques de respuesta reales
        # del SDK (TextBlock, ToolUseBlock, etc - objetos pydantic, no
        # dicts); se convierten para poder anexarles cache_control.
        bloques = [
            bloque.model_dump() if hasattr(bloque, "model_dump") else dict(bloque)
            for bloque in contenido
        ]
    bloques[-1] = {**bloques[-1], "cache_control": {"type": "ephemeral"}}
    return {**mensaje, "content": bloques}


def _obtener_cliente() -> anthropic.Anthropic:
    """Cliente de Anthropic compartido por las 5 vistas de chat, creado
    de forma perezosa (recien en el primer mensaje) y una sola vez.
    trust_env=False fuerza a httpx a ignorar cualquier proxy configurado
    en Windows (registro/env vars) - sin esto, un proxy local activado por
    otro programa (una VPN, una herramienta de desarrollo, etc.) puede
    romper la conexion con un WinError 10054 en pleno handshake TLS,
    aunque el resto de la PC tenga internet normal."""
    global _cliente
    if _cliente is None:
        with _cliente_lock:
            if _cliente is None:
                _cliente = anthropic.Anthropic(
                    api_key=get_api_key(),
                    http_client=httpx.Client(trust_env=False),
                )
    return _cliente


class VistaChat(ctk.CTkFrame):
    def __init__(
        self,
        parent,
        titulo: str,
        system_prompt: str,
        volver: Callable[[], None],
        tools=None,
        acento: Optional[str] = None,
        manejadores_herramientas_cliente: Optional[dict] = None,
        mensaje_bienvenida: Optional[str] = None,
        boton_extra_texto: Optional[str] = None,
        boton_extra_comando: Optional[Callable[["VistaChat"], None]] = None,
    ):
        super().__init__(parent, fg_color=tema.FONDO)
        # Se guarda como atributo propio (no hay wm_title en un Frame) -
        # se usa como remitente de las respuestas en el chat.
        self.titulo = titulo
        self.system_prompt = system_prompt
        # Por defecto, las 5 skills tienen busqueda web habilitada.
        self.tools = tools if tools is not None else [WEB_SEARCH_TOOL]
        self.acento = acento or tema.BOTON_PRINCIPAL
        # Herramientas ejecutadas del lado cliente, por nombre de tool (ej.
        # "memory" -> skills/memoria.py, "excel_finanzas" ->
        # finanzas_excel.py) - cada skill pasa las suyas, una skill puede
        # tener varias (ver skills/finanzas.py).
        self.manejadores_herramientas_cliente = manejadores_herramientas_cliente or {}
        # Boton opcional extra en la barra de mensaje (ej. "📊" en Finanzas
        # para conectar el excel) - recibe esta misma vista como argumento,
        # asi la skill puede mostrar avisos con self._agregar_mensaje sin
        # que base.py tenga que conocer nada especifico de esa skill.
        self._boton_extra_texto = boton_extra_texto
        self._boton_extra_comando = boton_extra_comando
        self.historial = []
        self._mensajes_enviados = 0
        # Foto o PDF elegido con el boton 📎, pendiente de mandar en el
        # proximo _enviar() - ver _elegir_adjunto/_quitar_adjunto.
        self._adjunto_pendiente: Optional[dict] = None
        # Evita mandar dos mensajes en paralelo (doble Enter, click repetido
        # en "Enviar") mientras se espera la respuesta de la API - sin esto,
        # dos hilos de _llamar_api corriendo a la vez pueden gastar tokens de
        # mas y desordenar self.historial (dos hilos escribiendolo a la vez).
        self._esperando_respuesta = False
        # Estado del cuadro de mensaje (CTkTextbox, sin placeholder nativo
        # como tenia el CTkEntry viejo - se reimplementa a mano, ver
        # _fijar_texto_gris/_limpiar_texto_gris/_al_desenfocar_entrada).
        self._placeholder_activo = False
        self._placeholder_texto_actual = "Escribe tu mensaje..."
        self._entrada_tiene_foco = False
        self._construir_ui(volver)
        if mensaje_bienvenida:
            # Burbuja fija que explica que hace la skill, mostrada como si la
            # skill hablara primero - texto estatico, no se manda a la API
            # ni se cuenta en el historial de la conversacion (no gasta
            # tokens ni cuenta contra el limite diario).
            self._agregar_mensaje(titulo, mensaje_bienvenida)

    def _construir_ui(self, volver):
        encabezado = ctk.CTkFrame(self, fg_color="transparent")
        encabezado.pack(fill="x", padx=16, pady=(16, 0))

        # Circulo simple con solo la flecha - sin la palabra "Atras", se
        # entiende igual y se ve mas prolijo.
        boton_volver = ctk.CTkButton(
            encabezado,
            text="←",
            width=32,
            height=32,
            corner_radius=16,
            font=ctk.CTkFont(size=16, weight="bold"),
            fg_color=tema.FONDO_SECUNDARIO,
            hover_color=self.acento,
            text_color=tema.TEXTO,
            command=volver,
        )
        boton_volver.pack(side="left")

        ctk.CTkLabel(
            encabezado,
            text=self.titulo,
            font=ctk.CTkFont(size=16, weight="bold"),
            text_color=tema.TEXTO,
        ).pack(side="left", padx=(10, 0))

        self.area_chat = ctk.CTkScrollableFrame(
            self,
            fg_color=tema.FONDO_SECUNDARIO,
            border_color=self.acento,
            # Con border_width=2 el limite del recuadro era casi invisible:
            # FONDO (#FFF5F8) y FONDO_SECUNDARIO (#FCE8EF) son rosas casi
            # identicos, y con un borde tan fino no se notaba donde terminaba
            # el recuadro (aunque el relleno si llegaba bien hasta el borde,
            # confirmado midiendo pixel por pixel). Mas grueso, el limite se
            # ve sin ambiguedad.
            border_width=4,
        )
        self.area_chat.pack(fill="both", expand=True, padx=16, pady=(12, 8))
        # Causa real del "escaloncito" en la esquina superior derecha: el
        # canvas interno de CTkScrollableFrame solo tiene padding a la
        # izquierda (padx=(border_spacing, 0)) porque normalmente la barra
        # de scroll, al lado, le deja el respiro necesario a la derecha para
        # la curva de la esquina redondeada. Al sacar la barra del layout
        # (grid_remove) el canvas se estira hasta el borde y su contenido
        # cuadrado invade esa curva. Se guarda el mismo border_spacing que
        # usa CTkScrollableFrame internamente para reponerselo a mano.
        _pf = self.area_chat._parent_frame
        self._border_spacing = _pf._apply_widget_scaling(_pf._corner_radius + _pf._border_width)
        # Arranca oculta - recien se muestra cuando la conversacion ya no
        # entra completa en la ventana (ver _actualizar_scrollbar). No hay
        # una opcion publica en CTkScrollableFrame para esto, se maneja el
        # widget interno directamente.
        self.area_chat._scrollbar.grid_remove()
        self.area_chat._parent_canvas.grid_configure(padx=(self._border_spacing, self._border_spacing))
        # Recalcula cuando el canvas interno cambia de tamano de verdad (la
        # primera vez que la ventana termina de acomodarse, por ejemplo) -
        # add="+" para no pisar el binding interno de CTkScrollableFrame que
        # ajusta el ancho del contenido al canvas.
        self.area_chat._parent_canvas.bind(
            "<Configure>", lambda evento: self._actualizar_scrollbar(), add="+"
        )

        # Barra de adjunto pendiente - arranca sin empaquetar (oculta) y solo
        # se muestra (con "before=self.frame_input" para no perder su lugar
        # arriba del input pase lo que pase con el orden de pack) mientras
        # haya una foto/PDF elegida sin mandar todavia, ver
        # _elegir_adjunto/_quitar_adjunto.
        self._frame_adjunto = ctk.CTkFrame(self, fg_color=tema.FONDO_SECUNDARIO, corner_radius=8)
        self._etiqueta_adjunto = ctk.CTkLabel(
            self._frame_adjunto,
            text="",
            text_color=tema.TEXTO,
            font=ctk.CTkFont(size=12),
        )
        self._etiqueta_adjunto.pack(side="left", padx=(10, 4), pady=4)
        ctk.CTkButton(
            self._frame_adjunto,
            text="✕",
            width=24,
            height=24,
            corner_radius=12,
            fg_color="transparent",
            hover_color=tema.FONDO,
            text_color=tema.TEXTO_SECUNDARIO,
            command=self._quitar_adjunto,
        ).pack(side="right", padx=(4, 6), pady=4)

        self.frame_input = ctk.CTkFrame(self, fg_color="transparent")
        self.frame_input.pack(fill="x", padx=16, pady=(0, 16))

        # Boton para elegir una foto o un PDF para mandar junto al mensaje
        # (leido por la skill como imagen/documento nativo de la API, ver
        # _elegir_adjunto).
        ctk.CTkButton(
            self.frame_input,
            text="📎",
            width=32,
            fg_color=tema.FONDO_SECUNDARIO,
            hover_color=self.acento,
            text_color=tema.TEXTO,
            command=self._elegir_adjunto,
        ).pack(side="left", padx=(0, 8))

        # Boton extra opcional, especifico de la skill (ej. "📊" en
        # Finanzas para conectar el excel) - base.py no sabe que hace, solo
        # le pasa esta misma vista para que la skill muestre avisos.
        if self._boton_extra_texto and self._boton_extra_comando:
            ctk.CTkButton(
                self.frame_input,
                text=self._boton_extra_texto,
                width=32,
                fg_color=tema.FONDO_SECUNDARIO,
                hover_color=self.acento,
                text_color=tema.TEXTO,
                command=lambda: self._boton_extra_comando(self),
            ).pack(side="left", padx=(0, 8))

        # CTkTextbox en vez de CTkEntry: crece de a poco a medida que
        # escribe (ver _ajustar_alto_entrada) para que pueda ver todo el
        # mensaje, algo que un CTkEntry (una sola linea, sin wrap) no puede
        # hacer. No tiene placeholder nativo como el CTkEntry - se
        # reimplementa a mano (_fijar_texto_gris/_limpiar_texto_gris).
        self._entrada_alto_base_px = 32
        self.entrada = ctk.CTkTextbox(
            self.frame_input,
            height=self._entrada_alto_base_px,
            fg_color=tema.FONDO,
            text_color=tema.TEXTO_SECUNDARIO,
            border_color=self.acento,
            border_width=1,
            wrap="word",
            activate_scrollbars=False,
        )
        self._entrada_alto_por_linea_px = tkfont.Font(font=self.entrada._textbox.cget("font")).metrics("linespace")
        self.entrada.pack(side="left", fill="x", expand=True, padx=(0, 8))
        # <Return> manda el mensaje en vez de insertar un salto de linea
        # ("break" corta la propagacion al binding de clase que inserta el
        # \n por defecto) - Shift+Return es una secuencia distinta, no la
        # toca este binding, asi que sigue insertando un salto de linea
        # normal si alguna vez hace falta un mensaje de varias lineas.
        self.entrada.bind("<Return>", self._al_apretar_enter)
        self.entrada.bind("<KeyRelease>", self._ajustar_alto_entrada)
        # CTkTextbox no cambia de color al enfocarse (a diferencia del
        # CTkEntry viejo, que tampoco lo hacia solo - ver el bind de abajo)
        # y tampoco tiene placeholder propio, asi que ambas cosas se
        # resuelven en el mismo handler de foco.
        self.entrada.bind("<FocusIn>", self._al_enfocar_entrada)
        self.entrada.bind("<FocusOut>", self._al_desenfocar_entrada)
        self._fijar_texto_gris(self._placeholder_texto_actual)

        self.boton_enviar = ctk.CTkButton(
            self.frame_input,
            text="Enviar",
            width=80,
            fg_color=self.acento,
            hover_color=tema.BOTON_PRINCIPAL_HOVER,
            text_color=tema.TEXTO,
            command=self._enviar,
        )
        self.boton_enviar.pack(side="right")

    def _agregar_mensaje(self, remitente: str, texto: str):
        """Agrega un mensaje al chat como burbuja (estilo WhatsApp): los
        propios a la derecha, las respuestas de la skill a la izquierda. Los
        avisos del sistema (errores, limites) van centrados y sin burbuja,
        para no confundirlos con una respuesta real de la skill."""
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
            es_propio = remitente == "Sofi"
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

            burbuja = ctk.CTkLabel(
                contenedor,
                text=texto,
                fg_color=tema.BOTON_PRINCIPAL if es_propio else self.acento,
                text_color=tema.TEXTO,
                corner_radius=16,
                wraplength=300,
                justify="left",
                anchor="w",
            )
            burbuja.pack(
                anchor="e" if es_propio else "w",
                ipadx=10,
                ipady=6,
            )

        # _parent_canvas es el Canvas interno real que maneja el scroll (no
        # hay metodo publico en CTkScrollableFrame para esto). Se agenda con
        # after() porque hace falta que pack() ya haya actualizado la region
        # de scroll antes de leerla/moverla.
        self.after(10, self._refrescar_scroll)

    def _refrescar_scroll(self):
        self.area_chat._parent_canvas.yview_moveto(1.0)
        self._actualizar_scrollbar()

    def _actualizar_scrollbar(self):
        """Muestra la barra de scroll solo si la conversacion ya no entra
        completa en el area visible - el resto del tiempo queda
        completamente afuera del layout (no solo escondida) para no dejar
        ningun rastro de su forma en el recuadro."""
        canvas = self.area_chat._parent_canvas
        # Fuerza a Tkinter a terminar el recalculo de layout pendiente
        # (wraplength de texto largo, sobre todo) antes de leer bbox/altura
        # - sin esto, a veces la comparacion de abajo corre con medidas
        # todavia viejas y la barra no aparece aunque el contenido desborde.
        self.update_idletasks()
        bbox = canvas.bbox("all")
        if bbox is None:
            return
        contenido_alto = bbox[3] - bbox[1]
        if contenido_alto > canvas.winfo_height():
            self.area_chat._scrollbar.grid()
            # con la barra visible, ella misma da el respiro a la derecha -
            # el canvas vuelve a su padding original (solo izquierda).
            canvas.grid_configure(padx=(self._border_spacing, 0))
        else:
            self.area_chat._scrollbar.grid_remove()
            # sin la barra, el canvas necesita su propio respiro a la
            # derecha para no invadir la curva de la esquina redondeada.
            canvas.grid_configure(padx=(self._border_spacing, self._border_spacing))

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
        manager: se necesita justo al construir la vista, antes de que
        exista esa geometria, momento en el que medir "displaylines" da
        cualquier cosa (el ancho todavia es ~0, el wrap corta larga cada
        palabra y arranca directo en el maximo)."""
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
        self.entrada.configure(border_color=self.acento)
        if self._texto_entrada_crudo() == "":
            self._fijar_texto_gris(self._placeholder_texto_actual)

    def _enviar(self):
        # Ignora envios duplicados mientras ya hay una respuesta pendiente
        # (doble Enter, click repetido en "Enviar").
        if self._esperando_respuesta:
            return

        mensaje = "" if self._placeholder_activo else self._texto_entrada_crudo().strip()
        adjunto = self._adjunto_pendiente
        # Se puede mandar solo la foto/PDF sin texto (adjunto sin comentario).
        if not mensaje and not adjunto:
            return

        if self._mensajes_enviados >= LIMITE_MENSAJES_SESION:
            self._agregar_mensaje(
                "Sistema",
                "Se alcanzo el limite de mensajes de esta sesion. Reinicia "
                "Pollito para seguir chateando.",
            )
            return

        # Verificacion del limite de gasto mensual ANTES de llamar a la API.
        if limite_alcanzado():
            self._agregar_mensaje(
                "Sistema",
                "Se alcanzo el limite de gasto mensual de Pollito. Intenta "
                "de nuevo el mes que viene.",
            )
            return

        self.entrada.delete("1.0", "end")
        self._resetear_alto_entrada()

        if adjunto:
            self._agregar_mensaje("Sofi", f"📎 {adjunto['nombre']}\n{mensaje}" if mensaje else f"📎 {adjunto['nombre']}")
            # El bloque de imagen/documento va antes que el texto (orden
            # recomendado por Anthropic para que el comentario se lea como
            # referido a lo adjuntado). Si no escribio nada, se manda un
            # texto minimo igual - la API no acepta un bloque de texto vacio.
            self.historial.append({
                "role": "user",
                "content": [
                    {
                        "type": adjunto["tipo_bloque"],
                        "source": {
                            "type": "base64",
                            "media_type": adjunto["media_type"],
                            "data": adjunto["data"],
                        },
                    },
                    {"type": "text", "text": mensaje or f"(Te mande {adjunto['nombre']}, sin comentario.)"},
                ],
            })
            self._quitar_adjunto()
        else:
            self._agregar_mensaje("Sofi", mensaje)
            self.historial.append({"role": "user", "content": mensaje})

        self._mensajes_enviados += 1

        self._esperando_respuesta = True
        self._placeholder_texto_actual = "Esperando respuesta..."
        self.entrada.configure(state="disabled")
        self._fijar_texto_gris(self._placeholder_texto_actual)
        self.boton_enviar.configure(state="disabled")

        hilo = threading.Thread(target=self._llamar_api, daemon=True)
        hilo.start()

    def _elegir_adjunto(self):
        """Abre el selector de archivos de Windows para elegir una foto o un
        PDF. Lee y codifica el archivo ahi mismo (rapido para el tamano de
        archivo que se acepta, no hace falta hilo aparte) y lo deja
        guardado en self._adjunto_pendiente hasta el proximo _enviar()."""
        ruta_str = filedialog.askopenfilename(
            title="Adjuntar foto o documento",
            filetypes=[
                ("Fotos y PDF", "*.png *.jpg *.jpeg *.gif *.webp *.pdf"),
                ("Fotos", "*.png *.jpg *.jpeg *.gif *.webp"),
                ("PDF", "*.pdf"),
            ],
        )
        if not ruta_str:
            return

        ruta = Path(ruta_str)
        extension = ruta.suffix.lower()
        if extension in _TIPOS_IMAGEN:
            tipo_bloque = "image"
            media_type = _TIPOS_IMAGEN[extension]
            tamano_maximo = _TAMANO_MAXIMO_IMAGEN_BYTES
        elif extension in _TIPOS_DOCUMENTO:
            tipo_bloque = "document"
            media_type = _TIPOS_DOCUMENTO[extension]
            tamano_maximo = _TAMANO_MAXIMO_DOCUMENTO_BYTES
        else:
            self._agregar_mensaje(
                "Sistema",
                "Ese tipo de archivo no esta soportado. Elegi una foto "
                "(png, jpg, gif, webp) o un PDF.",
            )
            return

        tamano_bytes = ruta.stat().st_size
        if tamano_bytes > tamano_maximo:
            self._agregar_mensaje(
                "Sistema",
                f"Ese archivo pesa demasiado (limite {tamano_maximo // (1024 * 1024)} MB).",
            )
            return

        self._adjunto_pendiente = {
            "tipo_bloque": tipo_bloque,
            "media_type": media_type,
            "data": base64.b64encode(ruta.read_bytes()).decode("ascii"),
            "nombre": ruta.name,
        }
        self._etiqueta_adjunto.configure(text=f"📎 {ruta.name}")
        self._frame_adjunto.pack(fill="x", padx=16, pady=(0, 4), before=self.frame_input)

    def _quitar_adjunto(self):
        self._adjunto_pendiente = None
        self._frame_adjunto.pack_forget()

    def _tools_con_cache(self):
        """Copia self.tools con cache_control en la ultima herramienta - las
        tools de cada skill son siempre las mismas en toda la conversacion
        (WEB_SEARCH_TOOL / MEMORY_TOOL), asi que cachear hasta ahi evita
        repagar su definicion en cada mensaje nuevo."""
        if not self.tools:
            return self.tools
        herramientas = [dict(herramienta) for herramienta in self.tools]
        herramientas[-1] = {**herramientas[-1], "cache_control": {"type": "ephemeral"}}
        return herramientas

    def _finalizar_envio(self):
        """Reactiva el campo de texto y el boton "Enviar" - se llama una
        sola vez por cada _llamar_api (exito o error, ver el finally ahi
        abajo), asi no hace falta repetir esta logica en cada camino de
        salida."""
        self._esperando_respuesta = False
        self.entrada.configure(state="normal")
        self.boton_enviar.configure(state="normal")
        self._placeholder_texto_actual = "Escribe tu mensaje..."
        # Mandar con Enter no le saca el foco al campo - si sigue enfocado
        # no hay que insertar el placeholder, porque no se va a limpiar
        # solo cuando siga escribiendo (no se dispara un <FocusIn> nuevo).
        # Sin este chequeo el placeholder queda insertado de verdad y lo
        # que escriba a continuacion se pega DESPUES ("Escribe tu
        # mensaje...hola") en vez de reemplazarlo.
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
                # system y tools son identicos en cada llamada de esta skill
                # (nunca cambian durante la conversacion) - cachearlos evita
                # repagar su definicion en cada mensaje. El ultimo mensaje
                # tambien se marca para cachear el historial ya enviado:
                # asi el mensaje nuevo de cada turno es lo unico que se paga
                # a precio completo, no toda la conversacion de nuevo.
                respuesta = cliente.messages.create(
                    model=MODEL_ID,
                    max_tokens=MAX_TOKENS_RESPUESTA,
                    system=[
                        {
                            "type": "text",
                            "text": self.system_prompt,
                            "cache_control": {"type": "ephemeral"},
                        }
                    ],
                    tools=self._tools_con_cache(),
                    thinking=THINKING_CONFIG,
                    messages=mensajes[:-1] + [_marcar_cache_en_ultimo_mensaje(mensajes[-1])],
                )
                tokens_entrada_totales += respuesta.usage.input_tokens
                tokens_salida_totales += respuesta.usage.output_tokens
                tokens_cache_escritura_totales += respuesta.usage.cache_creation_input_tokens or 0
                tokens_cache_lectura_totales += respuesta.usage.cache_read_input_tokens or 0

                if intentos >= _MAX_REINTENTOS_PAUSE_TURN:
                    break

                if respuesta.stop_reason == "tool_use" and self.manejadores_herramientas_cliente:
                    # Herramientas ejecutadas del lado cliente (memoria,
                    # excel de finanzas, etc. - una skill puede tener mas de
                    # una, se despacha por nombre). Se ejecuta cada bloque
                    # tool_use, se devuelven todos los tool_result juntos en
                    # un solo mensaje de usuario, y se vuelve a llamar a la
                    # API para que continue con el resultado.
                    resultados = [
                        {
                            "type": "tool_result",
                            "tool_use_id": bloque.id,
                            "content": self.manejadores_herramientas_cliente[bloque.name](bloque.input)
                            if bloque.name in self.manejadores_herramientas_cliente
                            else "Error: no hay manejador para la herramienta '{}'.".format(bloque.name),
                        }
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
                    "Sistema",
                    "Falta configurar la API key correctamente (revisa secreto.py).",
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
                    "Sistema",
                    "Hubo un error con el servicio de IA. Intenta de nuevo mas tarde.",
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

        # Concatena solo los bloques de texto, ignorando bloques de
        # busqueda web (server_tool_use / web_search_tool_result) y de
        # pensamiento (thinking).
        texto_final = "".join(
            bloque.text for bloque in respuesta.content if bloque.type == "text"
        )

        # Se guarda el turno completo del asistente (response.content, no
        # solo el texto) para conservar contexto de las herramientas
        # server-side usadas en proximos mensajes.
        self.historial.append({"role": "assistant", "content": respuesta.content})

        registrar_uso(
            tokens_entrada_totales,
            tokens_salida_totales,
            tokens_cache_escritura_totales,
            tokens_cache_lectura_totales,
        )

        self.after(
            0,
            lambda: self._agregar_mensaje(self.titulo, texto_final or "(sin respuesta)"),
        )
