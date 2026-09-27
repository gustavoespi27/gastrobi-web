import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { Workspace } from '@core/models/organization.models';
import { AuthService } from '@core/auth/auth.service';
import { LogoComponent } from '@shared/components/logo/logo.component';

@Component({
  selector: 'gb-login',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    LogoComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly workspaces = toSignal(
    this.auth.getWorkspaces().pipe(catchError(() => of<Workspace[]>([]))),
    { initialValue: [] },
  );
  private readonly chosenWorkspace = signal<Workspace | null>(null);
  protected readonly workspace = computed<Workspace | null>(
    () => this.chosenWorkspace() ?? this.workspaces()[0] ?? null,
  );

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hidePassword = signal(true);
  protected readonly year = new Date().getFullYear();

  protected selectWorkspace(workspace: Workspace): void {
    this.chosenWorkspace.set(workspace);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.auth
      .login({ ...this.form.getRawValue(), workspaceId: this.workspace()?.id ?? null })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/dashboard'),
        error: (err: HttpErrorResponse) =>
          this.error.set(
            err.status === 401
              ? 'Correo o contraseña incorrectos.'
              : 'No pudimos conectar con el servidor. Intenta nuevamente.',
          ),
      });
  }

  protected forgotPassword(): void {
    const email = this.form.controls.email;
    if (email.invalid) {
      email.markAsTouched();
      this.snackBar.open('Ingresa tu correo para recuperar la contraseña.', 'OK', {
        duration: 4000,
      });
      return;
    }
    this.auth.forgotPassword(email.value).subscribe({
      next: () =>
        this.snackBar.open('Si el correo existe, te enviamos instrucciones.', 'OK', {
          duration: 5000,
        }),
      error: () =>
        this.snackBar.open('No se pudo enviar el correo. Intenta más tarde.', 'Cerrar', {
          duration: 5000,
        }),
    });
  }
}
