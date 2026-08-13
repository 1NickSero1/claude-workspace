// Lista de activos a seguir. Edita esta lista cuando Nico y Sebas cierren
// los tickers reales del plan (ver APPS/trade/equipo/equipo-etf-plan.md,
// seccion 4 - todavia "pendientes" al crear este dashboard). El campo
// "grupo" solo se usa para agrupar visualmente en el dashboard.
export type Grupo = "Nucleo" | "Satelite" | "Otros";

export interface ActivoSeguido {
  simbolo: string; // formato Twelve Data: "EUR/USD", "BTC/USD", "AAPL"
  nombre: string;
  grupo: Grupo;
}

export const WATCHLIST: ActivoSeguido[] = [
  { simbolo: "SXR8", nombre: "iShares Core S&P 500 UCITS (ejemplo)", grupo: "Nucleo" },
  { simbolo: "AAPL", nombre: "Apple", grupo: "Satelite" },
  { simbolo: "MSFT", nombre: "Microsoft", grupo: "Satelite" },
  { simbolo: "EUR/USD", nombre: "Euro / Dolar", grupo: "Otros" },
  { simbolo: "BTC/USD", nombre: "Bitcoin", grupo: "Otros" },
];
