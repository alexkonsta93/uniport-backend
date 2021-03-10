import express from 'express';
import controllers from './order.controllers.js';

var router = express.Router();

// /api/order
router
		.route('/')
		.get(controllers.getOne)
		.post(controllers.createOne)
		.delete(controllers.deleteOne);

// /api/order/all
router
		.route('/all')
		.get(controllers.getAll)
		.delete(controllers.deleteAll);

// /api/order/:id
router
		.route('/:id')
		.get(controllers.getOne)
		.delete(controllers.deleteOne);

export default router;
