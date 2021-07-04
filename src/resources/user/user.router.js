import crudRouter from '../../utils/crudRouter';
import User from './user.model';
import Exchange from '../exchange/exchange.model';
import Order from '../order/order.model';
import Trade from '../trade/trade.model';
import { toCoinbaseOrders } from '../CoinbaseAdapter';
import { toGdaxOrders } from '../GdaxAdapter';
import { FtxClient } from '../../clients/FTX';
import { processFtxData } from '../../adapters/FtxAdapter';

var router = crudRouter(User);

router
  .route('/:id/exchanges')
  .get((req, res) => {
    User
      .findById(req.params.id, 'exchanges')
      .populate({ 
        path: 'exchanges',
        populate: { path: '_id', model: Exchange }
      })
      .exec((err, exchanges) => {
        if (err) {
          console.log(err);
          res.status(400).end();
        }
        res.status(200).json(exchanges);
      });
  })
  .post((req, res) => {
    User.findById(req.params.id, (err, user) => {
      if (err) {
        console.log(err);
        res.status(400).end();
      }
      let exchange = user.exchanges.id(req.body._id);
      // if doc already exsits -> update
      if (exchange) exchange.set(req.body);

      // if doc deasn't exist -> create
      else user.exchanges.push(req.body);
      user.save((err, doc) => {
        if (err) {
          console.log(err);
          res.status(400).end();
        }
        res.status(200).json(doc);
      })
    });
  })
  .delete((req, res) => {
    if (req.body.id) {
      User.updateOne(
        { '_id': req.params.id },
        { '$pull': { 'exchanges': { '_id': req.body.id } } },
        (err, doc) => {
          if (err) {
            console.log(err);
            res.status(400).end();
          }
          res.status(200).json(doc);
        }
      );
    } else {
      User.updateOne(
        { '_id': req.params.id },
        { '$set':  { 'exchanges': [] } },
        (err, doc) => {
          if (err) {
            console.log(err);
            res.status(400).end();
          }
          res.status(200).json(doc);
        }
      );
    }
  });

router
  .route('/:id/orders')
  .get(async (req, res) => {
    let client = new FtxClient(
      'TiIp19Y1eldkSzT2pOXeODVN4FomuR3NQvzdLsmr',
      '9sHJgt3l4svQ8ff7Q7BDJS3GR0rQ8Az6TvQd9gdz'
    );
    let data = await client.getFills();
    let orders = await processFtxData(data, req.params.id);
    res.status(200).json(orders);
  })
  .post(async (req, res) => {
    let adapter;
    switch (req.body.exchange) {
      case 'Coinbase':
        adapter = toCoinbaseOrders;
        break;
      case 'GDAX':
        adapter = toGdaxOrders;
        break;
      case 'Kraken':
        adpater = toKrakenOrders;
        break;
      default:
        throw new Error('exchange not recognized');
    }

    let orders = adapter(req.body.lines, req.params.id);
    let orderIds = [];
    let tradeIds = [];
    // Update Order db by creating new document if not a duplicate
    // Update Trade db if necessary
    for (let order of orders) {
      try {
        let doc = await Order.create(order);
        orderIds.push(doc.id);

        // Handle subtrades
        if (order.trades) {
          for (let trade of order.trades) {
            trade.userId = req.params.id;
            try {
              let doc = await Trade.create(trade);
              tradeIds.push(doc.id);
            } catch(err) {
              console.log(err);
              continue;
            }
          }
        }

        // Update order.trades if necessary
        if (tradeIds.length > 0) {
          await Order.updateOne(
            { '_id': doc.id },
            { '$push': { 'tradeIds' : tradeIds } }
          );
          tradeIds = [];
        }
      } catch (err) {
        console.log(err);
        continue;
      }
    }

    // Update User.orders
    User.updateOne(
      { '_id': req.params.id },
      { '$push': { 'orders': orderIds } },
      (err, doc) => {
        if (err) {
          console.log(err);
          res.status(400).end();
        }
        res.status(200).json(doc);
      }
    );
  })
  .delete(async (req, res) => {
    if (req.body.id) {

      let order = await Order.findOneAndDelete({ '_id': req.body.id });

      // delete order's trades
      await order.deleteTrades()

      // update user orders
      User.updateOne(
        { '_id': req.params.id },
        { '$pull': { 'orders': req.body.id } },
        (err, doc) => {
          if (err) {
            console.log(err);
            res.status(400).end();
          }
          res.status(200).json(doc);
        }
      );

    } else if (req.body.exchange) {

      // Find orders in Order database
      let orders = await Order.find({
        userId: req.params.id, 
        exchange: req.body.exchange
      })
      let orderIds = [];

      try {
        for (let order of orders) {
          // Delete order's trade
          await order.deleteTrades();

          // Delete order in Order database
          await Order.findOneAndDelete({ '_id': order.id });
          orderIds.push(order.id);
        }
      } catch (err) {
        console.log(err);
        res.status(400).end();
      }
      
      // Delete order in User.orders database
      User.updateOne(
        { '_id': req.params.id },
        { '$pull': { 'orders': { '$in': orderIds } } },
        (err, doc) => {
          if (err) {
            console.log(err);
            res.status(400).end();
          }
          res.status(200).json(doc);
        }
      );

    } else {

      try {
        // Delete all user's orders
        await Order.deleteMany({ userId: req.params.id });

        // Delete all user's trades
        await Trade.deleteMany({ userId: req.params.id });
      } catch (err) {
        console.log(err);
        res.status(400).end();
      }

      //let orders = User.findById(req.params.id).orders;
      //await Order.deleteMany(orders);

      // Update user's order
      User.updateOne(
        { '_id': req.params.id },
        { '$set': { 'orders': [] } },
        (err, doc) => {
          if (err) {
            console.log(err);
            res.status(400).end();
          }
          res.status(200).json(doc);
        }
      );

    }
  });

export default router;
