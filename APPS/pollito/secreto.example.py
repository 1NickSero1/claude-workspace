"""Plantilla para tu API key real.

Copia este archivo como "secreto.py" (sin .example) en esta misma carpeta y
pega ahi tu API key real. secreto.py esta en .gitignore - nunca se sube a
git ni se comparte en el chat de Claude Code.

IMPORTANTE: la key va ENTRE COMILLAS, igual que en el ejemplo de abajo. Sin
comillas Python la interpreta como codigo (resta de nombres) y explota con
NameError apenas se importe.
"""

API_KEY = "pega-aqui-tu-api-key-real-de-Anthropic"

# Credenciales de Higgsfield (generacion de imagenes, ver imagen_higgsfield.py).
# Higgsfield da un par "Key ID" + "Key Secret" - van los dos, entre comillas.
# Si se dejan vacios, la app anda igual pero sin generar imagenes.
HIGGSFIELD_KEY_ID = ""
HIGGSFIELD_KEY_SECRET = ""
