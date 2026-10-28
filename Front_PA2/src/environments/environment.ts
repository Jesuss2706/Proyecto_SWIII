export const environment = {
  production: false,
  /** Base del backend Express (Back_PA2). Ajusta el puerto si cambia en .env */
  apiUrl: 'http://localhost:3000/api',
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'piedraazul',
    clientId: 'piedraazul-front',
  },
};
