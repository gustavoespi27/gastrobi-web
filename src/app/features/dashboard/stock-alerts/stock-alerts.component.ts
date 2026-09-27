import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';

import { StockAlert } from '@core/models/inventory.models';

@Component({
  selector: 'gb-stock-alerts',
  imports: [DecimalPipe, MatButtonModule, MatCardModule, MatIconModule, MatTableModule, RouterLink],
  templateUrl: './stock-alerts.component.html',
  styleUrl: './stock-alerts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAlertsComponent {
  readonly alerts = input.required<StockAlert[]>();
  /** Ingrediente cuya OC se está generando (deshabilita su botón). */
  readonly pendingId = input<number | null>(null);
  readonly createOrder = output<StockAlert>();

  protected readonly columns = ['item', 'stock', 'lead', 'action'];
  protected readonly criticalCount = computed(
    () => this.alerts().filter((a) => a.urgency === 'critical').length,
  );
}
