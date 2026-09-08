const { Router } = require('express');
const controller = require('./appointment.controller');

const router = Router();

// Rutas estáticas o de más de un segmento van antes de '/:id' para que
// Express no interprete, por ejemplo, "generated" como un id.
router.get('/generated/speciality/:speciality', controller.generateBySpeciality);
router.get('/generated', controller.getGeneratedAppointments);
router.get('/first-available/:speciality', controller.findFirstAvailable);
router.get('/professional/speciality/:specialityProf', controller.findBySpecialityProf);
router.get('/professional/:codProf/date/:date', controller.findByCodProfAndDate);
router.get('/professional/:codProf', controller.findByCodProf);
router.get('/patient/:codPatient', controller.findByCodPatient);
router.get('/status/:status', controller.findByStatus);
router.get('/date/:date', controller.findByDate);

router.post('/export', controller.exportAppointments);
router.post('/', controller.create);

router.get('/', controller.findAll);
router.get('/:id', controller.findById);

router.put('/:id/status', controller.updateStatus);
router.put('/:id', controller.update);
router.delete('/:id', controller.cancel);

module.exports = router;
