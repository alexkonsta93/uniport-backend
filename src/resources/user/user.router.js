import express from 'express';
import crudControllers from '../../utils/crud';

var router = express.Router();

// /api/exchange
router
  .route('/')
  .get(crudControllers.getOne)
  .post(crudControllers.createOne)
  .delete(crudControllers.deleteOne);

// /api/exchange/all
router
  .route('/all')
  .get(crudControllers.getAll)
  .delete(crudControllers.deleteAll);

export default router;
