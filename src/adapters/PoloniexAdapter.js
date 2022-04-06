import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';
import Map from '../utils/Map';
import Papa from 'papaparse';
import fs from 'fs';

export default class PoloniexAdapter {
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
  }

  /*
   * First function that runs
   *
   * @param lines - csv file
   */
  processCsvData(lines) {
    // Reverse for chronological order
    lines = lines.reverse();
    const orders = this.buildOrders(lines);

    for (let order of orders) {
      if (order.type === 'spot') {
        this.handleExchangeOrder(order);
      } else {
        this.handleMarginOrder(order);
      }
    }
    //this.printMarginOrders(this.marginOrders);
    console.log(this.positions);
    /*
    return {
      'spotOrders': this.spotOrders,
      'positions': this.positions
    };
    */
  }

  printMarginOrders(orders) {
    const csv = this.ordersToCsv(orders);
    fs.writeFile('./margin-orders.csv', csv, { flag: 'w' }, err => {
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

  handleExchangeOrder(order) {
    this.spotOrders.push(order);
  }

  /* Logic that handles a margin order
   *
   * @param order
   * @return -1 if i in loop should decrease to repeat order; 0 otherwise
   */
  handleMarginOrder(order) {
    //this.marginOrders.push(order);
    const pair = `${order.base}${order.quote}`;
    let currentPosition = this.positionRouter.getCurrent(pair);

    currentPosition.handleOrder(order);
    // If complete
    if (currentPosition.isComplete()) {
      this.positions.push(currentPosition);
      this.positionRouter.finalize(pair);
    }

  }

  /**
   * Build exchange trade from line data
   *
   * @param line - line from csv file
   * @return trade - constructed trade object
   */
  buildTrade(line) {
    const trade = {};

    trade.dateTime = new Date(line['Date']);

    trade.userId = this.userId;
    
    trade.exchange = 'Poloniex';

    const pair = this.buildPair(line);
    trade.base = pair[0];
    trade.quote = pair[1];

    trade.price = this.buildPrice(line);

    trade.amount = this.buildAmount(line);

    trade.orderId = line['Order Number'];

    
    trade.type = this.buildType(line);


    let price = trade.price;
    if (trade.quote !== 'USD') {
      const dateTime = moment.utc(trade.dateTime);

      switch (trade.quote) {
        case 'ETH': {
          const ethPrice = this.ethHistory.getValueLE(dateTime.unix());
          price = price * ethPrice;
          break;
        }
        case 'BTC': {
          const btcPrice = this.btcHistory.getValueLE(dateTime.unix());
          price = price * btcPrice;
          break;
        }
        default: {
          throw Error(`No historical data for ${trade.quote}`);
        }
      }
    }
    trade.usdPrice = price;

    let fee = parseFloat(line['Fee Total']) * trade.usdPrice;
    const feeCurrency = line['Fee Currency'];
    if (feeCurrency === trade.quote) {
      fee = fee / price
    }
    trade.fee = fee;
    trade.feeCurrency = 'USD';

    return trade;

  }

  buildAmount(line) {
    let amount = parseFloat(line['Amount']);
    if (line['Type'] === 'Sell') {
      amount = -amount;
    }
    return amount;
  }

  buildPrice(line) {
    const price = parseFloat(line['Price']);
    return price;
  }

  buildPair(line) {
    const pair = line['Market'].split('/');
    return pair;
  }

  buildType(line) {
    const category = line['Category'];
    let type = '';
    switch (category) {
      case 'Exchange':
        type = 'spot';
        break;
      case 'Margin trade':
        type = 'margin';
        break;
      case 'Settlement':
        type = 'spot';
        break;
      default:
        throw Error("Can't recognize Poloniex line");
    }
    return type;
  }

}

class PositionRouter {
  constructor(userId) {
    this.map = new Map();
    this.userId = userId;
  }

  getCurrent(pair) {
    const key = pair;
    //console.log(this.map.getKeyValuePairsArray());
    if (this.map.contains(key)) {
      //console.log('here1');
      return this.map.getValue(key);
    } else {
      //console.log('here2');
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
    this.exchange = 'Poloniex';
    this.type = 'margin'
    
    this.max = 0.0;
  }

  /**
   * Function that checks if position is complete.
   * Only an estimation because of inaccuarte data.
   * If outstanding margin is less than 5% of max value of
   * margin -> then complete
   *
   * @param order - order used to check if flip from long to short and vice versa
   * @return boolean
   */
  orderInvalidates(order) {
    if (this.basisTrades.length > 0 && (Math.abs(this.outstanding) - Math.abs(order.amount)) < 0) {
      // If next order flips from long to short and vice versa 
      return true;
    }
    return false;
  }

  isComplete() {
    // Since data is inaccurate, must estimate
    if (!this.isEmpty() && Math.abs(this.outstanding/this.max) < 0.1) {
      // If position *almost* closed with oustanding close to 0
      return true;
    }
    return false;
  }

  /*
   * Checks if positiona has been initiateded
   *
   * @return boolean
   */
  isEmpty() {
    return this.basisTrades.length === 0; 
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
      compensation.exchange = 'Poloniex';
      compensation.amount = this.pnl / order.usdPrice;
    } else {
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
      compensation.exchange = 'Poloniex';
      compensation.amount = this.pnl/(order.usdPrice/order.price);
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
  } 

  integrate(trade) {
    this.price = (this.price*this.amount + trade.price*trade.amount)/(this.amount + trade.amount);
    this.amount = this.amount + trade.amount;
    this.fee = this.fee + trade.fee;
  }
}
