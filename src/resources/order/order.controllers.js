import crudControllers from '../../utils/crud.js';
import Order from './order.model.js';
import Trade from '../trade/trade.model.js';

async function deleteOne(req, res) {

  try {
    Order.findOneAndDelete({ ...req.body }, function(err, removed) {
      if (err) return res.status(400).end();

      // delete subtrades
      removed.tradeIds.forEach(async (id) => {
        await Trade.deleteOne({ "_id": id });
      });

      return res.status(200).json({ data: removed });
    });
  } catch (err) {
    console.log(err);
    res.status(400).end();
  }
}

async function deleteAll(req, res) {

  try {
    let removed = await Order.deleteMany({});

    if (!removed) return res.status(400).end();

    // if order deletion successful, delete all trades
    await Trade.deleteMany({});

    return res.status(200).json({ data: removed })
  } catch (err) {
    console.log(err)
    res.status(400).end();
  }
}

var controllers = crudControllers(Order);
controllers.deleteOne = deleteOne;
controllers.deleteAll = deleteAll;

export default controllers; 
