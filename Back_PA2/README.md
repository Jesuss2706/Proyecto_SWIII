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

## Estado de la migración

- `auth`: completo. Login por cédula, registro, roles (`Professional`, `Admin`,
  `Patient`, `Scheduler`), activar/desactivar. Publica `user.registered` y `user.updated`.
- `people`: completo. Pacientes y profesionales con las mismas reglas de negocio
  del `people-service` original (no duplicar identificación/usuario, validar que
  la hora de llegada sea antes que la de salida, desactivación en vez de borrado
  para profesionales). `people.listeners.js` mantiene `UserRef` sincronizado
  escuchando los eventos de `auth`. Publica `patient.registered`, `patient.updated`,
  `professional.registered` y `professional.updated`.
- `appointment`: pendiente. Falta migrar `AppointmentController` y las estrategias
  de exportación (json/csv/html) desde `appointment-service` original, y sus
  listeners deberán suscribirse a los eventos que ahora publica `people`.

## Endpoints disponibles

**Auth** (`/api/auth`, público)
- `POST /login` — `{ cedUser, password }`
- `POST /register` — `{ cedUser, passUser, nameUser, secondNameUser?, lastNameUser, secondLastNameUser?, roleUser, securityQuestion, securityAnswer }`
- `GET /users?role=Patient`
- `GET /users/:cedula`
- `GET /users/cod/:codigo`
- `PUT /users/:id`
- `DELETE /users/:id` (desactiva)

**People** (`/api/people`, requiere JWT)
- `GET /patients`
- `GET /patients/:idPatient`
- `GET /patients/codPatient/:codPatient`
- `POST /patients`
- `PUT /patients/:id`
- `DELETE /patients/:id`
- `GET /professionals`
- `GET /professionals/user/:codUser`
- `GET /professionals/speciality/:speciality`
- `GET /professionals/:codigo`
- `POST /professionals`
- `PUT /professionals/:id`
- `DELETE /professionals/:id` (desactiva)
