import crudRouter from '../../utils/crudRouter';
import User from './user.model';
import Exchange from '../exchange/exchange.model';
import Order from '../order/order.model';
import Trade from '../trade/trade.model';
import { toCoinbaseOrders } from '../CoinbaseAdapter';
import { toGdaxOrders } from '../GdaxAdapter';

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
  .post(async (req, res) => {
    let adapter;
    switch (req.body.exchange) {
      case 'Coinbase':
        adapter = toCoinbaseOrders;
        break;
      case 'GDAX':
        adapter = toGdaxOrders;
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

      await Order.findOneAndDelete({ '_id': req.body.id });
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

      // Delete order in Order database
      try {
        for (let order of orders) {
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

      let orders = User.findById(req.params.id).orders;
      await Order.deleteMany(orders);
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
