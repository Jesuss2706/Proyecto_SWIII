# Back_PA2

Monolito modular en Express.js — un solo proceso, tres módulos de dominio
(`auth`, `people`, `appointment`) con fronteras claras entre sí.

## Estructura

```
src/
├── app.js                 # instancia de Express + montaje de rutas
├── server.js               # arranque: conecta BD y levanta el servidor
├── config/                 # env y conexión a Postgres (Sequelize)
├── shared/                 # kernel compartido: eventBus, errores, middlewares
└── modules/
    ├── auth/                # login, registro, JWT
    ├── people/               # pacientes y profesionales
    └── appointment/          # citas y exportación
```

Cada módulo expone solo lo necesario a través de su `index.js`. Ningún
módulo debe hacer `require()` directo de un archivo interno de otro módulo
(modelo, servicio) — la comunicación entre módulos se hace mediante el
`eventBus` en `shared/eventBus.js`.

## Cómo levantarlo

1. Instala dependencias:
   ```
   npm install
   ```

2. Copia `.env.example` a `.env` y ajusta los valores de conexión a tu Postgres local.

3. Crea la base de datos y los esquemas:
   ```
   createdb back_pa2
   psql -d back_pa2 -f init-schemas.sql
   ```

4. Levanta el servidor en modo desarrollo:
   ```
   npm run dev
   ```

5. Verifica que responde:
   ```
   curl http://localhost:3000/health
   ```

## Módulos pendientes de migrar

- `people`: falta migrar `PatientController`/`ProfessionalController` desde
  `people-service` original (solo está el modelo `Patient` y el listener de ejemplo).
- `appointment`: falta migrar `AppointmentController` y las estrategias de
  exportación (json/csv/html) desde `appointment-service` original.
