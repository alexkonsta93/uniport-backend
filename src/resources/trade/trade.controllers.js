import crudControllers from '../../utils/crud.js';
import Trade from './trade.model.js';
import Order from '../order/order.model.js';

async function deleteOne(req, res) {

		try {
				Trade.findOneAndDelete({ ...req.body }, async function(err, removed) {
						if (err) return res.status(400).end();

						// delete tradeId from parent order
						let id = removed.orderId;
						let parentOrder = await Order.findById(id);
						let tradeIds = parentOrder.tradeIds;
						tradeIds.splice(tradeIds.indexOf(removed.id), 1);
						await parentOrder.updateOne({ tradeIds: tradeIds })

						return res.status(200).json(removed);
				});
		} catch (err) {
				console.log(err)
				res.status(400).end();
		}
}

async function deleteAll(req, res) {

		try {
				let removed = await Trade.deleteMany({});

				if (!removed) return res.status(400).end();

				return res.status(200).json(removed)
		} catch (err) {
				console.log(err)
				res.status(400).end();
		}

}

var controllers = crudControllers(Trade);
controllers.deleteOne = deleteOne;
controllers.deleteAll = deleteAll;
export default controllers;
