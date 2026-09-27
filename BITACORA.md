# Bitácora — Migración GastroBI a Angular + API .NET

Fecha de inicio: 2026-09-27

---

## 1. Punto de partida

El proyecto original (`../src/App.tsx`) era un **mockup de Figma Make** en React + Tailwind:

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
| Hex inline y Tailwind          | **Tema Material 3** en `src/styles.scss`: la paleta de Figma se mapea a los tokens `--mat-sys-*`                      |
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
├── eslint.config.js · .prettierrc · .editorconfig · .vscode/
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

| Qué                               | Versión                                                                               | Cómo                                                                       | Para qué                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Node.js LTS** (incluye **npm**) | Node 24.19.0 · npm 11.17.0                                                            | `winget install OpenJS.NodeJS.LTS`                                         | Ejecutar Angular CLI y el servidor de desarrollo          |
| Dependencias del proyecto         | Angular 22.2.0, Angular Material/CDK 22.2.0, TypeScript 6.0, Chart.js 4.5.1, RxJS 7.8 | `npm install` dentro de `gastrobi-web/` (220 paquetes, 0 vulnerabilidades) | Quedan en `gastrobi-web/node_modules/` (no se sube a git) |

| Herramientas de calidad (devDependencies) | Vitest 5 + jsdom (tests), ESLint 10 + angular-eslint 22.5 (lint), Prettier 3.8 (formato) | `npm install` / `ng add angular-eslint` | Se instalan solas con `npm install`; nadie tiene que instalarlas aparte |

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
- Base de datos: **SQL Server Express/LocalDB** o **PostgreSQL** (a definir, ver sección 6).
- Opcional: Visual Studio 2022+ o la extensión **C# Dev Kit** de VS Code.

> No se instaló .NET en este equipo porque el backend aún no está creado. Se instala cuando se empiece la sección 6.

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
- [ ] Tests de componentes (login, dashboard) y e2e (Playwright) cuando las pantallas se estabilicen.
- [ ] Diseñar y construir los módulos: **Inventario, Recetas, Ventas, Facturas OCR, Configuración** (hoy muestran `coming-soon`).
- [ ] Flujo completo de recuperación de contraseña (pantalla para el token de reseteo).
- [ ] Refresh token (hoy, cuando el token expira se vuelve al login).
- [ ] Definir la moneda (hoy el formato es USD, `$34.8K`) y si se usa CLP. Ver `shared/compact-currency.pipe.ts`.
- [ ] Al conectar el backend: poner `useMocks: false`, borrar `core/mocks/` y sacar `mockApiInterceptor` de `app.config.ts`.
- [ ] Borrar el proyecto React/Figma Make de la raíz (`front/`): `.figma/`, `src/`, `index.html`, `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `vite.config.ts`, `.mise.toml`, `.gitattributes`, `.gitignore`, `AGENTS.md`, `CLAUDE.md`. Ya hay respaldo en `Desktop/front-react-figma-respaldo.zip`. Después, opcionalmente, subir el contenido de `gastrobi-web/` a la raíz.

---

## 5. Contrato de la API (lo que .NET debe exponer)

Convenciones:

- Prefijo **`/api`**. JSON en **camelCase** (es el default de ASP.NET Core).
- Fechas: `DateOnly` → `"2026-09-03"`; `DateTimeOffset` → ISO 8601.
- Enums como **string en camelCase** (`"critical"`, `"warning"`, `"low"`).
- Todo requiere `Authorization: Bearer <jwt>` salvo lo marcado como público.
- El **workspace (tenant) sale del JWT**, nunca del query. La sucursal va como `?branchId=` y el backend **debe validar que pertenezca al workspace** del token (si no, 403).
- Errores con **ProblemDetails** (`AddProblemDetails()`).

Los tipos TypeScript en `src/app/core/models/` son la referencia exacta de cada respuesta.

### Endpoints usados hoy por el front

| Método | Ruta                                                                   | Auth     | Request                      | Respuesta                                    |
| ------ | ---------------------------------------------------------------------- | -------- | ---------------------------- | -------------------------------------------- |
| GET    | `/api/auth/workspaces`                                                 | público* | —                            | `Workspace[]`                                |
| POST   | `/api/auth/login`                                                      | público  | `LoginRequest`               | `LoginResponse` · 401 si falla               |
| POST   | `/api/auth/forgot-password`                                            | público  | `{ email }`                  | 204 siempre (no revelar si el correo existe) |
| GET    | `/api/branches`                                                        | ✔        | —                            | `Branch[]` del workspace del token           |
| GET    | `/api/dashboard/kpis?branchId=`                                        | ✔        | —                            | `DashboardKpis`                              |
| GET    | `/api/dashboard/sales-forecast?branchId=&historyDays=9&forecastDays=7` | ✔        | —                            | `SalesForecast`                              |
| GET    | `/api/inventory/stock-alerts?branchId=`                                | ✔        | —                            | `StockAlert[]`                               |
| POST   | `/api/purchase-orders`                                                 | ✔        | `CreatePurchaseOrderRequest` | `PurchaseOrder` (201)                        |
| GET    | `/api/invoices/pending-count?branchId=`                                | ✔        | —                            | `{ count: number }`                          |

\* **Decisión abierta:** si `/auth/workspaces` es público, cualquiera puede ver la lista de clientes. Alternativas:
(a) login sin workspace, que la respuesta traiga los workspaces del usuario y que un segundo paso emita el token del workspace elegido;
(b) identificar el workspace por subdominio (`ckg.gastrobi.cl`). Se recomienda **(a)**.

### Ejemplos JSON

```jsonc
// POST /api/auth/login
{ "email": "marco@centralkitchen.com", "password": "****", "workspaceId": "central-kitchen-group" }
// 200
{
  "accessToken": "eyJhbGciOi...",
  "expiresAt": "2026-09-28T15:00:00Z",
  "user": { "id": "u-001", "fullName": "Marco Patel", "email": "marco@centralkitchen.com", "role": "Chef Principal" },
  "workspace": { "id": "central-kitchen-group", "name": "Central Kitchen Group" }
}

// GET /api/dashboard/kpis?branchId=cocina-central
{
  "criticalStockItems": 7,
  "wasteCost": 284,
  "wasteCostChangePct": 12,
  "projectedDemand": 34800,
  "projectedDemandChangePct": 8.4,
  "pendingInvoices": 2
}

// GET /api/dashboard/sales-forecast?branchId=cocina-central&historyDays=9&forecastDays=7
{
  "today": "2026-09-03",
  "points": [
    { "date": "2026-08-26", "actual": 3820, "predicted": null },
    { "date": "2026-09-03", "actual": 4320, "predicted": null },
    { "date": "2026-09-04", "actual": null, "predicted": 4580 }
  ]
}

// GET /api/inventory/stock-alerts?branchId=cocina-central
[
  { "ingredientId": 101, "name": "Harina de fuerza (00)", "unit": "kg", "stock": 4.2,
    "parLevel": 25, "leadTimeDays": 2, "urgency": "critical" }
]

// POST /api/purchase-orders
{ "branchId": "cocina-central", "ingredientId": 101, "quantity": 20.8 }
// 201
{ "id": 1042, "code": "OC-1042", "status": "draft", "createdAt": "2026-09-03T14:22:10Z" }
```

### Reglas de negocio que debe resolver el backend

- **KPIs**
  - `criticalStockItems`: cantidad de ingredientes con urgencia `critical`.
  - `wasteCost`: suma del costo de las mermas registradas en la semana en curso.
  - `*ChangePct`: variación contra el período anterior equivalente.
  - `projectedDemand`: suma del pronóstico de los próximos 7 días.
- **Urgencia de stock** (a validar con el negocio). Propuesta basada en días de cobertura
  (`stock / consumo diario promedio`):
  - `critical`: la cobertura es menor o igual al `leadTimeDays` del proveedor (se agota antes de que llegue el pedido).
  - `warning`: la cobertura es menor o igual a `leadTimeDays + 2`.
  - `low`: `stock < parLevel`, pero con margen.
  - Solo se listan los ítems con `stock < parLevel`, ordenados por urgencia.
- **Cantidad de la OC**: el front sugiere `parLevel - stock`. El backend puede redondear a la unidad de compra del proveedor.

### Endpoints previstos para los módulos siguientes (borrador)

| Módulo            | Endpoints                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inventario        | `GET /api/inventory?branchId=&search=&page=` · `PUT /api/inventory/{ingredientId}` (ajuste de stock) · `POST /api/waste` (registrar merma)                                     |
| Recetas           | `GET/POST /api/recipes` · `GET/PUT/DELETE /api/recipes/{id}` · `GET /api/recipes/{id}/cost` (costeo por ingredientes)                                                          |
| Ventas            | `GET /api/sales?branchId=&from=&to=` · `POST /api/sales/import` (CSV / POS)                                                                                                    |
| Facturas OCR      | `POST /api/invoices` (multipart, archivo) · `GET /api/invoices?status=pending` · `GET /api/invoices/{id}` · `PUT /api/invoices/{id}/confirm` (confirma líneas y suma al stock) |
| Órdenes de compra | `GET /api/purchase-orders?branchId=&status=` · `PUT /api/purchase-orders/{id}/send`                                                                                            |
| Configuración     | `GET/PUT /api/settings` · `GET/POST /api/users` · `GET/POST /api/branches` · `GET/POST /api/suppliers`                                                                         |

---

## 6. Backend .NET — paso a paso

### 6.1 Crear la solución

Requiere **.NET 10 SDK (LTS)**.

```bash
mkdir gastrobi-api && cd gastrobi-api
dotnet new sln -n GastroBI
dotnet new webapi -n GastroBI.Api --use-controllers
dotnet sln add GastroBI.Api

cd GastroBI.Api
dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer
dotnet add package Microsoft.EntityFrameworkCore.SqlServer      # o Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package Microsoft.EntityFrameworkCore.Design
dotnet add package Microsoft.ML.TimeSeries                      # pronóstico de demanda (sección 6.7)
```

Estructura sugerida (por capas simples; se puede separar en proyectos después):

```
GastroBI.Api/
├── Controllers/     AuthController, BranchesController, DashboardController,
│                    InventoryController, PurchaseOrdersController, InvoicesController
├── Contracts/       DTOs (records) = modelos TS del front
├── Domain/          entidades EF (Workspace, Branch, User, Ingredient, StockLevel, ...)
├── Data/            GastroDbContext, Migrations/
├── Services/        DashboardService, InventoryService, ForecastService, TokenService
└── Program.cs
```

### 6.2 Program.cs

```csharp
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(
        new JsonStringEnumConverter(JsonNamingPolicy.CamelCase)));   // "critical", "draft", ...
builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<GastroDbContext>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

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

`appsettings.Development.json` (la clave real va en **User Secrets**: `dotnet user-secrets set "Jwt:Key" "..."`):

```json
{
  "ConnectionStrings": {
    "Default": "Server=localhost;Database=GastroBI;Trusted_Connection=True;TrustServerCertificate=True"
  },
  "Jwt": {
    "Issuer": "gastrobi-api",
    "Audience": "gastrobi-web",
    "Key": "<mínimo 32 caracteres, en user-secrets>"
  },
  "Cors": { "Origins": ["http://localhost:4200"] }
}
```

### 6.3 DTOs (espejo de `src/app/core/models`)

```csharp
namespace GastroBI.Api.Contracts;

public record WorkspaceDto(string Id, string Name);
public record BranchDto(string Id, string Name);

public record LoginRequest(string Email, string Password, string? WorkspaceId);
public record UserProfileDto(string Id, string FullName, string Email, string Role);
public record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt, UserProfileDto User, WorkspaceDto Workspace);

public record DashboardKpisDto(int CriticalStockItems, decimal WasteCost, decimal WasteCostChangePct,
                               decimal ProjectedDemand, decimal ProjectedDemandChangePct, int PendingInvoices);
public record SalesPointDto(DateOnly Date, decimal? Actual, decimal? Predicted);
public record SalesForecastDto(DateOnly Today, IReadOnlyList<SalesPointDto> Points);

public enum StockUrgency { Critical, Warning, Low }
public record StockAlertDto(int IngredientId, string Name, string Unit, decimal Stock,
                            decimal ParLevel, int LeadTimeDays, StockUrgency Urgency);

public record CreatePurchaseOrderRequest(string BranchId, int IngredientId, decimal Quantity);
public enum PurchaseOrderStatus { Draft, Sent, Received, Cancelled }
public record PurchaseOrderDto(int Id, string Code, PurchaseOrderStatus Status, DateTimeOffset CreatedAt);
```

### 6.4 Controller de ejemplo

```csharp
[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController(IDashboardService dashboard, IBranchAccess branchAccess) : ControllerBase
{
    [HttpGet("kpis")]
    public async Task<ActionResult<DashboardKpisDto>> GetKpis([FromQuery] string branchId, CancellationToken ct)
    {
        if (!await branchAccess.CanAccessAsync(User, branchId, ct)) return Forbid();
        return Ok(await dashboard.GetKpisAsync(branchId, ct));
    }

    [HttpGet("sales-forecast")]
    public async Task<ActionResult<SalesForecastDto>> GetSalesForecast(
        [FromQuery] string branchId, [FromQuery] int historyDays = 9, [FromQuery] int forecastDays = 7,
        CancellationToken ct = default)
    {
        if (!await branchAccess.CanAccessAsync(User, branchId, ct)) return Forbid();
        return Ok(await dashboard.GetSalesForecastAsync(branchId, historyDays, forecastDays, ct));
    }
}
```

### 6.5 Login y JWT

- Contraseñas con `PasswordHasher<User>` (del paquete `Microsoft.Extensions.Identity.Core`) o ASP.NET Core Identity completo.
- El token lleva los claims: `sub` (userId), `email`, `role` y **`workspace_id`**. Todas las consultas filtran por `workspace_id`.
- Duración sugerida de 8 a 12 horas (un turno). Luego se agrega refresh token (queda pendiente en el front).

```csharp
public string CreateToken(User user, Workspace ws)
{
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id),
        new Claim(JwtRegisteredClaimNames.Email, user.Email),
        new Claim(ClaimTypes.Role, user.Role),
        new Claim("workspace_id", ws.Id),
    };
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
    var token = new JwtSecurityToken(_config["Jwt:Issuer"], _config["Jwt:Audience"], claims,
        expires: DateTime.UtcNow.AddHours(12),
        signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
    return new JwtSecurityTokenHandler().WriteToken(token);
}
```

### 6.6 Modelo de datos (EF Core)

Tablas mínimas para lo que usa el dashboard:

- `Workspaces` · `Branches (WorkspaceId)` · `Users` · `UserWorkspaces (UserId, WorkspaceId, Role)`
- `Suppliers (LeadTimeDays)` · `Ingredients (Unit, SupplierId, UnitCost)`
- `StockLevels (BranchId, IngredientId, Quantity, ParLevel)`
- `SalesDaily (BranchId, Date, Amount)` · `SalesForecasts (BranchId, Date, Predicted, ModelVersion)`
- `WasteRecords (BranchId, IngredientId, Quantity, Cost, Date)`
- `PurchaseOrders (BranchId, Code, Status, CreatedAt)` · `PurchaseOrderLines`
- `Invoices (BranchId, Status, FileUrl, SupplierId)` · `InvoiceLines`
- Más adelante: `Recipes` · `RecipeIngredients`

Multi-tenant: agregar un **global query filter** por `WorkspaceId` en el `DbContext` (leyendo el claim del usuario actual), así ninguna consulta filtra datos de otro cliente.

```bash
dotnet ef migrations add Inicial
dotnet ef database update
```

### 6.7 Pronóstico ML y OCR

- **Pronóstico de demanda:** ML.NET `ForecastBySsa` (`Microsoft.ML.TimeSeries`) entrenado con `SalesDaily` por sucursal.
  Correrlo en un `BackgroundService` (o Hangfire) una vez por noche y guardar el resultado en `SalesForecasts`.
  El endpoint solo lee la tabla, así responde rápido.
- **Facturas OCR:** `POST /api/invoices` recibe el archivo (`IFormFile`), lo guarda (Blob Storage o disco) y lo encola.
  El procesamiento usa **Azure AI Document Intelligence** (modelo `prebuilt-invoice`) o Tesseract si debe ser local.
  Las líneas quedan en estado `pending` hasta que un usuario las confirme en el front (`PUT /confirm`), que es cuando suman al stock.

### 6.8 Conectar Angular con .NET

1. Levantar la API: `dotnet run --launch-profile https`. Anotar el puerto HTTPS de `Properties/launchSettings.json`.
2. En `gastrobi-web/proxy.conf.json`, dejar `target` en ese puerto (hoy dice `https://localhost:7180`).
3. En `src/environments/environment.development.ts` poner `useMocks: false`.
4. `npx ng serve`. Angular llama a `/api/...`, el proxy lo redirige a .NET y no hace falta CORS en desarrollo.
5. Revisar en DevTools → Network que cada respuesta tenga exactamente la forma de `core/models/*.ts`.
6. Cuando todo funcione, borrar `core/mocks/` y sacar `mockApiInterceptor` de `app.config.ts`.

Despliegue a producción (elegir una opción):

- **Mismo sitio (recomendado):** `ng build` y copiar `dist/gastrobi-web/browser/*` a `GastroBI.Api/wwwroot`. En `Program.cs`, agregar `app.UseStaticFiles()` y `app.MapFallbackToFile("index.html")`. Mismo dominio y sin CORS.
- **Separados:** front en Azure Static Web Apps, Netlify o similar; API en App Service. Cambiar `apiUrl` en `environment.ts` por la URL completa y configurar `Cors:Origins`.

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
|            | Borrar el React/Figma de la raíz (bloqueado por permisos, lo hace el equipo)                                                                                                                                                                                   | ⏳     |
|            | Crear la solución .NET y los endpoints de la sección 5                                                                                                                                                                                                         | ⏳     |
|            | Conectar el front a la API (sección 6.8)                                                                                                                                                                                                                       | ⏳     |
|            | Módulos Inventario / Recetas / Ventas / Facturas / Configuración                                                                                                                                                                                               | ⏳     |
