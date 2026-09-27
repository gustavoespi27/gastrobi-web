import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { LoginResponse } from '@core/models/auth.models';

import { AuthService } from './auth.service';

const RESPONSE: LoginResponse = {
  accessToken: 'token-123',
  expiresAt: new Date(Date.now() + 60_000).toISOString(),
  user: { id: 'u1', fullName: 'Ana Pérez', email: 'ana@test.cl', role: 'Chef' },
  workspace: { id: 'ws1', name: 'Grupo Test' },
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('parte sin sesión', () => {
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });

  it('login guarda la sesión y la persiste', () => {
    service.login({ email: 'ana@test.cl', password: 'secreta', workspaceId: 'ws1' }).subscribe();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(RESPONSE);

    expect(service.isAuthenticated()).toBe(true);
    expect(service.token()).toBe('token-123');
    expect(service.user()?.fullName).toBe('Ana Pérez');
    expect(localStorage.getItem('gastrobi.session')).toContain('token-123');
  });

  it('una sesión expirada no cuenta como autenticada', () => {
    service.login({ email: 'a@b.cl', password: 'x', workspaceId: null }).subscribe();
    http
      .expectOne('/api/auth/login')
      .flush({ ...RESPONSE, expiresAt: new Date(Date.now() - 1000).toISOString() });

    expect(service.isAuthenticated()).toBe(false);
  });

  it('logout limpia la sesión y vuelve al login', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    service.login({ email: 'a@b.cl', password: 'x', workspaceId: null }).subscribe();
    http.expectOne('/api/auth/login').flush(RESPONSE);

    service.logout();

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('gastrobi.session')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
