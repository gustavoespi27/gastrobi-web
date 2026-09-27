import { LoginRequest, LoginResponse, UserProfile } from '@core/models/auth.models';
import { DashboardKpis, SalesForecast } from '@core/models/dashboard.models';
import {
  CreatePurchaseOrderRequest,
  PurchaseOrder,
  StockAlert,
} from '@core/models/inventory.models';
import { Branch, Workspace } from '@core/models/organization.models';

// Datos de ejemplo tomados del mockup de Figma. Se eliminan cuando la API .NET esté lista.

export const MOCK_WORKSPACES: Workspace[] = [
  { id: 'central-kitchen-group', name: 'Central Kitchen Group' },
  { id: 'bistro-del-puerto', name: 'Bistró del Puerto' },
];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'cocina-central', name: 'Cocina Central' },
  { id: 'providencia', name: 'Providencia' },
  { id: 'vina-del-mar', name: 'Viña del Mar' },
];

const MOCK_USER: UserProfile = {
  id: 'u-001',
  fullName: 'Marco Patel',
  email: 'marco@centralkitchen.com',
  role: 'Chef Principal',
};

/** Escala los datos según sucursal para que cambiar de sucursal se note. */
const BRANCH_FACTOR: Record<string, number> = {
  'cocina-central': 1,
  providencia: 0.72,
  'vina-del-mar': 0.58,
};

const HISTORY = [3820, 4210, 3950, 4680, 4120, 4890, 5100, 4750, 4320];
const FORECAST = [4580, 4920, 5240, 5080, 4760, 5310, 5620];

const STOCK_ALERTS: StockAlert[] = [
  {
    ingredientId: 101,
    name: 'Harina de fuerza (00)',
    unit: 'kg',
    stock: 4.2,
    parLevel: 25,
    leadTimeDays: 2,
    urgency: 'critical',
  },
  {
    ingredientId: 102,
    name: 'Mantequilla sin sal',
    unit: 'kg',
    stock: 1.8,
    parLevel: 10,
    leadTimeDays: 1,
    urgency: 'critical',
  },
  {
    ingredientId: 103,
    name: 'Leche entera',
    unit: 'L',
    stock: 12,
    parLevel: 40,
    leadTimeDays: 1,
    urgency: 'low',
  },
  {
    ingredientId: 104,
    name: 'Café en grano',
    unit: 'kg',
    stock: 3.5,
    parLevel: 15,
    leadTimeDays: 3,
    urgency: 'warning',
  },
  {
    ingredientId: 105,
    name: 'Harina de almendra',
    unit: 'kg',
    stock: 2.1,
    parLevel: 8,
    leadTimeDays: 4,
    urgency: 'warning',
  },
  {
    ingredientId: 106,
    name: 'Crema para batir',
    unit: 'L',
    stock: 6,
    parLevel: 20,
    leadTimeDays: 1,
    urgency: 'low',
  },
];

function factor(branchId: string | null): number {
  return BRANCH_FACTOR[branchId ?? ''] ?? 1;
}

function toIsoDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

export function mockLogin(request: LoginRequest): LoginResponse | null {
  // Para probar el error de credenciales: contraseña de menos de 4 caracteres.
  if (!request.email || request.password.length < 4) return null;
  const workspace = MOCK_WORKSPACES.find((w) => w.id === request.workspaceId) ?? MOCK_WORKSPACES[0];
  return {
    accessToken: 'mock-jwt-token',
    expiresAt: addDays(new Date(), 1).toISOString(),
    user: { ...MOCK_USER, email: request.email },
    workspace,
  };
}

export function mockKpis(branchId: string | null): DashboardKpis {
  const f = factor(branchId);
  return {
    criticalStockItems: Math.max(1, Math.round(7 * f)),
    wasteCost: Math.round(284 * f),
    wasteCostChangePct: 12,
    projectedDemand: Math.round(34800 * f),
    projectedDemandChangePct: 8.4,
    pendingInvoices: 2,
  };
}

export function mockSalesForecast(branchId: string | null): SalesForecast {
  const f = factor(branchId);
  const today = new Date();
  const start = addDays(today, -(HISTORY.length - 1));
  const points = [
    ...HISTORY.map((value, i) => ({
      date: toIsoDate(addDays(start, i)),
      actual: Math.round(value * f),
      predicted: null,
    })),
    ...FORECAST.map((value, i) => ({
      date: toIsoDate(addDays(today, i + 1)),
      actual: null,
      predicted: Math.round(value * f),
    })),
  ];
  return { today: toIsoDate(today), points };
}

export function mockStockAlerts(branchId: string | null): StockAlert[] {
  const f = factor(branchId);
  return STOCK_ALERTS.map((a) => ({ ...a, stock: Math.round(a.stock * f * 10) / 10 }));
}

let nextPurchaseOrderId = 1042;

/** Imita la validación del backend: la cantidad debe ser mayor a 0 (si no, 400). */
export function mockCreatePurchaseOrder(request: CreatePurchaseOrderRequest): PurchaseOrder | null {
  if (!(request.quantity > 0)) return null;
  const id = nextPurchaseOrderId++;
  return { id, code: `OC-${id}`, status: 'draft', createdAt: new Date().toISOString() };
}
