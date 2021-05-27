import express from 'express';
import crudControllers from './crud';

// /api/exchange
function setup(model) {
  var router = express.Router();

  router
    .route('/')
    .get(crudControllers(model).getOne)
    .post(crudControllers(model).createOne)
    .delete(crudControllers(model).deleteOne);

  router
    .route('/all')
    .get(crudControllers(model).getAll)
    .delete(crudControllers(model).deleteAll);

  router
    .route('/:id')
    .get(crudControllers(model).getById)
    .delete(crudControllers(model).deleteById);

  return router;
}

export default model => setup(model);
