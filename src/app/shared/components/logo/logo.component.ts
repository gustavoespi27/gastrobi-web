import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'gb-logo',
  templateUrl: './logo.component.html',
  styleUrl: './logo.component.scss',
  host: { '[class.lg]': "size() === 'lg'" },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogoComponent {
  readonly size = input<'sm' | 'lg'>('sm');
}
