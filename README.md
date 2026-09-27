# GastroBI Web

Frontend de GastroBI: Angular 22 + Angular Material 3 + Chart.js.
Hoy funciona con **datos simulados (mocks)**. El siguiente paso es conectarlo a la API .NET.

> Historia del proyecto, contrato completo de la API y guía del backend: ver [BITACORA.md](BITACORA.md).

## Arrancar

Requisito: **Node.js 24 LTS** (o 22.22+). Nada más; Angular CLI viene dentro del proyecto.

```bash
npm install
npm start            # http://localhost:4200
```

Login de prueba (mock): cualquier correo válido y una contraseña de **4 o más caracteres**.
Con menos de 4 se simula un 401.

## Comandos

| Comando             | Qué hace                                                             |
| ------------------- | -------------------------------------------------------------------- |
| `npm start`         | Servidor de desarrollo con recarga automática                        |
| `npm test`          | Tests unitarios (Vitest) en modo watch                               |
| `npm run lint`      | ESLint (reglas oficiales de Angular + accesibilidad)                 |
| `npm run format`    | Formatea todo con Prettier                                           |
| `npm run build`     | Build de producción en `dist/`                                       |
| **`npm run check`** | **Formato + lint + tests + build. Correrlo antes de subir cambios.** |

## Estructura

```
src/
├── styles/            _theme.scss (paleta y tema Material) · _utilities.scss (clases gb-*)
├── environments/      apiUrl y useMocks (dev = mocks activos)
└── app/
    ├── core/          Lo que se instancia una sola vez y no tiene UI
    │   ├── auth/      AuthService, guards, interceptor del JWT
    │   ├── models/    Interfaces TS = contrato con la API (DTOs de .NET)
    │   ├── services/  Un servicio por recurso de la API + BranchContextService
    │   └── mocks/     Backend falso. Se borra cuando la API esté lista
    ├── layout/        Shell (menú lateral + header) y nav-items.ts
    ├── shared/        Reutilizable en cualquier feature: components/, pipes/
    └── features/      Una carpeta por pantalla (login, dashboard, ...)
```

Imports con alias (sin `../../../`): `@core/…`, `@shared/…`, `@features/…`, `@layout/…`, `@env/…`.
Dentro de la misma carpeta de feature se usa `./`.

## Convenciones

- **Componentes standalone + signals + `OnPush`.** `ng generate component` ya los crea así (está configurado en `angular.json`).
- **Nombres de archivo con sufijo:** `*.component.ts`, `*.service.ts`, `*.guard.ts`, `*.pipe.ts`. `ng generate` también lo respeta.
- **Template y estilos en archivos separados** (`.html` / `.scss`), nunca inline.
- **Prefijo `gb-`** en selectores (`<gb-kpi-card>`); el linter lo exige.
- **Colores:** nunca un hex en un componente. Usar tokens de Material (`var(--mat-sys-primary)`) o los propios (`var(--gb-text-subtle)`). Se definen solo en `src/styles/_theme.scss`.
- **Antes de escribir CSS**, buscar si existe un componente Material o una clase `gb-*` (`gb-card`, `gb-badge--warning`, `gb-button-neutral`, `gb-muted`, …).
- **Lógica fuera del template:** si una expresión en el HTML tiene más de un ternario, va a un `computed` o a una función pura con su test (ejemplo: `features/dashboard/dashboard-kpis.ts`).
- **Componentes sin HTTP:** llaman a un servicio de `core/services`, nunca a `HttpClient` directo.

## Receta: conectar un endpoint

Ejemplo: listar el inventario (`GET /api/inventory?branchId=`).

1. **Modelo.** Agregar la interfaz en `core/models/inventory.models.ts`, con los mismos nombres de campo que el DTO de .NET (camelCase):
   ```ts
   export interface InventoryItem {
     ingredientId: number;
     name: string;
     unit: string;
     stock: number;
     parLevel: number;
   }
   ```
2. **Servicio.** Agregar el método en `core/services/inventory.service.ts`:
   ```ts
   getInventory(branchId: string): Observable<InventoryItem[]> {
     return this.http.get<InventoryItem[]>(`${environment.apiUrl}/inventory`, { params: { branchId } });
   }
   ```
3. **Mock (mientras .NET no lo tenga).** Agregar datos en `core/mocks/mock-data.ts` y la ruta en `handlers` de `core/mocks/mock-api.interceptor.ts`:
   ```ts
   'GET /inventory': (req) => mockInventory(req.params.get('branchId')),
   ```
4. **Componente.** Inyectar el servicio y recargar cuando cambie la sucursal. Copiar el patrón de `dashboard.component.ts` (`toObservable(branchCtx.selectedId)` → `switchMap` → `toSignal`).
5. **Probar contra .NET.** Con la API levantada, poner `useMocks: false` en `src/environments/environment.development.ts`. El proxy (`proxy.conf.json`) redirige `/api` a `https://localhost:7180`; ajustar ese puerto al de la API.
6. `npm run check` y listo.

## Receta: nueva pantalla del menú

Los módulos Inventario, Recetas, Ventas, Facturas OCR y Configuración hoy muestran `coming-soon`.

1. `npx ng g component features/inventario` → crea `features/inventario/inventario.component.{ts,html,scss,spec.ts}` con la clase `InventarioComponent`.
2. En `app.routes.ts`, agregar su ruta dentro de `children` (antes de `...pendingModules`):
   ```ts
   { path: 'inventario', title: 'Inventario | GastroBI',
     loadComponent: () => import('@features/inventario/inventario.component').then((m) => m.InventarioComponent) },
   ```
3. Agregar `'inventario'` a `READY_MODULES` en el mismo archivo (así deja de mostrar "en construcción").

## Cuando la API .NET esté completa

- [ ] `useMocks: false` en ambos `environment*.ts`
- [ ] Borrar `src/app/core/mocks/` y quitar `mockApiInterceptor` de `app.config.ts`
- [ ] Revisar en DevTools → Network que cada respuesta tenga la forma de `core/models/*.ts`
