import crudRouter from '../../utils/crudRouter';
import User from './user.model';
import Exchange from '../exchange/exchange.model';
import Order from '../order/order.model';
import Trade from '../trade/trade.model';
import Position from '../position/position.model';
//import { toCoinbaseOrders } from '../CoinbaseAdapter';
//import { toGdaxOrders } from '../GdaxAdapter';

// Clients
import { FtxClient } from '../../clients/FtxClient';
import { CoinbaseClient } from '../../clients/CoinbaseClient';
import { KrakenClient } from '../../clients/KrakenClient';
import { KrakenFuturesClient } from '../../clients/KrakenFuturesClient';
import { BinanceClient } from '../../clients/BinanceClient';
import { GeminiClient } from '../../clients/GeminiClient'

// Adapters
import { processFtxApiData } from '../../adapters/FtxAdapter';
import { processCoinbaseApiData } from '../../adapters/CoinbaseAdapter';
import { processKrakenApiData } from '../../adapters/KrakenAdapter';
import { processKrakenFuturesApiData } from '../../adapters/KrakenFuturesAdapter';
import { processBinanceApiData } from '../../adapters/BinanceAdapter';
import { processGeminiApiData } from '../../adapters/GeminiAdapter';

var router = crudRouter(User);

/*
async function createOrderEntry(userDoc, order, trades) {

  var tradeIds = [];
  for (let trade of trades) {
    let tradeDoc = await Trade.create(trade);
    tradeIds.push(tradeDoc.id);
  }

  order.tradeIds = tradeIds;
  var orderDoc = await Order.create(order);
  console.log(orderDoc); 
  userDoc.orders.push(orderDoc.id);
  await userDoc.save();
}

async function createDbEntry(userId, data) {
  var userDoc = await User.findById(userId);
  var { orders, positions } = data;
  var count = 0;
  for (let order of orders) {
    if (count === 2) break;
    let trades = order.trades;
    delete order.trades;
    await createOrderEntry(userDoc, order, trades);   
    count += 1;
  }
  // positions
}
*/

async function createDbEntries(userId, data) {
  var { orders, positions } = data;

  // Handle orders and trades
  for (let order of orders) {
    let tradeDocs = await Trade.insertMany(order.trades); 
    order.tradeIds = tradeDocs.map(tradeDoc => tradeDoc.id);
    delete order.trades;
  }
  var orderDocs = await Order.insertMany(orders);

  // Handle positions
  for (let position of positions) {
    let basisIds = position.basisTrades.map(trade => trade.orderId);
    let basisTradeIds = await Order.find({ orderId: { $in: basisIds } }, 'id');
    position.basisTradeIds = basisTradeIds;
    delete position.basisTrades;

    if (position.collateralType === 'crypto') {
      let fundingIds = position.fundingTrades.map(trade => trade.orderId);
      let fundingTradeIds = await Order.find({ orderId: { $in: fundingIds } }, 'id')
      position.fundingTradeIds = fundingTradeIds;
      delete position.fundingTrades;

      let compensationIds = position.compensationTrades.map(trade => trade.orderId);
      let compensationTradeIds = await Order.find({ orderId : { $in : compensationIds } }, 'id');
      position.compensationTradeIds = compensationTradeIds;
      delete position.compensationTrades;
    }
  }
  var positionDocs = await Position.insertMany(positions);

  return { 
    orders: orderDocs,
    positions: positionDocs
  }
}

/*** /:ID/EXCHANGES ***/
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
      // if exchange already exsits -> update
      if (exchange) exchange.set(req.body);

      // if exchange deasn't exist -> create
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
      // Delete specific exchange
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
      // Delete all exchanges
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

/*** /:ID/ORDERS/API ***/
router
  .route('/:id/orders/api')
  .post(async (req, res) => {
    let key = req.body.data.apiKey; // NOT SAFE!!!!
    let secret = req.body.data.apiSecret; // NOT SAFE!!!
    let client, process;
    switch (req.body.data.exchange) {
      case 'Coinbase':
        client = new CoinbaseClient(key, secret);
        process = processFtxApiData;
        break;
      case 'Gemini':
        client = new GeminiClient(key, secret);
        process = processGeminiApiData;
        break;
      case 'Kraken':
        client = new KrakenClient(key, secret);
        process = processKrakenApiData;
        break;
      case 'Kraken Futures':
        client = new KrakenFuturesClient(key, secret);
        process = processKrakenFuturesApiData;
        break;
      case 'Binance':
        client = new BinanceClient(key, secret);
        process = processBinanceApiData;
        break;
      case 'Ftx':
        client = new FtxClient(key, secret);
        process = processFtxApiData;
        break;
      default:
        throw new Error('exchange client not recognized');
    }
    let data = await process(req.params.id, client);
    try {
      await createDbEntries(req.params.id, data);
      res.status(200).json(data);
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })

/*** /:ID/ORDERS/CSV ***/
router
  .route('/:id/orders/csv')
  .post()

/*** /:ID/EXCHANGE/:NAME/AUTH_DATA

/*** /:ID/ORDERS ***/
router
  .route('/:id/orders')
  .get(async (req, res) => {
    var orders;
    try {
      // Specific exchange
      if (req.query.exchange) {
        orders = await Order.find({
          userId: req.params.id, 
          exchange: req.query.exchange
        });
      }
      // All orders
      else {
        orders = await Order.find({
          userId: req.params.id
        });
      }
      res.status(200).json(orders);
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })
  /*
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
        throw new Error('exchange adapter not recognized');
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
  })
  */
  .delete(async (req, res) => {
    try {
      if (req.body.id) {
        let orderDoc = await Order.findOneAndDelete({ '_id': req.body.id });

        // Delete order's trades
        await orderDoc.deleteTrades()
      } else if (req.body.exchange) {
        // Find orders in Order database for exchange
        let orderDocs = await Order.find({
          userId: req.params.id, 
          exchange: req.body.exchange
        })

        for (let orderDoc of orderDocs) {
          // Delete order's trade
          await orderDoc.deleteTrades();

          // Delete order in Order database
          await Order.findOneAndDelete({ '_id': orderDoc.id });
        }
      } else {
        // Delete all user's orders
        await Order.deleteMany({ userId: req.params.id });

        // Delete all user's trades
        await Trade.deleteMany({ userId: req.params.id });
      }
      res.status(200).json('Delete orders success');
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  });

/*** /:ID/POSITIONS ***/
router
  .route('/:id/positions')
  .get(async (req, res) => {
    var positions;
    try {
      if (req.query.exchange) {
        // Specific exchange
        positions = await Position.find({
          userId: req.params.id,
          exchange: req.query.exchange
        });
      }
      else {
        // All positions
        positions = await Position.find({
          userId: req.params.id
        });
      }
      res.status(200).json(positions);
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })
  .delete(async (req, res) => {
    try {
      if (req.body.id) {
        // Delete one position
        await Position.findOneAndDelete({ '_id': req.body.id });
      }
      else if (req.body.exchange) {
        // Delete all of user's positions for specific exchange
        await Position.deleteMany({
          userId: req.params.id,
          exchange: req.body.exchange
        });
      }
      else {
        // Delete all user's positions
        await Position.deleteMany({ userId: req.params.id });
      }
      res.status(200).json('Delete positions success');
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })

export default router;
