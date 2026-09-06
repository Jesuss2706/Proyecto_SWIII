const eventBus = require('../../shared/eventBus');
const Patient = require('./patient.model');

// Cuando auth crea un usuario con rol PATIENT, people crea automáticamente
// el perfil correspondiente. Así reemplazamos lo que antes hacía
// el listener de RabbitMQ en people-service (UserEventListener).
eventBus.on('user.created', async ({ userId, email, role }) => {
  if (role !== 'PATIENT') return;

  try {
    await Patient.create({ userId, email, fullName: '' });
  } catch (err) {
    console.error('Error creando perfil de paciente para usuario', userId, err);
  }
});
