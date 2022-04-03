import crudRouter from '../../utils/crudRouter';
import User from './user.model';
import Exchange from '../exchange/exchange.model';
import Order from '../order/order.model';
import Trade from '../trade/trade.model';
import Position from '../position/position.model';
//import { toCoinbaseOrders } from '../CoinbaseAdapter';
//import { toGdaxOrders } from '../GdaxAdapter';

// Clients
import FtxClient from '../../clients/FtxClient';
import CoinbaseClient from '../../clients/CoinbaseClient';
import KrakenClient from '../../clients/KrakenClient';
import KrakenFuturesClient from '../../clients/KrakenFuturesClient';
import BinanceClient from '../../clients/BinanceClient';
import GeminiClient from '../../clients/GeminiClient'

// Adapters
import KrakenFuturesAdapter from '../../adapters/KrakenFuturesAdapter';
import FtxAdapter from '../../adapters/FtxAdapter';
import CoinbaseAdapter from '../../adapters/CoinbaseAdapter';
import KrakenAdapter from '../../adapters/KrakenAdapter';
import BinanceAdapter from '../../adapters/BinanceAdapter';
import GeminiAdapter from '../../adapters/GeminiAdapter';
import GdaxAdapter from '../../adapters/GdaxAdapter';
import PoloniexAdapter from '../../adapters/PoloniexAdapter';

var router = crudRouter(User);

/*** /:ID/EXCHANGES ***/
router
  .route('/:id/exchanges')
  .get((req, res) => {
    User
      .findById(req.params.id, 'exchanges')
      .populate({ 
        path: 'exchanges',
        populate: { path: 'exchange', model: Exchange }
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
      let exchange = user.exchanges.id(req.body.id);
      // if exchange already exsits -> update
      if (exchange) exchange.set(req.body);

      // if exchange deasn't exist -> create
      else user.exchanges.push({ 'exchange': req.body.id });
      user.save((err, doc) => {
        if (err) {
          console.log('here');
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
        { '$pull': { 'exchanges': { 'exchange': req.body.id } } },
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

async function createDbEntries(userId, data) {
  var { orders, positions } = data;

  // Orders + Positions
  if (orders) {
    let orders = data.orders;
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
    let positionDocs = await Position.insertMany(positions);

    return { 
      orders: orderDocs,
      positions: positionDocs
    }
  }

  else {
    // Just Positions
    for (let position of positions) {

      // Basis trades
      position.basisTradeIds = [];
      for (let trade of position.basisTrades) {
        let doc = await Trade.create(trade);
        position.basisTradeIds.push(doc.id);
      }
      delete position.basisTrades;

      // Compensation trades
      position.compensationTradeIds = [];
      for (let trade of position.compensationTrades) {
        let doc = await Trade.create(trade);
        position.compensationTradeIds.push(doc.id);
      }
      delete position.compensationTrades;

      // Funding trades
      position.fundingTradeIds = [];
      for (let trade of position.fundingTrades) {
        let doc = await Trade.create(trade);
        position.fundingTradeIds.push(doc.id);
      }
      delete position.fundingTrades;
    }

    let positionDocs = await Position.insertMany(positions);

    return {
      positions: positionDocs
    }
  }
}

function selectAdapter(exchange, userId) {
  var adapter;
  switch (exchange) {
    case 'Coinbase':
      adapter = new CoinbaseAdapter(userId);
      break;
    case 'Gemini':
      adapter = new GeminiAdapter(userId);
      break;
    case 'Kraken':
      adapter = new KrakenAdapter(userId);
      break;
    case 'Kraken Futures':
      adapter = new KrakenFuturesAdapter(userId);
      break;
    case 'Binance':
      adapter = new BinanceAdapter(userId);
      break;
    case 'Ftx':
      adapter = new FtxAdapter(userId);
      break;
    case 'Gdax':
      adapter = new GdaxAdapter(userId);
      break;
    case 'Poloniex':
      adapter = new PoloniexAdapter(userId);
      break;
    default:
      throw new Error('exchange not recognized');
  }
  return adapter
}


function selectClient(exchange, apiKey, apiSecret) {
  var client;
  switch (exchange) {
    case 'Coinbase':
      client = new CoinbaseClient(apiKey, apiSecret);
      break;
    case 'Gemini':
      client = new GeminiClient(apiKey, apiSecret);
      break;
    case 'Kraken':
      client = new KrakenClient(apiKey, apiSecret);
      break;
    case 'Kraken Futures':
      client = new KrakenFuturesClient(apiKey, apiSecret);
      break;
    case 'Binance':
      client = new BinanceClient(apiKey, apiSecret);
      break;
    case 'Ftx':
      client = new FtxClient(apiKey, apiSecret);
      break;
    default:
      throw new Error('exchange not recognized');
  }
  return client;
}

/*** /:ID/ORDERS/API ***/
router
  .route('/:id/orders/api')
  .post(async (req, res) => {
    let apiKey = req.body.data.apiKey; // NOT SAFE!!!!
    let apiSecret = req.body.data.apiSecret; // NOT SAFE!!!
    let client = selectClient(req.body.data.exchange, apiKey, apiSecret);
    let adapter = selectAdapter(req.body.data.exchange, req.params.id);
    let data = await adapter.processApiData(client);
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
  .post(async (req, res) => {
    try {
      let adapter = selectAdapter(req.body.exchange, req.params.id);
      let data = adapter.processCsvData(req.body.lines);
      //await createDbEntries(req.params.id, data)
      res.status(200).json(data);
    } catch (err) {
      console.log(err);
    }
  })

/*** /:ID/EXCHANGE/:NAME/AUTH_DATA ***/

/*** /:ID/TRADES ***/
router
  .route('/:id/trades')
  .get(async (req, res) => {
    var trades;
    try {
      // Specific exchange
      if (req.query.exchange) {
        trades = await Trade.find({
          userId: req.params.id, 
          exchange: req.query.exchange
        });
      }
      // All trades
      else {
        trades = await Trade.find({
          userId: req.params.id
        });
      }
      res.status(200).json(trades);
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })
  .delete(async (req, res) => {
    try {
      await Trade.deleteMany({ userId: req.params.id });
      res.status(200).json('Delete trades success');
    } catch (err) {
      res.status(400).end();
    }
  });

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
  .delete(async (req, res) => {
    try {
      if (req.body.id) {
        let orderDoc = await Order.findOneAndDelete({ '_id': req.body.id });

        // Delete order's trades
        await orderDoc.deleteTrades()
      }
      else if (req.body.exchange) {
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
      }
      else {
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
  .post(async (req, res) => {
    try {
      let userDoc = User.findById(req.params.id, 'settings');
      await userDoc.updateSettings(req.body.data.userSettings);
      await userDoc.save();
      res.status(200).json('User settings updated');
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
        // Find positions in Position database for exchange
        let positionDocs = await Position.find({
          userId: req.params.id,
          exchange: req.body.exchange
        });

        for (let positionDoc of positionDocs) {
          // Delete position's trades
          await positionDoc.deleteTrades();

          // Delete position in Position database
          await Position.findOneAndDelete({ '_id': positionDoc.id });
        }
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

/*** /:ID/SETTINGS ***/
router
  .route('/:id/settings')
  .get(async (req, res) => {
    try {
      let userSettings = await User.findById(req.params.id, 'settings');
      return res.status(200).json(userSettings.settings);
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })
  .post(async (req, res) => {
    try {
      let userDoc = await User.findById(req.params.id);
      await userDoc.updateSettings(req.body);
      res.status(200).json('User settings updated');
    } catch (err) {
      console.log(err);
      res.status(400).end();
    }
  })
export default router;
