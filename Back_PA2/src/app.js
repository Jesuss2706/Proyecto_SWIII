const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const auth = require('./modules/auth');
const people = require('./modules/people');
const appointment = require('./modules/appointment');

const { authMiddleware } = require('./shared/middlewares/auth.middleware');
const errorMiddleware = require('./shared/middlewares/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rutas públicas
app.use('/api/auth', auth.routes);

// Rutas protegidas: todo lo que esté detrás de authMiddleware
// requiere un JWT válido, reemplazando lo que antes hacía el api-gateway.
app.use('/api/people', authMiddleware, people.routes);
app.use('/api/appointments', authMiddleware, appointment.routes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorMiddleware);

module.exports = app;
