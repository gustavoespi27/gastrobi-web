import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  const token = signal<string | null>(null);
  const logout = vi.fn();
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    token.set(null);
    logout.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token, logout } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('agrega el Bearer token a las llamadas a la API', () => {
    token.set('abc');
    http.get('/api/branches').subscribe();
    const req = backend.expectOne('/api/branches');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc');
    req.flush([]);
  });

  it('no agrega el token a URLs externas', () => {
    token.set('abc');
    http.get('https://externo.com/data').subscribe();
    const req = backend.expectOne('https://externo.com/data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('cierra sesión cuando la API responde 401', () => {
    token.set('vencido');
    http.get('/api/dashboard/kpis').subscribe({ error: () => undefined });
    backend.expectOne('/api/dashboard/kpis').flush(null, { status: 401, statusText: 'No' });
    expect(logout).toHaveBeenCalledOnce();
  });

  it('no cierra sesión por un 401 del propio login (credenciales malas)', () => {
    http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/auth/login').flush(null, { status: 401, statusText: 'No' });
    expect(logout).not.toHaveBeenCalled();
  });
});
