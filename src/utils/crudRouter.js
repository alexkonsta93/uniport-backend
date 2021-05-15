import express from 'express';
import crudControllers from './crud';

var router = express.Router();

// /api/exchange
function setup(model) {

  router
    .route('/')
    .get(crudControllers(model).getOne)
    .post(crudControllers(model).createOne)
    .delete(crudControllers(model).deleteOne);

  // /api/exchange/all
  router
    .route('/all')
    .get(crudControllers(model).getAll)
    .delete(crudControllers(model).deleteAll);

  return router;
}

export default model => setup(model);
