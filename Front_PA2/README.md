# Front_PA2 — Piedra Azul

Frontend en Angular 22 (componentes standalone + signals) maquetado con
Bootstrap 5.3 y conectado al backend `Back_PA2`.

## Puesta en marcha

```bash
npm install
npm start
```

Queda en `http://localhost:4200`. La URL del backend se configura en
`src/environments/environment.ts` (por defecto `http://localhost:3000/api`).
Levanta primero `Back_PA2` o las pantallas que consultan datos quedarán vacías.

Requiere Node 22.22.3 o superior (lo pide el CLI de Angular 22).

Documentación de los componentes, los endpoints que consume cada pantalla y los
pendientes del backend: ver `FRONTEND.md`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | servidor de desarrollo con recarga |
| `npm run build` | compilación de producción en `dist/` |
| `npm test` | pruebas unitarias con Vitest |

## Rutas

| Ruta | Pantalla | Acceso |
|---|---|---|
| `/` | Portada | pública |
| `/ingresar` · `/registro` | Autenticación | pública |
| `/agendar` | Agendamiento en 3 pasos | pública |
| `/mis-citas` | Citas del paciente | con sesión |
| `/agenda` | Citas por profesional y fecha | Scheduler · Admin · Professional |
| `/configuracion` | Parámetros de agendamiento | Admin |
