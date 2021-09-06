import express from 'express';
import controllers from './position.controller';

var router = express.Router();

// /api/position
router
		.route('/')
		.get(controllers.getOne)
		.post(controllers.createOne)
		.delete(controllers.deleteOne);

// /api/position/all
router
		.route('/all')
		.get(controllers.getAll)
		.delete(controllers.deleteAll);

// /api/position/:id
router
		.route('/:id')
		.get(controllers.getOne)
		.delete(controllers.deleteOne);

export default router;
