// Pirámide de pruebas del backend (una "project" de Jest por nivel):
//
//   unit         src/**/__tests__/*.test.js      rápidas, con mocks, sin BD ni red
//   integration  tests/integration/*.test.js     servicios + Postgres real (Testcontainers, necesita Docker)
//   component    tests/component/*.test.js       API completa por HTTP (supertest), dependencias simuladas
//   contract     tests/contract/*.test.js        forma de las respuestas que consume el front
//
// "npm test" corre todo menos integración (que necesita Docker); "npm run test:all" corre todo.

const common = { testEnvironment: 'node', clearMocks: true };

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.js'],
    },
    {
      ...common,
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
    },
    {
      ...common,
      displayName: 'component',
      testMatch: ['<rootDir>/tests/component/**/*.test.js'],
    },
    {
      ...common,
      displayName: 'contract',
      testMatch: ['<rootDir>/tests/contract/**/*.test.js'],
    },
  ],
  collectCoverageFrom: [
    'src/modules/**/*.js',
    'src/shared/**/*.js',
    '!src/**/__tests__/**',
    '!src/modules/**/*.routes.js',
    '!src/modules/**/index.js',
  ],
};