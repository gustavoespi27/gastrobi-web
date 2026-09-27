import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, filter, finalize, forkJoin, map, of, startWith, switchMap } from 'rxjs';

import { DashboardKpis, SalesForecast } from '@core/models/dashboard.models';
import { StockAlert } from '@core/models/inventory.models';
import { BranchContextService } from '@core/services/branch-context.service';
import { DashboardService } from '@core/services/dashboard.service';
import { InventoryService } from '@core/services/inventory.service';

import { buildKpiCards } from './dashboard-kpis';
import { KpiCardComponent } from './kpi-card/kpi-card.component';
import { SalesChartComponent } from './sales-chart/sales-chart.component';
import { StockAlertsComponent } from './stock-alerts/stock-alerts.component';

interface DashboardData {
  kpis: DashboardKpis;
  forecast: SalesForecast;
  alerts: StockAlert[];
}

interface DashboardState {
  loading: boolean;
  error: boolean;
  data: DashboardData | null;
}

const LOADING: DashboardState = { loading: true, error: false, data: null };
const FAILED: DashboardState = { loading: false, error: true, data: null };

@Component({
  selector: 'gb-dashboard',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatProgressBarModule,
    KpiCardComponent,
    SalesChartComponent,
    StockAlertsComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  private readonly dashboard = inject(DashboardService);
  private readonly inventory = inject(InventoryService);
  private readonly branchCtx = inject(BranchContextService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly today = new Date();
  protected readonly branchLoadFailed = this.branchCtx.loadFailed;
  protected readonly pendingOrderId = signal<number | null>(null);
  private readonly reloadTick = signal(0);

  /** Se vuelve a pedir todo cuando cambia la sucursal o se pulsa "Reintentar". */
  private readonly request = computed(() => ({
    branchId: this.branchCtx.selectedId(),
    tick: this.reloadTick(),
  }));

  protected readonly state = toSignal(
    toObservable(this.request).pipe(
      filter((req): req is { branchId: string; tick: number } => !!req.branchId),
      switchMap(({ branchId }) =>
        forkJoin({
          kpis: this.dashboard.getKpis(branchId),
          forecast: this.dashboard.getSalesForecast(branchId),
          alerts: this.inventory.getStockAlerts(branchId),
        }).pipe(
          map((data): DashboardState => ({ loading: false, error: false, data })),
          startWith(LOADING),
          catchError(() => of(FAILED)),
        ),
      ),
    ),
    { initialValue: LOADING },
  );

  protected readonly kpiCards = computed(() => {
    const kpis = this.state().data?.kpis;
    return kpis ? buildKpiCards(kpis) : [];
  });

  protected reload(): void {
    if (this.branchLoadFailed()) this.branchCtx.load();
    this.reloadTick.update((n) => n + 1);
  }

  protected createOrder(alert: StockAlert): void {
    const branchId = this.branchCtx.selectedId();
    if (!branchId) return;

    this.pendingOrderId.set(alert.ingredientId);
    const quantity = Math.max(0, Math.round((alert.parLevel - alert.stock) * 100) / 100);
    this.inventory
      .createPurchaseOrder({ branchId, ingredientId: alert.ingredientId, quantity })
      .pipe(finalize(() => this.pendingOrderId.set(null)))
      .subscribe({
        next: (order) =>
          this.notify(`Orden ${order.code} creada: ${quantity}${alert.unit} de ${alert.name}.`),
        error: () => this.notify('No se pudo generar la orden de compra.', 'Cerrar'),
      });
  }

  private notify(message: string, action = 'OK'): void {
    this.snackBar.open(message, action, { duration: 4000 });
  }
}
