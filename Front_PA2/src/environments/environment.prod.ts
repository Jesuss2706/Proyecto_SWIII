export const environment = {
  production: true,
  apiUrl: '/api',
  keycloak: {
    url: 'http://localhost:8080', // URL pública de Keycloak en producción
    realm: 'piedraazul',
    clientId: 'piedraazul-front',
  },
};
