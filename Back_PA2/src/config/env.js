require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  keycloak: {
    url: process.env.KEYCLOAK_URL || 'http://localhost:8080',
    realm: process.env.KEYCLOAK_REALM || 'piedraazul',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'piedraazul-front',
    // Cliente confidencial del backend (service account) para crear usuarios
    adminClientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'piedraazul-backend',
    adminClientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET,
  },
};