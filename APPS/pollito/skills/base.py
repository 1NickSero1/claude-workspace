"""Ventana de chat generica, reutilizada por cada una de las 5 skills.

Cada skill le pasa su propio system_prompt; el codigo de ventana/UI es el
mismo para las 5. _llamar_api() hace la llamada real a la API de Anthropic
(Claude Sonnet 5), con busqueda web server-side habilitada por defecto.
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
    OUTPUT_CONFIG,
    THINKING_CONFIG,
    WEB_SEARCH_TOOL,
    get_api_key,
)
from uso_diario import limite_alcanzado, registrar_uso

# Tope de reintentos si el loop server-side de busqueda web pausa
# (stop_reason == "pause_turn") por llegar a su limite interno de
# iteraciones. Evita un loop infinito en un caso patologico.
_MAX_REINTENTOS_PAUSE_TURN = 5

_cliente: Optional[anthropic.Anthropic] = None
_cliente_lock = threading.Lock()


def _obtener_cliente() -> anthropic.Anthropic:
    """Cliente de Anthropic compartido por las 5 ventanas de chat, creado
    de forma perezosa (recien en el primer mensaje) y una sola vez."""
    global _cliente
    if _cliente is None:
        with _cliente_lock:
            if _cliente is None:
                _cliente = anthropic.Anthropic(api_key=get_api_key())
    return _cliente


class VentanaChat(ctk.CTkToplevel):
    def __init__(
        self,
        parent,
        titulo: str,
        system_prompt: str,
        tools=None,
        acento: Optional[str] = None,
        manejador_herramienta_cliente: Optional[Callable[[dict], str]] = None,
    ):
        super().__init__(parent)
        self.title(titulo)
        self.geometry("480x640")
        self.configure(fg_color=tema.FONDO)
        self.system_prompt = system_prompt
        # Por defecto, las 5 skills tienen busqueda web habilitada.
        self.tools = tools if tools is not None else [WEB_SEARCH_TOOL]
        self.acento = acento or tema.BOTON_PRINCIPAL
        # Solo la skill de Psicologia pasa esto (herramienta de memoria,
        # ejecutada del lado cliente - ver skills/memoria_psicologia.py).
        self.manejador_herramienta_cliente = manejador_herramienta_cliente
        self.historial = []
        self._mensajes_enviados = 0
        self._construir_ui()

    def _construir_ui(self):
        self.area_chat = ctk.CTkTextbox(
            self,
            wrap="word",
            fg_color=tema.FONDO_SECUNDARIO,
            text_color=tema.TEXTO,
            border_color=self.acento,
            border_width=2,
        )
        self.area_chat.pack(fill="both", expand=True, padx=16, pady=(16, 8))
        self.area_chat.configure(state="disabled")

        frame_input = ctk.CTkFrame(self, fg_color="transparent")
        frame_input.pack(fill="x", padx=16, pady=(0, 16))

        self.entrada = ctk.CTkEntry(frame_input, placeholder_text="Escribe tu mensaje...")
        self.entrada.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.entrada.bind("<Return>", lambda evento: self._enviar())

        boton_enviar = ctk.CTkButton(
            frame_input,
            text="Enviar",
            width=80,
            fg_color=self.acento,
            hover_color=tema.BOTON_PRINCIPAL_HOVER,
            command=self._enviar,
        )
        boton_enviar.pack(side="right")

    def _agregar_mensaje(self, remitente: str, texto: str):
        self.area_chat.configure(state="normal")
        self.area_chat.insert("end", "{}: {}\n\n".format(remitente, texto))
        self.area_chat.configure(state="disabled")
        self.area_chat.see("end")

    def _enviar(self):
        mensaje = self.entrada.get().strip()
        if not mensaje:
            return

        if self._mensajes_enviados >= LIMITE_MENSAJES_SESION:
            self._agregar_mensaje(
                "Sistema",
                "Se alcanzo el limite de mensajes de esta sesion. Cierra y "
                "vuelve a abrir esta ventana para seguir chateando.",
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
        self._agregar_mensaje("Tu", mensaje)
        self.historial.append({"role": "user", "content": mensaje})
        self._mensajes_enviados += 1

        hilo = threading.Thread(target=self._llamar_api, daemon=True)
        hilo.start()

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
                    output_config=OUTPUT_CONFIG,
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
            lambda: self._agregar_mensaje(self.title(), texto_final or "(sin respuesta)"),
        )
