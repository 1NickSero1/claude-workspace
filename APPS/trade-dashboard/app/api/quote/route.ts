import { NextResponse } from "next/server";
import { WATCHLIST } from "@/lib/watchlist";

// Proxy server-side a Twelve Data: la API key nunca llega al navegador de
// quien abra el dashboard, solo vive en la variable de entorno del server.
export async function GET() {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta TWELVEDATA_API_KEY en el servidor (.env.local o variables de entorno del hosting)." },
      { status: 500 }
    );
  }

  const simbolos = WATCHLIST.map((a) => a.simbolo).join(",");
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(simbolos)}&apikey=${apiKey}`;

  const resp = await fetch(url, { cache: "no-store" });
  const data = await resp.json();

  return NextResponse.json(data);
}
