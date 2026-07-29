"""Vista de chat generica, reutilizada por cada una de las 5 skills.

Cada skill le pasa su propio system_prompt; el codigo de vista/UI es el
mismo para las 5. No es una ventana propia (ver main.py): es un panel que
ocupa toda la ventana principal y vuelve al menu con el boton "Atras" en
vez de abrir/cerrar una ventana nueva por cada skill. _llamar_api() hace la
llamada real a la API de Anthropic (Claude Sonnet 5), con busqueda web
server-side habilitada por defecto.
"""
import threading
from typing import Callable, Optional

import anthropic
import customtkinter as ctk

import tema
from config import (
    LIMITE_MENSAJES_SESION,
    MAX_TOKENS_RESPUESTA,
    MODEL_ID,
    THINKING_CONFIG,
    WEB_SEARCH_TOOL,
    get_api_key,
)
from uso_diario import limite_alcanzado, registrar_uso

# Tope de reintentos si el loop server-side de busqueda web pausa
# (stop_reason == "pause_turn") por llegar a su limite interno de
# iteraciones. Evita un loop infinito en un caso patologico.
_MAX_REINTENTOS_PAUSE_TURN = 5


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


def _obtener_cliente() -> anthropic.Anthropic:
    """Cliente de Anthropic compartido por las 5 vistas de chat, creado
    de forma perezosa (recien en el primer mensaje) y una sola vez."""
    global _cliente
    if _cliente is None:
        with _cliente_lock:
            if _cliente is None:
                _cliente = anthropic.Anthropic(api_key=get_api_key())
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
        manejador_herramienta_cliente: Optional[Callable[[dict], str]] = None,
        mensaje_bienvenida: Optional[str] = None,
    ):
        super().__init__(parent, fg_color=tema.FONDO)
        # Se guarda como atributo propio (no hay wm_title en un Frame) -
        # se usa como remitente de las respuestas en el chat.
        self.titulo = titulo
        self.system_prompt = system_prompt
        # Por defecto, las 5 skills tienen busqueda web habilitada.
        self.tools = tools if tools is not None else [WEB_SEARCH_TOOL]
        self.acento = acento or tema.BOTON_PRINCIPAL
        # Herramienta de memoria, ejecutada del lado cliente - cada skill
        # pasa su propio manejador (ver skills/memoria.py).
        self.manejador_herramienta_cliente = manejador_herramienta_cliente
        self.historial = []
        self._mensajes_enviados = 0
        # Evita mandar dos mensajes en paralelo (doble Enter, click repetido
        # en "Enviar") mientras se espera la respuesta de la API - sin esto,
        # dos hilos de _llamar_api corriendo a la vez pueden gastar tokens de
        # mas y desordenar self.historial (dos hilos escribiendolo a la vez).
        self._esperando_respuesta = False
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

        frame_input = ctk.CTkFrame(self, fg_color="transparent")
        frame_input.pack(fill="x", padx=16, pady=(0, 16))

        self.entrada = ctk.CTkEntry(
            frame_input,
            placeholder_text="Escribe tu mensaje...",
            fg_color=tema.FONDO,
            text_color=tema.TEXTO,
            placeholder_text_color=tema.TEXTO_SECUNDARIO,
            border_color=self.acento,
            border_width=1,
        )
        self.entrada.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.entrada.bind("<Return>", lambda evento: self._enviar())
        # CTkEntry no cambia de color al enfocarse (solo esconde el
        # placeholder) - sin esto, alguien navegando con Tab no tiene forma
        # de saber si el campo esta enfocado.
        self.entrada.bind("<FocusIn>", lambda evento: self.entrada.configure(border_color=tema.TEXTO))
        self.entrada.bind("<FocusOut>", lambda evento: self.entrada.configure(border_color=self.acento))

        self.boton_enviar = ctk.CTkButton(
            frame_input,
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

    def _enviar(self):
        # Ignora envios duplicados mientras ya hay una respuesta pendiente
        # (doble Enter, click repetido en "Enviar").
        if self._esperando_respuesta:
            return

        mensaje = self.entrada.get().strip()
        if not mensaje:
            return

        if self._mensajes_enviados >= LIMITE_MENSAJES_SESION:
            self._agregar_mensaje(
                "Sistema",
                "Se alcanzo el limite de mensajes de esta sesion. Reinicia "
                "Pollito para seguir chateando.",
            )
            return

        # Verificacion del limite diario de tokens ANTES de llamar a la API.
        if limite_alcanzado():
            self._agregar_mensaje(
                "Sistema",
                "Se alcanzo el limite diario de uso de Pollito. Intenta de "
                "nuevo manana.",
            )
            return

        self.entrada.delete(0, "end")
        self._agregar_mensaje("Sofi", mensaje)
        self.historial.append({"role": "user", "content": mensaje})
        self._mensajes_enviados += 1

        self._esperando_respuesta = True
        self.entrada.configure(state="disabled", placeholder_text="Esperando respuesta...")
        self.boton_enviar.configure(state="disabled")

        hilo = threading.Thread(target=self._llamar_api, daemon=True)
        hilo.start()

    def _finalizar_envio(self):
        """Reactiva el campo de texto y el boton "Enviar" - se llama una
        sola vez por cada _llamar_api (exito o error, ver el finally ahi
        abajo), asi no hace falta repetir esta logica en cada camino de
        salida."""
        self._esperando_respuesta = False
        self.entrada.configure(state="normal", placeholder_text="Escribe tu mensaje...")
        self.boton_enviar.configure(state="normal")

    def _llamar_api(self):
        mensajes = list(self.historial)
        tokens_totales = 0
        intentos = 0

        try:
            cliente = _obtener_cliente()

            while True:
                respuesta = cliente.messages.create(
                    model=MODEL_ID,
                    max_tokens=MAX_TOKENS_RESPUESTA,
                    system=self.system_prompt,
                    tools=self.tools,
                    thinking=THINKING_CONFIG,
                    messages=mensajes,
                )
                tokens_totales += respuesta.usage.input_tokens + respuesta.usage.output_tokens

                if intentos >= _MAX_REINTENTOS_PAUSE_TURN:
                    break

                if respuesta.stop_reason == "tool_use" and self.manejador_herramienta_cliente:
                    # Herramienta ejecutada del lado cliente (ej. memoria de
                    # la skill de Psicologia). Se ejecuta cada bloque
                    # tool_use, se devuelven todos los tool_result juntos en
                    # un solo mensaje de usuario, y se vuelve a llamar a la
                    # API para que continue con el resultado.
                    resultados = [
                        {
                            "type": "tool_result",
                            "tool_use_id": bloque.id,
                            "content": self.manejador_herramienta_cliente(bloque.input),
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

        registrar_uso(tokens_totales)

        self.after(
            0,
            lambda: self._agregar_mensaje(self.titulo, texto_final or "(sin respuesta)"),
        )
