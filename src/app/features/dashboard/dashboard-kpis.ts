import { DashboardKpis } from '@core/models/dashboard.models';
import { formatCompactCurrency } from '@shared/pipes/compact-currency.pipe';

import { BadgeTone } from './kpi-card/kpi-card.component';

export interface KpiCard {
  label: string;
  value: string | number;
  caption: string;
  badge: string;
  badgeIcon: string | null;
  tone: BadgeTone;
}

function signedPct(pct: number): string {
  return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function arrowPct(pct: number): string {
  return `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}%`;
}

/** Traduce los KPIs de la API a las 4 tarjetas del dashboard. */
export function buildKpiCards(kpis: DashboardKpis): KpiCard[] {
  const demandUp = kpis.projectedDemandChangePct >= 0;
  return [
    {
      label: 'Ítems en stock crítico',
      value: kpis.criticalStockItems,
      caption: 'ítems bajo nivel mínimo',
      badge: 'Urgente',
      badgeIcon: 'warning',
      tone: 'warning',
    },
    {
      label: 'Costo de desperdicio / merma',
      value: formatCompactCurrency(kpis.wasteCost),
      caption: 'esta semana',
      badge: arrowPct(kpis.wasteCostChangePct),
      badgeIcon: null,
      // Que la merma suba es malo.
      tone: kpis.wasteCostChangePct > 0 ? 'danger' : 'success',
    },
    {
      label: 'Demanda proyectada',
      value: formatCompactCurrency(kpis.projectedDemand),
      caption: 'próximos 7 días · pronóstico ML',
      badge: signedPct(kpis.projectedDemandChangePct),
      badgeIcon: demandUp ? 'trending_up' : 'trending_down',
      tone: demandUp ? 'success' : 'danger',
    },
    {
      label: 'Facturas OCR pendientes',
      value: kpis.pendingInvoices,
      caption: 'pendientes de revisión',
      badge: 'Revisar',
      badgeIcon: null,
      tone: 'info',
    },
  ];
}
