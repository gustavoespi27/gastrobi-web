import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export type BadgeTone = 'warning' | 'danger' | 'success' | 'info';

@Component({
  selector: 'gb-kpi-card',
  imports: [MatCardModule, MatIconModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly caption = input('');
  readonly badge = input('');
  readonly badgeIcon = input<string | null>(null);
  readonly tone = input<BadgeTone>('info');
}
