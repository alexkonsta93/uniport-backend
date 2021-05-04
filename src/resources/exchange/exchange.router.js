import express from 'express';
import controllers from './exchange.controllers';

var router = express.Router();

// /api/exchange
router
  .route('/')
  .get(controllers.getOne)
  .post(controllers.createOne)
  .delete(controllers.deleteOne);

// /api/exchange/all
router
  .route('/all')
  .get(controllers.getAll)
  .delete(controllers.deleteAll);

export default router;
