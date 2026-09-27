import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';

import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('auth guards', () => {
  const authenticated = signal(false);

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { isAuthenticated: authenticated } },
      ],
    });
  });

  it('authGuard deja pasar con sesión', () => {
    authenticated.set(true);
    expect(run(authGuard)).toBe(true);
  });

  it('authGuard redirige a /login sin sesión', () => {
    authenticated.set(false);
    const result = run(authGuard) as UrlTree;
    expect(result.toString()).toBe('/login');
  });

  it('guestGuard redirige a /dashboard con sesión', () => {
    authenticated.set(true);
    const result = run(guestGuard) as UrlTree;
    expect(result.toString()).toBe('/dashboard');
  });

  it('guestGuard deja pasar sin sesión', () => {
    authenticated.set(false);
    expect(run(guestGuard)).toBe(true);
  });
});
