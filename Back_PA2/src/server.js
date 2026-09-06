const app = require('./app');
const sequelize = require('./config/db');
const env = require('./config/env');

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida');

    // sync solo para desarrollo; en producción usar migraciones
    await sequelize.sync();

    app.listen(env.port, () => {
      console.log(`Back_PA2 corriendo en http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error('No se pudo iniciar la aplicación:', err);
    process.exit(1);
  }
}

start();
