import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '@env/environment';
import { DashboardKpis, SalesForecast } from '@core/models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/dashboard`;

  getKpis(branchId: string): Observable<DashboardKpis> {
    return this.http.get<DashboardKpis>(`${this.baseUrl}/kpis`, { params: { branchId } });
  }

  getSalesForecast(branchId: string, historyDays = 9, forecastDays = 7): Observable<SalesForecast> {
    return this.http.get<SalesForecast>(`${this.baseUrl}/sales-forecast`, {
      params: { branchId, historyDays, forecastDays },
    });
  }
}
