import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

import { environment } from '@env/environment';
import { LoginRequest, LoginResponse } from '@core/models/auth.models';
import { Workspace } from '@core/models/organization.models';

const STORAGE_KEY = 'gastrobi.session';

function readSession(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoginResponse) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly baseUrl = `${environment.apiUrl}/auth`;

  private readonly session = signal<LoginResponse | null>(readSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly workspace = computed(() => this.session()?.workspace ?? null);
  readonly token = computed(() => this.session()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => {
    const session = this.session();
    return !!session && new Date(session.expiresAt).getTime() > Date.now();
  });

  getWorkspaces(): Observable<Workspace[]> {
    return this.http.get<Workspace[]>(`${this.baseUrl}/workspaces`);
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.baseUrl}/login`, request)
      .pipe(tap((response) => this.setSession(response)));
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/forgot-password`, { email });
  }

  logout(): void {
    this.setSession(null);
    void this.router.navigate(['/login']);
  }

  private setSession(session: LoginResponse | null): void {
    this.session.set(session);
    try {
      if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin almacenamiento disponible: la sesión dura lo que dure la pestaña.
    }
  }
}
