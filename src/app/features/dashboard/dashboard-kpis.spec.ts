import { DashboardKpis } from '@core/models/dashboard.models';

import { buildKpiCards } from './dashboard-kpis';

const KPIS: DashboardKpis = {
  criticalStockItems: 7,
  wasteCost: 284,
  wasteCostChangePct: 12,
  projectedDemand: 34800,
  projectedDemandChangePct: 8.4,
  pendingInvoices: 2,
};

describe('buildKpiCards', () => {
  it('genera las 4 tarjetas con los valores formateados', () => {
    const cards = buildKpiCards(KPIS);
    expect(cards.map((c) => c.value)).toEqual([7, '$284', '$34.8K', 2]);
  });

  it('merma al alza es peligro; a la baja es positivo', () => {
    expect(buildKpiCards(KPIS)[1]).toMatchObject({ badge: '↑ 12%', tone: 'danger' });
    expect(buildKpiCards({ ...KPIS, wasteCostChangePct: -5 })[1]).toMatchObject({
      badge: '↓ 5%',
      tone: 'success',
    });
  });

  it('demanda a la baja cambia ícono y color', () => {
    const card = buildKpiCards({ ...KPIS, projectedDemandChangePct: -3 })[2];
    expect(card).toMatchObject({ badge: '-3%', badgeIcon: 'trending_down', tone: 'danger' });
  });
});
