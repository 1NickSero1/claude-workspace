"""Ventana de chat generica, reutilizada por cada una de las 5 skills.

Cada skill le pasa su propio system_prompt; el codigo de ventana/UI es el
mismo para las 5. TODO: conectar la llamada real a la API una vez definida
la pregunta 3 (proveedor/modelo) de RECETAS/receta-apps.txt - hoy
_llamar_api() es un placeholder para no bloquear el resto del desarrollo.
"""
import threading

import customtkinter as ctk

from config import LIMITE_MENSAJES_SESION


class VentanaChat(ctk.CTkToplevel):
    def __init__(self, parent, titulo: str, system_prompt: str, tools=None):
        super().__init__(parent)
        self.title(titulo)
        self.geometry("480x640")
        self.system_prompt = system_prompt
        self.tools = tools or []
        self.historial = []
        self._mensajes_enviados = 0
        self._construir_ui()

    def _construir_ui(self):
        self.area_chat = ctk.CTkTextbox(self, wrap="word")
        self.area_chat.pack(fill="both", expand=True, padx=16, pady=(16, 8))
        self.area_chat.configure(state="disabled")

        frame_input = ctk.CTkFrame(self, fg_color="transparent")
        frame_input.pack(fill="x", padx=16, pady=(0, 16))

        self.entrada = ctk.CTkEntry(frame_input, placeholder_text="Escribe tu mensaje...")
        self.entrada.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.entrada.bind("<Return>", lambda evento: self._enviar())

        boton_enviar = ctk.CTkButton(frame_input, text="Enviar", width=80, command=self._enviar)
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

        self.entrada.delete(0, "end")
        self._agregar_mensaje("Tu", mensaje)
        self.historial.append({"role": "user", "content": mensaje})
        self._mensajes_enviados += 1

        hilo = threading.Thread(target=self._llamar_api, daemon=True)
        hilo.start()

    def _llamar_api(self):
        # TODO: reemplazar por la llamada real a la API elegida (pregunta 3
        # de RECETAS/receta-apps.txt). Placeholder para poder probar la UI
        # completa antes de tener las respuestas del usuario.
        respuesta = "[respuesta de ejemplo - falta conectar la API real]"
        self.after(0, lambda: self._agregar_mensaje(self.title(), respuesta))
