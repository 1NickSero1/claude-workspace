"""Consulta de precio en tiempo real de un activo (forex, cripto o acciones)
via la API de Twelve Data, para uso de la skill TRADE.

Uso: python precio.py <SIMBOLO>
Ejemplos: python precio.py EUR/USD
          python precio.py BTC/USD
          python precio.py AAPL
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

try:
    from secreto import API_KEY
except ImportError:
    API_KEY = os.environ.get("TWELVEDATA_API_KEY")


def main() -> None:
    if not API_KEY:
        print(
            "ERROR: falta la API key de Twelve Data. Copia secreto.example.py "
            "a secreto.py (misma carpeta) y pega ahi tu key gratis de "
            "https://twelvedata.com/pricing"
        )
        sys.exit(1)

    if len(sys.argv) < 2:
        print("Uso: python precio.py <SIMBOLO>  (ej. EUR/USD, BTC/USD, AAPL)")
        sys.exit(1)

    simbolo = sys.argv[1]
    params = urllib.parse.urlencode({"symbol": simbolo, "apikey": API_KEY})
    url = f"https://api.twelvedata.com/quote?{params}"

    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
    except urllib.error.URLError as e:
        print(f"ERROR de conexion con Twelve Data: {e}")
        sys.exit(1)

    if data.get("status") == "error" or "code" in data:
        print(f"ERROR de Twelve Data: {data.get('message', data)}")
        sys.exit(1)

    print(json.dumps(data, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
