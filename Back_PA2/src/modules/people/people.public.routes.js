const { Router } = require('express');
const facade = require('./people.facade');

const router = Router();

// Pública (montada antes del authMiddleware en app.js): solo devuelve los
// campos ya filtrados por la fachada (mapProfessional), nunca datos de auth.users
// sensibles. Se usa desde el Home para la sección "Nuestro equipo".
router.get('/professionals', async (req, res, next) => {
  try {
    const professionals = await facade.getAllActiveProfessionals();
    res.json(professionals);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
