import crudControllers from '../../utils/crud';
import Trade from '../trade/trade.model';
import Position from '../leveraged-position/leveraged-position.model';

async function deleteOne(req, res) {
		try {
				Position.findOneAndDelete({ ...req.body }, (err, removed) => {
						if (err) res.status(400).end();

						res.status(200).json({ data: removed });
				});
		} catch (err) {
				res.status(400).end();
		}
}

async function deleteAll(req, res) {

		try {
				let removed = await Position.deleteMany({});

				if (!removed) return res.status(400).end();

				return res.status(200).json({ data: removed })
		} catch (err) {
				console.log(err)
				res.status(400).end();
		}

}

var controllers = crudControllers(Position);
controllers.deleteOne = deleteOne;
controllers.deleteAll = deleteAll;
export default controllers;
