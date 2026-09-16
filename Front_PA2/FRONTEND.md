# Front_PA2 — componentes de Piedra Azul

Componentes Angular 22 (standalone + signals) maquetados con Bootstrap 5.3,
alineados al diseño del PDF y conectados a los endpoints de `Back_PA2`.

## Instalación

Copia el contenido de esta carpeta sobre tu `Front_PA2/` y luego:

```bash
npm install bootstrap bootstrap-icons
npm start
```

`angular.json` ya queda con el bundle JS de Bootstrap en `scripts` (lo necesita el
dropdown del navbar) y con el reemplazo de `environment.ts` en producción.
El CSS de Bootstrap se carga con `@import` desde `src/styles.css`.

Ajusta la URL del backend en `src/environments/environment.ts`
(por defecto `http://localhost:3000/api`).

## Estructura

```
src/
├── styles.css                    tokens de marca + overrides de Bootstrap
├── environments/                 apiUrl por entorno
└── app/
    ├── app.ts / app.html         shell: navbar + router-outlet + footer
    ├── app.routes.ts             rutas con lazy loading y guards por rol
    ├── app.config.ts             HttpClient + interceptor + locale es-CO
    ├── core/
    │   ├── models/               tipos espejo de los modelos Sequelize
    │   ├── services/             auth, people, appointment, settings
    │   ├── interceptors/         adjunta el JWT y maneja el 401
    │   ├── guards/               authGuard y roleGuard
    │   └── utils.ts              fechas, horas y manejo del 204
    ├── shared/
    │   ├── navbar/               navbar-expand-lg, collapse propio
    │   ├── footer/               4 columnas responsive
    │   └── hero/                 variant="home" | "compact"
    └── pages/
        ├── home/                 portada del PDF
        ├── login/  registro/
        ├── agendar/              requisito 2
        ├── agenda-profesional/   requisito 1
        ├── admin-config/         requisito 3
        └── mis-citas/
```

## Cobertura de requisitos

| # | Pantalla | Ruta | Endpoints |
|---|---|---|---|
| 1 | Citas por profesional y fecha, con conteo y tabla | `/agenda` | `GET /people/professionals`, `GET /appointments/professional/:codProf/date/:date`, `PUT /appointments/:id/status`, `POST /appointments/export` |
| 2 | Agendamiento en 3 pasos | `/agendar` | `GET /people/patients/:idPatient`, `POST /people/patients`, `GET /appointments/generated`, `POST /appointments` |
| 3 | Parámetros de agendamiento | `/configuracion` | `GET /people/professionals`, `PUT /people/professionals/:codProf` |

## Pendientes del backend

1. **Ventana de agendamiento en semanas** (requisito 3). No existe endpoint.
   `SettingsService` la guarda en `localStorage` con la misma interfaz; cuando
   exista `GET/PUT /api/settings` solo hay que cambiar ese servicio.
2. **Nombre del paciente en el listado de citas.** `GET /appointments/professional/:codProf/date/:date`
   devuelve solo `codPatient`, así que la tabla hace una petición extra por paciente.
   Un `include` del paciente en esa consulta ahorraría N llamadas.
3. **Rutas públicas para la portada.** `GET /people/professionals` está detrás de
   `authMiddleware`, por lo que un visitante sin sesión no ve el equipo real; la
   portada usa contenido de respaldo. Conviene exponer una ruta pública de solo lectura.
4. **Días de atención.** El modelo guarda `unavailableDays` (los días que NO atiende).
   La interfaz pregunta lo contrario e invierte el valor antes de enviarlo.

## Responsive

Todo usa la grilla y los breakpoints de Bootstrap:
`col-12 col-md-6 col-lg-4` en tarjetas, `navbar-expand-lg` en el menú,
`table-responsive` en el listado del agendador, y columnas secundarias ocultas
en móvil con `d-none d-md-table-cell`.
