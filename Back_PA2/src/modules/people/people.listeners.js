const eventBus = require('../../shared/eventBus');
const UserRef = require('./userRef.model');

function buildFullName(first, second) {
  if (!second || !second.trim()) return first || '';
  return `${first} ${second}`.trim();
}

// Equivalente a UserEventListener.handleUserRegistered del people-service original
eventBus.on('user.registered', async (dto) => {
  try {
    const exists = await UserRef.findByPk(dto.codUser);
    if (exists) return;

    await UserRef.create({
      codUser: dto.codUser,
      cedUser: dto.cedUser,
      nameUser: buildFullName(dto.nameUser, dto.secondNameUser),
      lastNameUser: buildFullName(dto.lastNameUser, dto.secondLastNameUser),
      roleUser: dto.roleUser,
    });
  } catch (err) {
    console.error('Error registrando user_ref:', err.message);
  }
});

// Equivalente a UserEventListener.handleUserUpdated del people-service original
eventBus.on('user.updated', async (dto) => {
  try {
    const userRef = await UserRef.findByPk(dto.codUser);
    if (!userRef) return;

    userRef.nameUser = buildFullName(dto.nameUser, dto.secondNameUser);
    userRef.lastNameUser = buildFullName(dto.lastNameUser, dto.secondLastNameUser);
    await userRef.save();
  } catch (err) {
    console.error('Error actualizando user_ref:', err.message);
  }
});
