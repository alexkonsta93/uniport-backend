import express from 'express';
import controllers from './trade.controllers.js';

var router = express.Router();

// /api/trade
router
		.route('/')
		.get(controllers.getOne)
		.post(controllers.createOne)
		.delete(controllers.deleteOne);

// /api/trade/all
router
		.route('/all')
		.get(controllers.getAll)
		.delete(controllers.deleteAll);

// /api/trade/:id
router
		.route('/:id')
		.get(controllers.getOne)
		.delete(controllers.deleteOne);

export default router;
