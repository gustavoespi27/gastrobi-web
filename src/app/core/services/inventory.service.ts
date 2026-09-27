import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import {
  CreatePurchaseOrderRequest,
  PurchaseOrder,
  StockAlert,
} from '@core/models/inventory.models';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly http = inject(HttpClient);

  getStockAlerts(branchId: string): Observable<StockAlert[]> {
    return this.http.get<StockAlert[]>(`${environment.apiUrl}/inventory/stock-alerts`, {
      params: { branchId },
    });
  }

  createPurchaseOrder(request: CreatePurchaseOrderRequest): Observable<PurchaseOrder> {
    return this.http.post<PurchaseOrder>(`${environment.apiUrl}/purchase-orders`, request);
  }
}
