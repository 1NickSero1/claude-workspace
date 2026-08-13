"use client";

import { useCallback, useEffect, useState } from "react";
import { WATCHLIST, type Grupo } from "@/lib/watchlist";

interface Cotizacion {
  symbol?: string;
  name?: string;
  close?: string;
  previous_close?: string;
  percent_change?: string;
  high?: string;
  low?: string;
  is_market_open?: boolean;
  code?: number;
  message?: string;
}

type Cotizaciones = Record<string, Cotizacion>;

const GRUPOS: Grupo[] = ["Nucleo", "Satelite", "Otros"];
const INTERVALO_MS = 120_000; // 2 min - cuidado con la cuota gratis de Twelve Data (800/dia)

export default function Dashboard() {
  const [cotizaciones, setCotizaciones] = useState<Cotizaciones>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  const actualizar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const resp = await fetch("/api/quote");
      const data = await resp.json();
      if (data.error) {
        setError(data.error);
      } else if (WATCHLIST.length === 1) {
        setCotizaciones({ [WATCHLIST[0].simbolo]: data });
      } else {
        setCotizaciones(data);
      }
      setUltimaActualizacion(new Date());
    } catch {
      setError("No se pudo conectar con el servidor del dashboard.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    actualizar();
    const id = setInterval(actualizar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [actualizar]);

  return (
    <main className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Trade Dashboard</h1>
          <p className="text-neutral-400 text-sm">
            Precios en vivo — Nico &amp; Sebas
          </p>
        </div>
        <button
          onClick={actualizar}
          disabled={cargando}
          className="rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 px-4 py-2 text-sm"
        >
          {cargando ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {GRUPOS.map((grupo) => {
        const activos = WATCHLIST.filter((a) => a.grupo === grupo);
        if (activos.length === 0) return null;
        return (
          <section key={grupo} className="mb-8">
            <h2 className="text-xs uppercase tracking-wide text-neutral-500 mb-3">
              {grupo}
            </h2>
            <div className="rounded-xl border border-neutral-800 divide-y divide-neutral-800 overflow-hidden">
              {activos.map((activo) => {
                const c = cotizaciones[activo.simbolo];
                const cambio = c?.percent_change ? parseFloat(c.percent_change) : null;
                return (
                  <div
                    key={activo.simbolo}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{activo.nombre}</p>
                      <p className="text-xs text-neutral-500">{activo.simbolo}</p>
                    </div>
                    <div className="text-right">
                      {c?.close ? (
                        <>
                          <p className="font-mono">{parseFloat(c.close).toLocaleString(undefined, { maximumFractionDigits: 4 })}</p>
                          {cambio !== null && (
                            <p className={cambio >= 0 ? "text-emerald-400 text-xs" : "text-red-400 text-xs"}>
                              {cambio >= 0 ? "+" : ""}
                              {cambio.toFixed(2)}%
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-neutral-600 text-sm">
                          {c?.message ?? (cargando ? "..." : "sin datos")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <p className="text-xs text-neutral-600 mt-10">
        {ultimaActualizacion
          ? `Actualizado ${ultimaActualizacion.toLocaleTimeString()} - se refresca solo cada ${INTERVALO_MS / 60000} min`
          : "Cargando..."}{" "}
        - datos de Twelve Data, plan gratuito (no ejecuta ordenes, solo consulta precios).
      </p>
    </main>
  );
}
