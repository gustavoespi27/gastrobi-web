import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Pantalla temporal para los módulos del menú que aún no están construidos. */
@Component({
  selector: 'gb-coming-soon',
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './coming-soon.component.html',
  styleUrl: './coming-soon.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComingSoonComponent {
  /** Llega desde data.heading de la ruta (withComponentInputBinding). */
  readonly heading = input('Próximamente');
}
