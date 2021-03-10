import express from 'express';
import controllers from './leveraged-position.controller';

var router = express.Router();

// /api/leveraged-position
router
		.route('/')
		.get(controllers.getOne)
		.post(controllers.createOne)
		.delete(controllers.deleteOne);

// /api/leveraged-position/all
router
		.route('/all')
		.get(controllers.getAll)
		.delete(controllers.deleteAll);

// /api/leveraged-position/:id
router
		.route('/:id')
		.get(controllers.getOne)
		.delete(controllers.deleteOne);

export default router;
