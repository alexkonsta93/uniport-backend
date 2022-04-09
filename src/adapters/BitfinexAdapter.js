import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';
import MapOneToMany from '../utils/MapOneToMany';
import Map from '../utils/Map';
import Papa from 'papaparse';
import fs from 'fs';
import OrderModel from '../resources/order/order.model';
import PositionModel from '../resources/position/position.model';


export default class BitfinexAdapter {
  constructor(userId) {
    this.userId = userId;
    this.btcHistory = new DatePriceMap('BTC');
    this.btcHistory.load("/home/alexandros/Projects/uniport/uniport-backend/src/ohlcv/daily_BTCUSD.csv");
    this.ethHistory = new DatePriceMap('ETH');
    this.ethHistory.load("/home/alexandros/Projects/uniport/uniport-backend/src/ohlcv/daily_ETHUSD.csv")
    this.spotOrders = [];
    this.marginOrders = [];
    this.positions = [];
    this.positionRouter = new PositionRouter(userId);
    this.ledger = new MapOneToMany();
  }

  processCsvData(lines) {
    // Trades file
    lines = this.readTradesFile();
    lines = lines.reverse();
    const orders = this.buildOrders(lines);

    // Ledger file
    lines = this.readLedgerFile();
    for (let line of lines) {
      const date = this.buildDate(line);
      this.ledger.insert(date, line) 
    } 
    //console.log(this.ledger.getKeyValuePairsArray());

    this.categorizeOrders(orders);

    for (let order of orders) {
      //console.log(order);
      if (order.type === 'spot') {
        this.spotOrders.push(order);
      } else {
        this.marginOrders.push(order);
        this.handleMarginOrder(order);
      }
    }

    ////this.printMarginOrders(this.marginOrders);
    //console.log(this.positions);
    return {
      'orders': this.spotOrders,
      'positions': this.positions
    };
  }

  printMarginOrders(orders) {
    const csv = this.ordersToCsv(orders);
    fs.writeFile('./bitfinex-margin-orders.csv', csv, { flag: 'w' }, err => {
        if (err) throw err;
    });
  }

  ordersToCsv(orders) {
      var ret = [];
      
      for (let order of orders) {
        var obj = {
          'Date': order.dateTime,
          'Pair': order.base + order.quote,
          'Amount': order.amount,
          'Price': order.price,
          'PriceUSD': order.usdPrice
        };
        ret.push(obj);
      }
      return Papa.unparse(ret, {
          header: true
      })
  }

  handleMarginOrder(order) {
    // If auto closed because of Bitfinex hack
    if (order.orderId === 954315126) {
      return;
    }
    const pair = `${order.base}${order.quote}`;
    let currentPosition = this.positionRouter.getCurrent(pair);

    currentPosition.handleOrder(order);
    // If complete
    if (currentPosition.isComplete()) {
      this.positions.push(currentPosition);
      this.positionRouter.finalize(pair); 
    }

  }

  readTradesFile() {
    const tradesFile = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/alexkonsta93_trades_FROM_Sat-Mar-21-2015_TO_Mon-Apr-04-2022_ON_2022-04-04T21-19-14.701Z.csv";
    return this.readFile(tradesFile);
  }

  readLedgerFile() {
    const ledgerFile = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/alexkonsta93_ledgers_FROM_Sat-Mar-21-2015_TO_Mon-Apr-04-2022_ON_2022-04-04T21-20-36.448Z.csv";
    return this.readFile(ledgerFile);
  }

  readFile(file) {
    const lines = [];
    try {
      const data = fs.readFileSync(file, 'utf-8');
			Papa.parse(data, {
				header: true,
				complete: (results) => {
          results.data.forEach(line => {
            lines.push(line);
          });
				},
				error: (error) => {
					console.log(error);
				},
				skipEmptyLines: true
			});
		} catch (err) {
			console.log(err);
		}

		return lines;
  }

  categorizeOrders(orders) {
    for (let order of orders) {
      const lines = this.ledger.getValuesListGE(order.dateTime);
      if (order.orderId === 2100806182) {
        //console.log('here');
        //console.log(lines); 
      }
      let type = '';
      // Find "Trade" record and set type
      for (let line of lines) {
        const description = line['DESCRIPTION'];
        const words = description.split(' ');
        if (words[0] === 'Trading' || words[0] === 'Position') {
          type = line['WALLET'];
          break;
        } 
      }
      
      if (type === 'margin') {
        order.type = 'margin'
        for (let trade of order.trades) {
          trade.type = 'margin';
        }
      } else {
        order.type = 'spot';
      }
    }
  }

  buildOrders(lines) {
    const orders = [];
    let trade = this.buildTrade(lines.shift());
    let currentOrder = new Order(trade);

    for (let line of lines) {
      trade = this.buildTrade(line);
      if (trade.orderId !== currentOrder.orderId) {
        orders.push(currentOrder);
        currentOrder = new Order(trade);
      } else {
        currentOrder.integrate(trade);
      }
    }
    orders.push(currentOrder);

    return orders;
  }

  /*
   * Processes line into Trade object
   *
   * @param line - CSV file line
   * @return trade - Trade object
   */
  buildTrade(line) {
    const trade = {};

    const pair = this.buildPair(line);
    trade.base = pair[0];
    trade.quote = pair[1];
    trade.tradeId = this.buildTradeId(line);
    trade.orderId = this.buildOrderId(line);
    trade.amount = this.buildAmount(line);
    trade.dateTime = this.buildDate(line);
    trade.price = this.buildPrice(line);
    trade.usdPrice = this.buildUsdPrice(trade);
    trade.feeCurrency = 'USD';
    trade.fee = this.buildFee(line, trade);
    trade.exchange = 'Bitfinex';
    trade.userId = this.userId;
    trade.type = 'spot';

    return trade;
  }

  buildFee(line, trade) {
    const fee = Math.abs(parseFloat(line['FEE']));
    const feeCurrency = line['FEE CURRENCY'];

    switch (feeCurrency) {
      case 'USD':
        return fee;
      case trade.quote:
        return (fee * trade.usdPrice / trade.price);
      case trade.base:
        return (fee * trade.usdPrice);
      default:
        return 0.0;
    }
  }

  buildUsdPrice(trade) {
    let price = trade.price;

    if (trade.quote !== 'USD') {

      switch (trade.quote) {
        case 'ETH': {
          const ethPrice = this.ethHistory.getValueLE(trade.dateTime.unix());
          price = price * ethPrice;
          break;
        }
        case 'BTC': {
          const btcPrice = this.btcHistory.getValueLE(trade.dateTime.unix());
          price = price * btcPrice;
          break;
        }
        default: {
          throw Error(`No historical data for ${trade.quote}`);
        }
      }
    }

    return price;
  }

  
  buildPrice(line) {
    return parseFloat(line['PRICE']);
  }

  buildAmount(line) {
    return parseFloat(line['AMOUNT']);
  }

  buildDate(line) {
    return moment.utc(line['DATE'], 'DD-MM-YY HH:mm:ss');
  }

  buildOrderId(line) {
    return Number(line['ORDER ID']);
  }

  buildTradeId(line) {
    return Number(line['#']);
  }

  buildPair(line) {
    const pair = line['PAIR'].split('/');
    return pair;
  }

  async createDbEntries() {
    // Orders
    const orderDocs = await OrderModel.insertMany(this.spotOrders);

    // Positions
    for (let position of this.positions) {
      // basis trades
      let basisTradeIds = [];
      for (let order of position.basisTrades) {
        order = new OrderModel(order);
        const doc = await order.save();
        basisTradeIds.push(doc.id);
      }
      position.basisTradeIds = basisTradeIds;
      delete position.basisTrades;

      // compensation trades
      let compensationTradeIds = [];
      for (let order of position.compensationTrades) {
        order = new OrderModel(order);
        const doc = await order.save();
        compensationTradeIds.push(doc.id);
      }
      position.compensationTradeIds = compensationTradeIds;
      delete position.compensationTrades;
    }

    const positionDocs = await PositionModel.insertMany(this.positions);
    return {
      orders: orderDocs,
      position: positionDocs
    }
  }

}

class PositionRouter {
  constructor(userId) {
    this.map = new Map();
    this.userId = userId;
  }

  getCurrent(pair) {
    const key = pair;
    if (this.map.contains(key)) {
      return this.map.getValue(key);
    } else {
      const position = new Position(this.userId);
      this.map.insert(key, position);
      return position;
    }
  }

  finalize(pair) {
    const key = pair;
    this.map.remove(key);
  }
}

class Position {
  constructor(userId) {
    this.collateralType = 'crypto';
    this.userId = userId;
    this.basisTrades = [];
    this.basisFee = 0.0;
    this.fundingFee = 0.0;
    this.pnl = 0.0;
    this.outstanding = 0.0;
    this.basisFeeCurrency = 'USD';
    this.fundingTrades = [];
    this.compensationTrades = [];
    this.outstanding = 0.0; // Absolute number
    this.openPrice = 0.0;
    this.closePrice = 0.0;
    this.dateOpen = null;
    this.dateClose = null;
    this.base = null;
    this.quote = null;
    this.exchange = 'Bitfinex';
    this.type = 'margin'

    this.max = 0.0;
  }

  /*
   * Checks if positiona has been initiateded
   *
   * @return boolean
   */
  isEmpty() {
    return this.basisTrades.length === 0; 
  }
  
  /**
   * Function that checks if order exceeds outstanding. If so -> split
   *
   * @param order - order used to check if flip from long to short and vice versa
   * @return boolean
   */
  orderInvalidates(order) {
    if (this.basisTrades.length > 0 && (Math.abs(order.amount) > Math.abs(order.outstanding)*1.01) ) {
      // If next order flips from long to short and vice versa 
      return true;
    }
    return false;
  }

  isComplete() {
    if (!this.isEmpty() && Math.abs(this.outstanding/this.max) < 0.001) {
      // If position is closed with outstanding is 0
      return true;
    }
    return false
  }

  handleOrder(order) {
    // If initiating or not
    if (this.isEmpty()) {
      this.base = order.base;
      this.quote = order.quote;
      this.dateOpen = order.dateTime;
    }

    // outstanding
    this.outstanding += order.amount;

    // max
    if (Math.abs(this.outstanding) > Math.abs(this.max)) {
      this.max = this.outstanding;
    }

    this.basisTrades.push(order);
    
    // Finalize when complete
    if (this.isComplete()) {
      this.finalize(order);
    }
  }

  finalize(order) {
    // dateClose
    this.dateClose = order.dateTime;
    
    // pnl, fees
    let pnl = 0.0; 
    let fees = 0.0;
    for (let order of this.basisTrades) {
      pnl += (order.amount * order.price);
      fees += fees;
    }
    pnl = -pnl;
    pnl -= Math.abs(this.outstanding * order.price);
    this.pnl = pnl * order.usdPrice / order.price - fees;

    this.buildCompensationTrade(order);
  }

  buildCompensationTrade(order) {
    const compensation = {}

    if (this.pnl < 0) {
      // If negative pnl
      compensation.dateTime =  order.dateTime;
      compensation.price = order.usdPrice;
      compensation.usdPrice = order.usdPrice;
      compensation.base = order.base;
      compensation.quote = 'USD';
      compensation.userId = order.userId;
      compensation.type = 'spot';
      compensation.fee = 0.0;
      compensation.feeCurrency = 'USD';
      compensation.exchange = 'Bitfinex';
      compensation.amount = this.pnl / order.usdPrice;
    } else if (this.pnl && this.quote !== 'USD') {
      // If positive pnl
      compensation.dateTime = order.dateTime;
      compensation.price = order.usdPrice/order.price;
      compensation.usdPrice = order.usdPrice/order.price;
      compensation.base = order.quote;
      compensation.quote = 'USD';
      compensation.userId = order.userId;
      compensation.type = 'spot';
      compensation.fee = 0.0;
      compensation.feeCurrency = 'USD';
      compensation.exchange = 'Bitfinex';
      compensation.amount = this.pnl/(order.usdPrice/order.price);
    } else {
      return;
    }

    this.compensationTrades.push(compensation);
  }
}

class Order {
  constructor(trade) {
    this.dateTime = trade.dateTime;
    this.usdPrice = trade.userId;
    this.exchange = trade.exchange;
    this.base = trade.base;
    this.quote = trade.quote;
    this.price = trade.price;
    this.usdPrice = trade.usdPrice;
    this.amount = trade.amount;
    this.orderId = trade.orderId;
    this.userId = trade.userId;
    this.type = trade.type;
    this.fee = trade.fee;
    this.feeCurrency = trade.feeCurrency;
    this.trades = [trade];
  } 

  integrate(trade) {
    this.price = (this.price*this.amount + trade.price*trade.amount)/(this.amount + trade.amount);
    this.amount = this.amount + trade.amount;
    this.fee = this.fee + trade.fee;
    this.trades.push(trade);
  }
}
