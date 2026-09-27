import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly http = inject(HttpClient);

  /** Facturas OCR pendientes de revisión (badge del menú lateral). */
  getPendingCount(branchId: string): Observable<number> {
    return this.http
      .get<{ count: number }>(`${environment.apiUrl}/invoices/pending-count`, {
        params: { branchId },
      })
      .pipe(map((res) => res.count));
  }
}
