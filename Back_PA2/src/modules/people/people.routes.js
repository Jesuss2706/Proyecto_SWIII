const { Router } = require('express');
const patientController = require('./patient.controller');
const professionalController = require('./professional.controller');

const router = Router();

// --- Pacientes ---
// Las rutas estáticas van antes que ':idPatient' para que Express no las confunda con un parámetro.
router.get('/patients', patientController.findAll);
router.get('/patients/codPatient/:codPatient', patientController.findByCod);
router.get('/patients/:idPatient', patientController.findById);
router.post('/patients', patientController.register);
router.put('/patients/:id', patientController.update);
router.delete('/patients/:id', patientController.remove);

// --- Profesionales ---
router.get('/professionals', professionalController.findAll);
router.get('/professionals/user/:codUser', professionalController.findByCodUser);
router.get('/professionals/speciality/:speciality', professionalController.findBySpeciality);
router.get('/professionals/:codigo', professionalController.findByCodigo);
router.post('/professionals', professionalController.register);
router.put('/professionals/:id', professionalController.update);
router.delete('/professionals/:id', professionalController.deactivate);

module.exports = router;
