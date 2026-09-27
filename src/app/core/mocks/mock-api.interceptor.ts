import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { delay, mergeMap, of, throwError, timer } from 'rxjs';

import { environment } from '@env/environment';
import { LoginRequest } from '@core/models/auth.models';
import { CreatePurchaseOrderRequest } from '@core/models/inventory.models';
import {
  MOCK_BRANCHES,
  MOCK_WORKSPACES,
  mockCreatePurchaseOrder,
  mockKpis,
  mockLogin,
  mockSalesForecast,
  mockStockAlerts,
} from './mock-data';

type MockHandler = (req: HttpRequest<unknown>) => unknown;

class MockHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Mismas rutas y formas de respuesta que debe exponer la API .NET (ver BITACORA.md). */
const handlers: Record<string, MockHandler> = {
  'GET /auth/workspaces': () => MOCK_WORKSPACES,
  'POST /auth/login': (req) => {
    const response = mockLogin(req.body as LoginRequest);
    if (!response) throw new MockHttpError(401, 'Credenciales inválidas');
    return response;
  },
  'POST /auth/forgot-password': () => null,
  'GET /branches': () => MOCK_BRANCHES,
  'GET /dashboard/kpis': (req) => mockKpis(req.params.get('branchId')),
  'GET /dashboard/sales-forecast': (req) => mockSalesForecast(req.params.get('branchId')),
  'GET /inventory/stock-alerts': (req) => mockStockAlerts(req.params.get('branchId')),
  'GET /invoices/pending-count': () => ({ count: 2 }),
  'POST /purchase-orders': (req) => {
    const order = mockCreatePurchaseOrder(req.body as CreatePurchaseOrderRequest);
    if (!order) throw new MockHttpError(400, 'La cantidad debe ser mayor a 0');
    return order;
  },
};

const LATENCY_MS = 350;

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMocks || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const path = req.url.slice(environment.apiUrl.length).split('?')[0];
  const handler = handlers[`${req.method} ${path}`];

  try {
    if (!handler) throw new MockHttpError(404, `Sin mock para ${req.method} ${path}`);
    const body = handler(req);
    return of(new HttpResponse({ status: 200, body, url: req.url })).pipe(delay(LATENCY_MS));
  } catch (err) {
    const status = err instanceof MockHttpError ? err.status : 500;
    const error = new HttpErrorResponse({
      status,
      statusText: err instanceof Error ? err.message : 'Error',
      url: req.url,
    });
    // delay() no retrasa errores; timer + mergeMap sí.
    return timer(LATENCY_MS).pipe(mergeMap(() => throwError(() => error)));
  }
};
