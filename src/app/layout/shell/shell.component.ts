import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { catchError, filter, map, of, switchMap } from 'rxjs';

import { AuthService } from '@core/auth/auth.service';
import { BranchContextService } from '@core/services/branch-context.service';
import { InvoiceService } from '@core/services/invoice.service';
import { LogoComponent } from '@shared/components/logo/logo.component';
import { NAV_ITEMS } from '@layout/nav-items';

@Component({
  selector: 'gb-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    LogoComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  protected readonly branchCtx = inject(BranchContextService);
  private readonly router = inject(Router);
  private readonly invoices = inject(InvoiceService);

  protected readonly navItems = NAV_ITEMS;

  protected readonly isHandset = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 960px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly currentSection = computed(
    () => this.navItems.find((item) => this.url().startsWith(`/${item.path}`))?.label ?? '',
  );

  protected readonly userInitials = computed(() =>
    (this.auth.user()?.fullName ?? '')
      .split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  protected readonly pendingInvoices = toSignal(
    toObservable(this.branchCtx.selectedId).pipe(
      filter((id): id is string => !!id),
      switchMap((id) => this.invoices.getPendingCount(id).pipe(catchError(() => of(0)))),
    ),
    { initialValue: 0 },
  );

  constructor() {
    this.branchCtx.load();
  }

  protected closeOnHandset(sidenav: MatSidenav): void {
    if (this.isHandset()) void sidenav.close();
  }
}
