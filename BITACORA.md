# Bitácora — Migración GastroBI a Angular + API .NET

Fecha de inicio: 2026-09-27

> **Stack definido de la tesis** (manda sobre cualquier ejemplo de este documento):
>
> | Capa          | Tecnología                                                                              |
> | ------------- | --------------------------------------------------------------------------------------- |
> | Frontend      | Angular 22 + Angular Material 3 + Chart.js (este repo)                                  |
> | Backend       | ASP.NET Core (.NET 10) + EF Core + ASP.NET Core Identity (JWT)                          |
> | Base de datos | PostgreSQL 15+ en Supabase, con Row-Level Security por `empresa_id`                     |
> | Archivos      | Supabase Storage (boletas/facturas para OCR)                                            |
> | ML (Motor 3)  | Servicio Python separado que escribe en la tabla `pronosticos_compra`; .NET solo la lee |
>
> El front partió como mockup de Figma hecho aparte del modelo de datos. Las secciones 5 y 6 ya están alineadas con el esquema de 19 tablas; lo que el front aún no respeta está en la sección 4.

---

## 1. Punto de partida

El proyecto original (respaldado en `Desktop/front-react-figma-respaldo.zip`) era un **mockup de Figma Make** en React + Tailwind:

- Un solo archivo con dos "pantallas" dibujadas lado a lado (Login y Dashboard). No eran rutas.
- Todos los datos estaban fijos en el código (ventas, alertas de stock, KPIs, usuario).
- Los colores estaban repetidos como hex inline (`style={{ color: '#C26D38' }}`) en cada elemento.
- No había navegación, autenticación ni llamadas HTTP. El formulario de login no hacía nada.
- El gráfico usaba Recharts (librería de React).

## 2. Qué se hizo (front)

| React (antes)                  | Angular (ahora)                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `LoginScreen`                  | `features/auth/login` con Reactive Forms, validación, `mat-form-field`, estado de carga y errores                     |
| `Dashboard` (sidebar + header) | `layout/shell` con `mat-sidenav`, `mat-nav-list` y `mat-menu` (sucursal y usuario)                                    |
| KPI cards                      | `features/dashboard/kpi-card` con `mat-card`                                                                          |
| Gráfico Recharts               | `features/dashboard/sales-chart` con **Chart.js** (sin dependencia de framework)                                      |
| Tabla de alertas               | `features/dashboard/stock-alerts` con `mat-table` y botón "Generar OC" funcional                                      |
| Íconos SVG a mano              | `mat-icon` + Material Symbols                                                                                         |
| Hex inline y Tailwind          | **Tema Material 3** en `src/styles/_theme.scss`: la paleta de Figma se mapea a los tokens `--mat-sys-*`               |
| Datos fijos                    | Servicios HTTP + **interceptor mock** que imita la API .NET                                                           |
| Sin rutas                      | `/login`, `/dashboard`, `/inventario`, `/recetas`, `/ventas`, `/facturas`, `/configuracion` con guards y lazy loading |

Decisiones técnicas:

- **Angular 22** (se escribió en 20 y se subió a 22 antes de compilar, ver sección 3), componentes standalone, **signals**, sin zone.js (en Angular 22 es el comportamiento por defecto), sintaxis `@if/@for` y `OnPush` en todo.
- **Se eliminó Tailwind.** Los colores viven una sola vez en `src/styles/_theme.scss` y los componentes Material los toman solos. Lo que Material no trae (badges de estado, puntos de urgencia, grillas) está en SCSS mínimo por componente o en utilidades `gb-*` globales.
- **Mock por interceptor** (`core/mocks/mock-api.interceptor.ts`): los servicios ya llaman a las URLs reales (`/api/...`). Con `useMocks: true` el interceptor responde con datos de ejemplo. Para usar .NET basta con poner `useMocks: false`, sin tocar componentes.
- **Sucursal activa** (`BranchContextService`): al cambiar de sucursal en el header, el dashboard vuelve a pedir los datos.
- **Auth con JWT**: `AuthService` guarda la sesión, `authInterceptor` agrega `Authorization: Bearer ...` y cierra sesión ante un 401, `authGuard`/`guestGuard` protegen las rutas.

### Estructura

Detalle, convenciones y recetas para seguir desarrollando: ver **[README.md](README.md)**.

```
gastrobi-web/
├── README.md · BITACORA.md
├── angular.json · package.json · proxy.conf.json · tsconfig{,.app,.spec}.json
├── eslint.config.js · .prettierrc · .editorconfig · .gitattributes · .vscode/
├── public/favicon.svg
└── src/
    ├── index.html · main.ts · styles.scss
    ├── styles/          _theme.scss (paleta) · _utilities.scss (clases gb-*)
    ├── environments/    apiUrl y useMocks
    └── app/
        ├── app.ts · app.config.ts · app.routes.ts
        ├── core/
        │   ├── auth/        auth.service, auth.guard, auth.interceptor (+ tests)
        │   ├── mocks/       mock-api.interceptor, mock-data   ← borrar al tener API
        │   ├── models/      contratos TS (= DTOs de .NET)
        │   └── services/    branch-context, dashboard, inventory, invoice
        ├── layout/          shell (sidebar + header), nav-items.ts
        ├── shared/          components/logo · pipes/compact-currency
        └── features/
            ├── auth/login/
            ├── dashboard/   kpi-card, sales-chart, stock-alerts, dashboard-kpis
            └── coming-soon/ placeholder de módulos sin diseño
```

## 3. Instalación y cómo levantarlo

### 3.1 Lo que se instaló en el equipo de desarrollo (2026-09-27)

| Qué                                       | Versión                                                                                  | Cómo                                                                       | Para qué                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **Node.js LTS** (incluye **npm**)         | Node 24.19.0 · npm 11.17.0                                                               | `winget install OpenJS.NodeJS.LTS`                                         | Ejecutar Angular CLI y el servidor de desarrollo                        |
| Dependencias del proyecto                 | Angular 22.2.0, Angular Material/CDK 22.2.0, TypeScript 6.0, Chart.js 4.5.1, RxJS 7.8    | `npm install` dentro de `gastrobi-web/` (220 paquetes, 0 vulnerabilidades) | Quedan en `gastrobi-web/node_modules/` (no se sube a git)               |
| Herramientas de calidad (devDependencies) | Vitest 5 + jsdom (tests), ESLint 10 + angular-eslint 22.5 (lint), Prettier 3.8 (formato) | `npm install` / `ng add angular-eslint`                                    | Se instalan solas con `npm install`; nadie tiene que instalarlas aparte |

Resultado: `npm run check` (formato + lint + 21 tests + build) pasa sin errores ni advertencias, y `ng serve` levanta en http://localhost:4200.

> Angular CLI **no se instaló de forma global**. Viene en las dependencias del proyecto y se usa con `npx ng ...`
> (o `npm start`). Así todos usan exactamente la misma versión.

### 3.2 Lo que cada compañero necesita instalar

**Obligatorio (solo 1 cosa):**

1. **Node.js 24 LTS** (o 22.22+), que ya trae npm.
   - Windows: `winget install OpenJS.NodeJS.LTS`, o el instalador de https://nodejs.org (botón "LTS").
   - macOS: `brew install node@24`, o el instalador de nodejs.org.
   - Verificar en una terminal **nueva**: `node -v` debe mostrar v24.x (o v22.22 o superior).

Después, en la carpeta del proyecto:

```bash
cd gastrobi-web
npm install          # descarga Angular, Material, Chart.js, etc. (~1 min)
npm start            # = ng serve → abrir http://localhost:4200
```

Login de prueba (mock): cualquier correo válido y una contraseña de **4 o más caracteres**. Con menos de 4 se simula un error 401.

**Recomendado:**

- **VS Code** + las extensiones **Angular Language Service** (`angular.ng-template`) y **Prettier** (`esbenp.prettier-vscode`). El proyecto trae `.vscode/settings.json` para formatear al guardar.
- **Git**, para trabajar en equipo: `winget install Git.Git`.
- **No trabajar dentro de OneDrive**: clonar el proyecto en algo como `C:\dev\gastrobi`. OneDrive intenta sincronizar `node_modules` (miles de archivos) y vuelve todo lento o bloquea archivos.

**Solo quien trabaje en el backend (todavía no existe):**

- **.NET 10 SDK**: `winget install Microsoft.DotNet.SDK.10`.
- Base de datos: **PostgreSQL en Supabase** (proyecto compartido del equipo); para trabajar sin internet, **PostgreSQL 15+ local** con el mismo esquema.
- Opcional: Visual Studio 2022+ o la extensión **C# Dev Kit** de VS Code.

> No se instaló .NET en este equipo porque el backend aún no está creado. Se instala cuando se empiece la sección 6.

**Solo quien trabaje en el ML (Motor 3):**

- **Python 3.12+** con `pandas`, `scikit-learn` / `lightgbm` y `psycopg` (ver sección 6.7).

### 3.3 Problemas conocidos

- **`node` no se reconoce después de instalar:** cerrar y volver a abrir la terminal (o VS Code) para que tome el PATH nuevo.
- **Avisos `npm warn allow-scripts` durante `npm install`:** npm 11 bloquea por defecto los scripts de instalación
  (esbuild, lmdb, @parcel/watcher, msgpackr-extract). El proyecto compila y corre igual, así que se pueden ignorar.
- **`ng` no se reconoce:** usar `npx ng ...` o `npm start` / `npm run build`. El CLI es local al proyecto.
- **Puerto 4200 ocupado:** `npx ng serve --port 4300`.

## 4. Pendientes del front

- [x] Correr `npm install` + `ng serve` + `ng build` y corregir lo que falle.
- [x] Revisión visual contra el Figma (se corrigieron menú lateral, bloque de usuario, eje Y del gráfico, botón "Generar OC" y botones neutros).
- [x] Tests unitarios (Vitest): auth.service, guards, interceptor, mocks, KPIs y pipe (21 tests).
- [x] Lint (angular-eslint) + formato (Prettier) + `npm run check`.
- [x] Borrar el proyecto React/Figma Make de la raíz (`front/`). Respaldo en `Desktop/front-react-figma-respaldo.zip`.
- [ ] Tests de componentes (login, dashboard) y e2e (Playwright) cuando las pantallas se estabilicen.
- [ ] Diseñar y construir los módulos: **Inventario, Recetas, Ventas, Facturas OCR, Configuración** (hoy muestran `coming-soon`).
- [ ] Flujo completo de recuperación de contraseña (pantalla para el token de reseteo).
- [ ] Refresh token (hoy, cuando el token expira se vuelve al login).
- [ ] **Moneda en CLP, sin decimales** (hoy el formato es USD, `$34.8K`). Ver `shared/compact-currency.pipe.ts`.
- [ ] Al conectar el backend: poner `useMocks: false`, borrar `core/mocks/` y sacar `mockApiInterceptor` de `app.config.ts`.

### Diferencias entre el mockup y el modelo de datos (resolver antes de construir más pantallas)

- [ ] **IDs como UUID:** la API solo expone el `uid` UUID de cada tabla, nunca el `id` BIGINT interno. En `core/models/*.ts` los IDs pasan a `string` (UUID); los nombres de campo (`ingredientId`, `branchId`) se mantienen. Hoy los mocks usan IDs como `cocina-central` o `101`, que hay que reemplazar.
- [ ] **Workspace = empresa:** se mantiene "workspace" en el front y en la API, pero corresponde a la tabla `empresas`.
- [ ] **Pantalla de sugerencias de compra** (la cara visible del Motor 3). El gráfico actual "ventas reales vs. predichas" **no** es lo que predice el modelo (ver la nota de `sales-forecast` en la sección 5).
- [ ] **Roles:** hoy `role` es texto libre y no hay guards por rol. Usar `AspNetRoles` y agregar un `roleGuard`. El perfil pasa de `role: string` a `roles: string[]` (un usuario puede tener varios roles).
- [ ] **Pantalla de validación humana de facturas OCR** antes de sumar al stock.

---

## 5. Contrato de la API (lo que .NET debe exponer)

Convenciones:

- Prefijo **`/api`**. JSON en **camelCase** (es el default de ASP.NET Core).
- **IDs:** siempre el `uid` (UUID) de la tabla, nunca el `id` BIGINT interno.
- **Dinero:** CLP sin decimales (número entero). **Cantidades de insumo:** hasta 4 decimales.
- **Fechas:** en UTC en la base. En JSON, `DateOnly` → `"2026-09-28"` y `DateTimeOffset` → ISO 8601.
- Enums como **string en camelCase** (`"critical"`, `"warning"`, `"low"`).
- Todo requiere `Authorization: Bearer <jwt>` salvo lo marcado como público.
- El **workspace (= fila de `empresas`) sale del JWT**, nunca del query. `branchId` es el `uid` de `sucursales`, y el backend **debe validar que la sucursal pertenezca a la empresa** del token (si no, 403).
- Errores con **ProblemDetails** (`AddProblemDetails()`).

Los tipos TypeScript en `src/app/core/models/` son la referencia de cada respuesta (con las diferencias pendientes de la sección 4).

### Endpoints usados hoy por el front

| Método | Ruta                                                                   | Auth      | Request                      | Respuesta                                    | De dónde sale (esquema)                                                        |
| ------ | ---------------------------------------------------------------------- | --------- | ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/auth/workspaces`                                                 | público\* | —                            | `Workspace[]`                                | `empresas`                                                                     |
| POST   | `/api/auth/login`                                                      | público   | `LoginRequest`               | `LoginResponse` · 401 si falla               | `AspNetUsers` / `AspNetUserRoles`                                              |
| POST   | `/api/auth/forgot-password`                                            | público   | `{ email }`                  | 204 siempre (no revelar si el correo existe) | `AspNetUsers` (token de reseteo de Identity)                                   |
| GET    | `/api/branches`                                                        | ✔         | —                            | `Branch[]` de la empresa del token           | `sucursales`                                                                   |
| GET    | `/api/dashboard/kpis?branchId=`                                        | ✔         | —                            | `DashboardKpis`                              | `inventario_sucursal`, `mermas`, `pronosticos_compra`, `facturas_compra`       |
| GET    | `/api/dashboard/sales-forecast?branchId=&historyDays=9&forecastDays=7` | ✔         | —                            | `SalesForecast`                              | **a redefinir** (ver nota)                                                     |
| GET    | `/api/inventory/stock-alerts?branchId=`                                | ✔         | —                            | `StockAlert[]`                               | `inventario_sucursal` + `insumo_proveedor` + kardex (`movimientos_inventario`) |
| POST   | `/api/purchase-orders`                                                 | ✔         | `CreatePurchaseOrderRequest` | `PurchaseOrder` (201)                        | **no existe tabla** (ver decisión abierta)                                     |
| GET    | `/api/invoices/pending-count?branchId=`                                | ✔         | —                            | `{ count: number }`                          | `facturas_compra` pendientes                                                   |
| GET    | `/api/purchase-suggestions?branchId=&week=`                            | ✔         | —                            | `PurchaseSuggestion[]`                       | `pronosticos_compra` (+ `inventario_sucursal`, `insumo_proveedor`) — **nuevo** |

\* **Decisión abierta:** si `/auth/workspaces` es público, cualquiera puede ver la lista de clientes. Alternativas:
(a) login sin workspace, que la respuesta traiga los workspaces del usuario y que un segundo paso emita el token del workspace elegido;
(b) identificar el workspace por subdominio (`ckg.gastrobi.cl`);
(c) **quitar el selector de workspace del login**, porque cada usuario pertenece a una sola empresa (`AspNetUsers.EmpresaId`); la empresa sale del usuario y el endpoint deja de existir.

**Nota `sales-forecast`:** el Motor 3 **no pronostica ventas en dinero**, sino la **cantidad a comprar por insumo, sucursal y semana**. Opciones para el gráfico del dashboard:
(1) dejarlo solo con ventas reales (`ventas`), sin línea de pronóstico; o
(2) cambiarlo por **consumo real vs. proyectado** de un insumo (`consumo_semanal_insumo` + `pronosticos_compra`).

**Decisión abierta sobre OC:** el esquema no tiene órdenes de compra. Se recomienda agregar `ordenes_compra` y `detalle_orden_compra` (con `empresa_id`, `sucursal_id`, `proveedor_id`, `estado`, `uid`) para cerrar el ciclo **sugerencia → OC → factura OCR → stock**. Mientras no exista, el botón "Generar OC" del dashboard no tiene dónde guardar.

**Nuevo endpoint del Motor 3:** `GET /api/purchase-suggestions?branchId=&week=` lee `pronosticos_compra` y devuelve `PurchaseSuggestion[]`. `week` es la fecha del lunes de la semana (`yyyy-MM-dd`); si se omite, se usa la semana actual.

### Ejemplos JSON

Los UUID aparecen abreviados (`"9a1c…"`) para que se lean mejor; en la API real van completos.

```jsonc
// POST /api/auth/login
{ "email": "marco@centralkitchen.cl", "password": "****" }
// 200
{
  "accessToken": "eyJhbGciOi...",
  "expiresAt": "2026-09-28T15:00:00Z",
  "user": { "id": "e05a…", "fullName": "Marco Patel", "email": "marco@centralkitchen.cl", "roles": ["Chef"] },
  "workspace": { "id": "3f2e…", "name": "Central Kitchen Group" }
}

// GET /api/dashboard/kpis?branchId=9a1c…
{
  "criticalStockItems": 7,
  "wasteCost": 268000,
  "wasteCostChangePct": 12,
  "projectedDemand": 1850000,
  "projectedDemandChangePct": 8.4,
  "pendingInvoices": 2
}

// GET /api/dashboard/sales-forecast?branchId=9a1c…&historyDays=9&forecastDays=7   (a redefinir, ver nota)
{
  "today": "2026-09-28",
  "points": [
    { "date": "2026-09-20", "actual": 3820000, "predicted": null },
    { "date": "2026-09-28", "actual": 4320000, "predicted": null },
    { "date": "2026-09-29", "actual": null, "predicted": 4580000 }
  ]
}

// GET /api/inventory/stock-alerts?branchId=9a1c…
[
  { "ingredientId": "b7d4…", "name": "Harina de fuerza (00)", "unit": "kg", "stock": 4.2,
    "parLevel": 25, "leadTimeDays": 2, "urgency": "critical" }
]

// GET /api/purchase-suggestions?branchId=9a1c…&week=2026-09-28
[
  {
    "ingredientId": "b7d4…",
    "name": "Harina de fuerza (00)",
    "unit": "kg",
    "currentStock": 4.2,
    "projectedConsumption": 38.5,
    "suggestedQuantity": 40,
    "safetyStock": 6,
    "supplierId": "c81f…",
    "estimatedCost": 52000,
    "modelVersion": "lgbm-2026.09.1",
    "generatedAt": "2026-09-28T04:00:00Z"
  }
]

// POST /api/purchase-orders   (pendiente de la decisión sobre OC)
{ "branchId": "9a1c…", "ingredientId": "b7d4…", "quantity": 20.8 }
// 201
{ "id": "71aa…", "code": "OC-1042", "status": "draft", "createdAt": "2026-09-28T14:22:10Z" }
```

### Reglas de negocio que debe resolver el backend

- **KPIs**
  - `criticalStockItems`: cantidad de insumos con urgencia `critical`.
  - `wasteCost`: suma del costo de las `mermas` registradas en la semana en curso (CLP).
  - `*ChangePct`: variación contra el período anterior equivalente.
  - `projectedDemand`: **costo estimado de la compra sugerida de la semana**, Σ `cantidad_sugerida × precio_referencia`, no un pronóstico de ventas. El front debe cambiar el rótulo de esa tarjeta, que hoy dice "Demanda proyectada · pronóstico ML".
- **Consumo diario promedio:** sale de `movimientos_inventario` con `tipo_movimiento = 'SALIDA_VENTA_RECETA'` más las `mermas`, en las **últimas 4 semanas**.
- **`leadTimeDays`:** el del proveedor preferido (`insumo_proveedor.es_proveedor_preferido`).
- **`parLevel`:** el stock mínimo en `inventario_sucursal` (agregar la columna si no existe).
- **Urgencia de stock** (a validar con el negocio). Propuesta basada en días de cobertura
  (`stock / consumo diario promedio`):
  - `critical`: la cobertura es menor o igual al `leadTimeDays` del proveedor (se agota antes de que llegue el pedido).
  - `warning`: la cobertura es menor o igual a `leadTimeDays + 2`.
  - `low`: `stock < parLevel`, pero con margen.
  - Solo se listan los ítems con `stock < parLevel`, ordenados por urgencia.
- **Cantidad de la OC:** usa `cantidad_sugerida` de `pronosticos_compra` si existe; si no, `parLevel - stock`, redondeada hacia arriba a `cantidad_minima_pedido` del proveedor.

### Endpoints previstos para los módulos siguientes (borrador)

| Módulo                | Endpoints                                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inventario            | `GET /api/inventory?branchId=&search=&page=` · `POST /api/inventory/adjustments` (ajuste = un movimiento nuevo en el kardex, **nunca UPDATE**) · `POST /api/waste` (registrar merma)         |
| Sugerencias de compra | `GET /api/purchase-suggestions?branchId=&week=` (lectura de `pronosticos_compra`)                                                                                                            |
| Recetas               | `GET/POST /api/recipes` · `GET/PUT/DELETE /api/recipes/{id}` · `GET /api/recipes/{id}/cost` (costeo por insumos)                                                                             |
| Ventas                | `GET /api/sales?branchId=&from=&to=` · `POST /api/sales/import` (CSV / POS)                                                                                                                  |
| Facturas OCR          | `POST /api/invoices` (multipart, archivo) · `GET /api/invoices?status=pending` · `GET /api/invoices/{id}` · `PUT /api/invoices/{id}/confirm` (validación humana; recién ahí entra al kardex) |
| Órdenes de compra     | `GET /api/purchase-orders?branchId=&status=` · `PUT /api/purchase-orders/{id}/send` (si se aprueban las tablas `ordenes_compra`)                                                             |
| Configuración         | `GET/PUT /api/settings` · `GET/POST /api/users` · `GET/POST /api/branches` · `GET/POST /api/suppliers`                                                                                       |

---

## 6. Backend .NET — paso a paso

### 6.1 Crear la solución

Requiere **.NET 10 SDK (LTS)**. No se usa SQL Server ni ML.NET.

```bash
mkdir gastrobi-api && cd gastrobi-api
dotnet new sln -n GastroBI
dotnet new webapi -n GastroBI.Api --use-controllers
dotnet sln add GastroBI.Api

cd GastroBI.Api
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package EFCore.NamingConventions                          # snake_case automático
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.AspNetCore.Identity.EntityFrameworkCore
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
```

Estructura sugerida (por capas simples; se puede separar en proyectos después):

```
GastroBI.Api/
├── Controllers/     AuthController, BranchesController, DashboardController, InventoryController,
│                    PurchaseSuggestionsController, InvoicesController
├── Contracts/       DTOs (records) = modelos TS del front
├── Domain/          entidades EF: Empresa, Sucursal, ApplicationUser, Insumo, InventarioSucursal, ...
├── Data/            GastroDbContext, TenantConnectionInterceptor, Migrations/
├── Services/        CurrentTenant, DashboardService, InventoryService, PurchaseSuggestionService, TokenService
└── Program.cs
```

### 6.2 Program.cs

```csharp
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
        new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));   // "critical", "draft", ...
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddHttpContextAccessor();

// Empresa del usuario actual: lee el claim empresa_id del JWT.
builder.Services.AddScoped<ICurrentTenant, CurrentTenant>();
// Ejecuta set_config('app.empresa_id', ...) cada vez que se abre una conexión (RLS).
builder.Services.AddScoped<TenantConnectionInterceptor>();

builder.Services.AddDbContext<GastroDbContext>((sp, o) => o
    .UseNpgsql(builder.Configuration.GetConnectionString("Default"))
    .UseSnakeCaseNamingConvention()
    .AddInterceptors(sp.GetRequiredService<TenantConnectionInterceptor>()));

builder.Services.AddIdentityCore<ApplicationUser>()
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<GastroDbContext>();

var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwt["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwt["Audience"],
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!)),
        ValidateLifetime = true,
    });
builder.Services.AddAuthorization();

// Solo es necesario si Angular llama directo a la API (sin proxy) o se despliegan en dominios distintos.
builder.Services.AddCors(o => o.AddPolicy("Angular", p => p
    .WithOrigins(builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:4200"])
    .AllowAnyHeader()
    .AllowAnyMethod()));

builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IPurchaseSuggestionService, PurchaseSuggestionService>();
// ...

var app = builder.Build();

if (app.Environment.IsDevelopment()) app.MapOpenApi();   // /openapi/v1.json
app.UseExceptionHandler();
app.UseHttpsRedirection();
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
```

Tenant actual e interceptor de conexión:

```csharp
public interface ICurrentTenant
{
    /// <summary>uid de la fila de empresas del usuario autenticado; null si no hay sesión.</summary>
    Guid? EmpresaUid { get; }
}

public sealed class CurrentTenant(IHttpContextAccessor http) : ICurrentTenant
{
    public Guid? EmpresaUid =>
        Guid.TryParse(http.HttpContext?.User.FindFirst("empresa_id")?.Value, out var uid) ? uid : null;
}

public sealed class TenantConnectionInterceptor(ICurrentTenant tenant) : DbConnectionInterceptor
{
    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        using var cmd = BuildCommand(connection);
        cmd.ExecuteNonQuery();
    }

    public override async Task ConnectionOpenedAsync(DbConnection connection, ConnectionEndEventData eventData,
        CancellationToken cancellationToken = default)
    {
        await using var cmd = BuildCommand(connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    // Siempre se escribe (vacío si no hay sesión) para que una conexión reutilizada no herede otra empresa.
    private DbCommand BuildCommand(DbConnection connection)
    {
        var cmd = connection.CreateCommand();
        cmd.CommandText = "select set_config('app.empresa_id', @empresa_uid, false)";
        var p = cmd.CreateParameter();
        p.ParameterName = "empresa_uid";
        p.Value = tenant.EmpresaUid?.ToString() ?? "";
        cmd.Parameters.Add(p);
        return cmd;
    }
}
```

`appsettings.Development.json`. La contraseña de la base y la clave del JWT van en **User Secrets**
(`dotnet user-secrets set "ConnectionStrings:Default" "..."` y `dotnet user-secrets set "Jwt:Key" "..."`), nunca en el repo:

```json
{
  "ConnectionStrings": {
    "Default": "Host=aws-0-<region>.pooler.supabase.com;Port=5432;Database=postgres;Username=gastrobi_app.<project-ref>;Password=<en user-secrets>;SSL Mode=Require"
  },
  "Jwt": {
    "Issuer": "gastrobi-api",
    "Audience": "gastrobi-web",
    "Key": "<mínimo 32 caracteres, en user-secrets>"
  },
  "Cors": { "Origins": ["http://localhost:4200"] }
}
```

Notas de la conexión a Supabase:

- **La app se conecta con un rol propio (`gastrobi_app`), no con `postgres`.** El dueño de las tablas se salta el RLS, así que con `postgres` el aislamiento por empresa no se aplicaría.
- Usar el **session pooler (puerto 5432)**. **No usar el transaction pooler (6543)**: no conserva variables de sesión y rompe el `set_config` del RLS.
- **Las migraciones se corren con la conexión directa** (`db.<project-ref>.supabase.co:5432`) y el usuario dueño del esquema. Esa conexión es IPv6; si la red no tiene IPv6, usar el session pooler con el usuario dueño.
- **La API y la base deben estar en la misma región**; cada consulta cruza la red y la latencia se multiplica.

### 6.3 DTOs (espejo de `src/app/core/models`)

```csharp
namespace GastroBI.Api.Contracts;

public record WorkspaceDto(Guid Id, string Name);                       // empresas.uid
public record BranchDto(Guid Id, string Name);                          // sucursales.uid

public record LoginRequest(string Email, string Password);
// Id = AspNetUsers.Id (Identity lo guarda como texto con formato GUID).
public record UserProfileDto(string Id, string FullName, string Email, IReadOnlyList<string> Roles);
public record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, UserProfileDto User, WorkspaceDto Workspace);

public record DashboardKpisDto(int CriticalStockItems, long WasteCost, decimal WasteCostChangePct,
                               long ProjectedDemand, decimal ProjectedDemandChangePct, int PendingInvoices);
public record SalesPointDto(DateOnly Date, long? Actual, long? Predicted);          // a redefinir
public record SalesForecastDto(DateOnly Today, IReadOnlyList<SalesPointDto> Points);

public enum StockUrgency { Critical, Warning, Low }
public record StockAlertDto(Guid IngredientId, string Name, string Unit, decimal Stock,
                            decimal ParLevel, int LeadTimeDays, StockUrgency Urgency);

public record PurchaseSuggestionDto(
    Guid IngredientId, string Name, string Unit,
    decimal CurrentStock, decimal ProjectedConsumption, decimal SuggestedQuantity, decimal SafetyStock,
    Guid? SupplierId, long EstimatedCost, string ModelVersion, DateTimeOffset GeneratedAt);

// Pendiente de la decisión sobre ordenes_compra (sección 5).
public record CreatePurchaseOrderRequest(Guid BranchId, Guid IngredientId, decimal Quantity);
public enum PurchaseOrderStatus { Draft, Sent, Received, Cancelled }
public record PurchaseOrderDto(Guid Id, string Code, PurchaseOrderStatus Status, DateTimeOffset CreatedAt);
```

Dinero como `long` (CLP entero) en la API; en la base es `numeric(14,2)`. Cantidades como `decimal`.

### 6.4 Controllers de ejemplo

```csharp
[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(IDashboardService dashboard, IBranchAccess branchAccess) : ControllerBase
{
    [HttpGet("kpis")]
    public async Task<ActionResult<DashboardKpisDto>> GetKpis([FromQuery] Guid branchId, CancellationToken ct)
    {
        if (!await branchAccess.CanAccessAsync(User, branchId, ct)) return Forbid();
        return Ok(await dashboard.GetKpisAsync(branchId, ct));
    }
}

/// <summary>
/// Motor 3. Solo LEE pronosticos_compra: .NET nunca ejecuta el modelo; lo hace el servicio Python (6.7).
/// </summary>
[ApiController]
[Route("api/purchase-suggestions")]
[Authorize]
public class PurchaseSuggestionsController(IPurchaseSuggestionService suggestions, IBranchAccess branchAccess)
    : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<PurchaseSuggestionDto>>> Get(
        [FromQuery] Guid branchId, [FromQuery] DateOnly? week, CancellationToken ct)
    {
        if (!await branchAccess.CanAccessAsync(User, branchId, ct)) return Forbid();
        // week = lunes de la semana; null = semana actual.
        return Ok(await suggestions.GetAsync(branchId, week, ct));
    }
}
```

`PurchaseSuggestionService.GetAsync` hace un `SELECT` sobre `pronosticos_compra` de esa sucursal y semana, y completa:

- `currentStock` desde `inventario_sucursal`;
- `supplierId` y `precio_referencia` desde `insumo_proveedor` (proveedor preferido);
- `estimatedCost = cantidad_sugerida × precio_referencia`, redondeado a CLP.

### 6.5 Login y JWT (ASP.NET Core Identity)

```csharp
public class ApplicationUser : IdentityUser
{
    public string NombreCompleto { get; set; } = "";
    public long EmpresaId { get; set; }
    public Empresa Empresa { get; set; } = null!;
    public long? SucursalId { get; set; }
    public Sucursal? Sucursal { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
}
```

- Si una columna existe en la tabla `AspNetUsers` y **no** en la clase, EF la marca para borrar en la siguiente migración. La clase debe tener todas las columnas del esquema.
- Contraseñas y bloqueos los maneja `UserManager<ApplicationUser>`. Roles desde `AspNetRoles` / `AspNetUserRoles`.
- El token lleva los claims: `sub` (userId), `email`, `role` (**uno por rol**), `empresa_id` (**uid** de la empresa) y opcionalmente `sucursal_id` (uid de la sucursal asignada).
- Duración sugerida de 8 a 12 horas (un turno). Luego se agrega refresh token (queda pendiente en el front).

```csharp
public string CreateToken(ApplicationUser user, IEnumerable<string> roles, Guid empresaUid, Guid? sucursalUid)
{
    var claims = new List<Claim>
    {
        new(JwtRegisteredClaimNames.Sub, user.Id),
        new(JwtRegisteredClaimNames.Email, user.Email!),
        new("empresa_id", empresaUid.ToString()),
    };
    claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
    if (sucursalUid is Guid s) claims.Add(new Claim("sucursal_id", s.ToString()));

    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
    var token = new JwtSecurityToken(_config["Jwt:Issuer"], _config["Jwt:Audience"], claims,
        expires: DateTime.UtcNow.AddHours(12),
        signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

### 6.6 Modelo de datos (esquema de 19 tablas)

La referencia completa (columnas, tipos, índices y relaciones) está en **`GASTROBI_ERD.md`** (aún no está en este repo).

| Grupo             | Tablas                                                                         |
| ----------------- | ------------------------------------------------------------------------------ |
| Tenant y usuarios | `empresas`, `sucursales`, `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`      |
| Catálogo          | `unidades_medida`, `categorias_insumo`, `insumos`                              |
| Stock             | `inventario_sucursal`, `movimientos_inventario` (kardex particionado por mes)  |
| Recetas y ventas  | `recetas`, `detalle_receta`, `ventas`, `detalle_venta`                         |
| Pérdidas          | `mermas`                                                                       |
| Compras           | `proveedores`, `insumo_proveedor`, `facturas_compra`, `detalle_factura_compra` |

**Tablas pendientes:** `consumo_semanal_insumo`, `pronosticos_compra` y (opcional) `ordenes_compra` + `detalle_orden_compra`.

Reglas:

- **snake_case y tablas en plural**, excepto las de Identity (PascalCase). Ojo: `UseSnakeCaseNamingConvention()` también renombraría las de Identity (`AspNetUsers` → `asp_net_users`). En `OnModelCreating`, después de `base.OnModelCreating(builder)`, fijarlas con `ToTable("AspNetUsers")`, etc., y sus columnas con `HasColumnName(...)` según el ERD.
- **Kardex append-only:** `movimientos_inventario` no admite `UPDATE` ni `DELETE`. Cada movimiento inserta una fila y actualiza `inventario_sucursal` **en la misma transacción**. Una corrección es un movimiento de ajuste nuevo.
- **Multi-tenant en dos capas:**
  1. **RLS en PostgreSQL** con `set_config('app.empresa_id', ...)`, que el `TenantConnectionInterceptor` ejecuta al abrir cada conexión (6.2).
  2. **Global query filter de EF** por `EmpresaId` en cada entidad con empresa (por ejemplo `HasQueryFilter(x => x.Empresa.Uid == _tenant.EmpresaUid)`).
- **Una sola fuente de verdad del esquema:** la migración `InitialCreate` se genera desde el modelo EF y se usa como **baseline**. Se marca como aplicada **sin ejecutar su DDL**, insertando su fila en `__EFMigrationsHistory`, porque las tablas ya existen en Supabase. De ahí en adelante todo cambio es una migración.
- **Particiones, políticas RLS y el rol `gastrobi_app` van en `migrationBuilder.Sql(...)`**, porque EF no los modela. La contraseña del rol se fija a mano en Supabase (`alter role gastrobi_app password '...'`), nunca en una migración.
- **`decimal` para cantidades `(14,4)` y dinero `(14,2)`, nunca `double`.**
- **`storage_path`** guarda la ruta interna de Supabase Storage, **nunca una URL ni base64**. La URL firmada se genera al momento de mostrar el archivo.

Ejemplo de lo que va en `migrationBuilder.Sql(...)`:

```sql
-- Rol de la aplicación (sin BYPASSRLS; la contraseña se fija a mano fuera del repo)
create role gastrobi_app login noinherit;

-- RLS: el claim empresa_id trae el uid; la política lo traduce al id interno
alter table inventario_sucursal enable row level security;
create policy empresa_aislada on inventario_sucursal
  using (empresa_id = (select e.id from empresas e
                       where e.uid = nullif(current_setting('app.empresa_id', true), '')::uuid));
grant select, insert, update on inventario_sucursal to gastrobi_app;

-- Kardex: solo lectura e inserción (append-only)
grant select, insert on movimientos_inventario to gastrobi_app;

-- Partición mensual del kardex (la PK de la tabla particionada debe incluir la fecha)
create table movimientos_inventario_2026_10 partition of movimientos_inventario
  for values from ('2026-10-01') to ('2026-11-01');
```

```bash
dotnet ef migrations add InitialCreate    # baseline: marcar como aplicada, no ejecutar
dotnet ef migrations add <Cambio>         # cambios posteriores
dotnet ef database update                 # con la conexión directa (ver 6.2)
```

### 6.7 Motor 3 (ML en Python) y OCR

**Motor 3: servicio Python separado de la API.**

- Predice **qué y cuánto comprar por insumo, sucursal y semana**. No predice ventas en dinero ni vencimientos.
- **Lee** `consumo_semanal_insumo`, `mermas`, `inventario_sucursal` e `insumo_proveedor`.
- **Escribe** en `pronosticos_compra`: `cantidad_proyectada`, `cantidad_sugerida`, `stock_seguridad`, `modelo_version`, `generado_en`.
- Corre **una vez por semana con una tarea programada** (cron del hosting o GitHub Actions), **no dentro de la API**.
- `pandas` + **LightGBM** o **scikit-learn**, siempre comparado contra un **baseline de promedio de 4 semanas**. Si el modelo no le gana al baseline, se publica el baseline.
- Métrica: **WAPE**. La meta ">85% de exactitud" se lee como **WAPE < 15%**.
- Se entrena con **datos sintéticos** mientras no haya ventas reales.
- Se conecta con `psycopg` usando un rol propio con permisos de lectura sobre esas tablas y de escritura solo en `pronosticos_compra`.

**Facturas OCR:**

- `POST /api/invoices` recibe el archivo, lo sube a **Supabase Storage** y guarda su `storage_path` en `facturas_compra`.
- El **proveedor de OCR es una decisión pendiente** del equipo.
- Las líneas leídas quedan en `detalle_factura_compra` **hasta la validación humana** en el front (`PUT /api/invoices/{id}/confirm`). Recién ahí se generan los **movimientos de entrada en el kardex** y sube el stock.

### 6.8 Conectar Angular con .NET

1. Levantar la API: `dotnet run --launch-profile https`. Anotar el puerto HTTPS de `Properties/launchSettings.json`.
2. En `gastrobi-web/proxy.conf.json`, dejar `target` en ese puerto (hoy dice `https://localhost:7180`).
3. En `src/environments/environment.development.ts` poner `useMocks: false`.
4. `npx ng serve`. Angular llama a `/api/...`, el proxy lo redirige a .NET y no hace falta CORS en desarrollo.
5. Revisar en DevTools → Network que cada respuesta tenga exactamente la forma de `core/models/*.ts`.
6. Cuando todo funcione, borrar `core/mocks/` y sacar `mockApiInterceptor` de `app.config.ts`.

Despliegue a producción (elegir una opción):

- **Mismo sitio:** `ng build` y copiar `dist/gastrobi-web/browser/*` a `GastroBI.Api/wwwroot`. En `Program.cs`, agregar `app.UseStaticFiles()` y `app.MapFallbackToFile("index.html")`. Mismo dominio y sin CORS.
- **Separados:** front en **Vercel** o **Netlify**; API .NET y servicio Python en **Railway** o **Render** (Docker). Cambiar `apiUrl` en `environment.ts` por la URL completa y configurar `Cors:Origins`.

En cualquiera de las dos opciones, la API y el servicio Python deben estar **en la misma región que Supabase**.

---

## 7. Registro de avances

| Fecha      | Qué                                                                                                                                                                                                                                                            | Estado |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-09-27 | Migración de Login + Dashboard a Angular 20 + Material 3, con mocks                                                                                                                                                                                            | ✅     |
| 2026-09-27 | Instalado Node.js 24.19.0 LTS con winget; `npm install` (220 paquetes, 0 vulnerabilidades)                                                                                                                                                                     | ✅     |
| 2026-09-27 | Subida a **Angular 22.2** + TypeScript 6.0 (Angular 20 pierde soporte ~nov 2026)                                                                                                                                                                               | ✅     |
| 2026-09-27 | Primer `ng build`: se corrigió el tipado nullable de `selected()` y `workspace()`; build limpio y `ng serve` OK                                                                                                                                                | ✅     |
| 2026-09-27 | Respaldo zip del mockup React/Figma (`Desktop/front-react-figma-respaldo.zip`, 23 archivos verificados)                                                                                                                                                        | ✅     |
| 2026-09-27 | Normalización: config estándar de Angular 22, alias de imports `@core/@shared/@features/@layout/@env`, templates y estilos separados, estilos globales en `styles/`, se quitaron `@angular/animations` y `provideZonelessChangeDetection` (ya son por defecto) | ✅     |
| 2026-09-27 | Calidad: Prettier, ESLint (angular-eslint), Vitest con 21 tests, script `npm run check`                                                                                                                                                                        | ✅     |
| 2026-09-27 | Prueba en navegador real (Edge, Playwright) con 16 chequeos: login, validaciones, 401, workspace, KPIs, cambio de sucursal, generar OC, navegación, recarga, móvil, logout. Se corrigieron 5 detalles visuales                                                 | ✅     |
| 2026-09-27 | README.md para el traspaso: convenciones y recetas para conectar endpoints y crear pantallas                                                                                                                                                                   | ✅     |
|            | Borrado el React/Figma de la raíz (lo hizo el equipo; respaldo en el zip)                                                                                                                                                                                      | ✅     |
| 2026-09-28 | Bitácora alineada con el stack de la tesis: PostgreSQL/Supabase (no SQL Server), ML en servicio Python (no ML.NET), IDs UUID, modelo de 19 tablas, RLS y endpoint de sugerencias de compra                                                                     | ✅     |
|            | Crear la solución .NET y los endpoints de la sección 5                                                                                                                                                                                                         | ⏳     |
|            | Conectar el front a la API (sección 6.8)                                                                                                                                                                                                                       | ⏳     |
|            | Módulos Inventario / Recetas / Ventas / Facturas / Configuración / Sugerencias de compra                                                                                                                                                                       | ⏳     |
