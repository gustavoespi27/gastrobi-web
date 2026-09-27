import {
  mockCreatePurchaseOrder,
  mockLogin,
  mockSalesForecast,
  mockStockAlerts,
} from './mock-data';

describe('mock-data', () => {
  it('mockLogin rechaza contraseñas de menos de 4 caracteres', () => {
    expect(mockLogin({ email: 'a@b.cl', password: '123', workspaceId: null })).toBeNull();
    expect(mockLogin({ email: 'a@b.cl', password: '1234', workspaceId: null })).not.toBeNull();
  });

  it('mockSalesForecast separa histórico y pronóstico en "today"', () => {
    const forecast = mockSalesForecast('cocina-central');
    const todayIndex = forecast.points.findIndex((p) => p.date === forecast.today);

    expect(todayIndex).toBeGreaterThan(0);
    expect(forecast.points[todayIndex].actual).not.toBeNull();
    expect(forecast.points.slice(todayIndex + 1).every((p) => p.actual === null)).toBe(true);
    expect(forecast.points.slice(todayIndex + 1).every((p) => p.predicted !== null)).toBe(true);
  });

  it('mockCreatePurchaseOrder rechaza cantidades no positivas', () => {
    const base = { branchId: 'cocina-central', ingredientId: 101 };
    expect(mockCreatePurchaseOrder({ ...base, quantity: 0 })).toBeNull();
    expect(mockCreatePurchaseOrder({ ...base, quantity: 5 })?.code).toMatch(/^OC-\d+$/);
  });

  it('los datos cambian según la sucursal', () => {
    const central = mockStockAlerts('cocina-central')[0].stock;
    const vina = mockStockAlerts('vina-del-mar')[0].stock;
    expect(vina).toBeLessThan(central);
  });
});
