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
- `appointment`: completo. Crear/reagendar/cancelar/completar citas con las
  mismas reglas del `appointment-service` original (un paciente no puede tener
  dos citas `Scheduled` a la vez, no se puede reagendar una cita cancelada o
  completada, etc.), generación de horarios disponibles respetando el horario
  y los días no laborables de cada profesional, búsqueda del primer turno
  disponible por especialidad (saltando fines de semana y festivos), y
  exportación a JSON/CSV/HTML con el patrón Strategy. En vez de mantener
  copias `PatientRef`/`ProfessionalRef` sincronizadas por eventos como en el
  original, consulta directamente la fachada de `people` — una ventaja real
  del monolito modular sobre los microservicios.

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

**Appointments** (`/api/appointments`, requiere JWT)
- `GET /` — todas las citas
- `GET /generated?codProf=&date=&speciality=` — horarios disponibles
- `GET /generated/speciality/:speciality` — horarios disponibles hoy para una especialidad
- `GET /first-available/:speciality` — primer turno libre en los próximos 60 días
- `GET /:id`
- `GET /professional/:codProf`
- `GET /professional/:codProf/date/:date`
- `GET /professional/speciality/:specialityProf`
- `GET /patient/:codPatient`
- `GET /status/:status`
- `GET /date/:date`
- `POST /` — crear cita
- `POST /export?format=json|csv|html` — body: `[1, 2, 3]` (ids de citas)
- `PUT /:id` — reagendar / editar descripción / cambiar estado
- `PUT /:id/status` — body `{ "statusApp": "ATENDIDA" | "CANCELADA" | "AGENDADA" }`
- `DELETE /:id` — cancela (no borra)
