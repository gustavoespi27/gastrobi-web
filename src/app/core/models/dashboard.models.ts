export interface DashboardKpis {
  criticalStockItems: number;
  /** Costo de merma de la semana en curso. */
  wasteCost: number;
  /** Variación % contra la semana anterior. */
  wasteCostChangePct: number;
  /** Venta proyectada de los próximos 7 días (modelo ML). */
  projectedDemand: number;
  projectedDemandChangePct: number;
  pendingInvoices: number;
}

export interface SalesPoint {
  /** Fecha ISO yyyy-MM-dd. */
  date: string;
  actual: number | null;
  predicted: number | null;
}

export interface SalesForecast {
  /** Fecha ISO yyyy-MM-dd que separa histórico de pronóstico. */
  today: string;
  points: SalesPoint[];
}
