import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';
import Map from '../utils/Map';
import Papa from 'papaparse';
import fs from 'fs';
import OrderModel from '../resources/order/order.model';
import PositionModel from '../resources/position/position.model';
import ExchangeAccountant from './ExchangeAccountant';
import SortedMap from '../utils/SortedMap';
import MapOneToMany from '../utils/MapOneToMany';

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
    this.accountant = new ExchangeAccountant();
    this.positionRouter = new PositionRouter(userId);
    this.actions = new SortedMap();
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
      if (order.type === 'spot' || order.type == 'settlement') {
        this.spotOrders.push(order);
      } else {
        this.marginOrders.push(order);
        this.handleMarginOrder(order);
      }
    }
    //this.printMarginOrders(this.marginOrders);
    //console.log(this.positions);
    return {
      'orders': this.spotOrders,
      'positions': this.positions
    };
  }

  processLocalData() {
    
    // Trades file
    let lines = this.readTradesFile();
    lines = lines.reverse();
    const orders = this.buildOrders(lines);

    for (let order of orders) {
      if (order.type === 'spot' || order.type == 'settlement') {
        this.spotOrders.push(order);
        this.actions.insert(order.dateTime, order);
      } else {
        this.handleMarginOrder(order);
      }
    }
    /*
    for (let position of this.positions) {
      console.log(position.format());
    }
    */

    // Deposits less withdrawals
    let ethDLW = 0.0;
    let btcDLW = 0.0;

    // Deposits file
    lines = this.readDepositsFile();
    lines = lines.reverse();
    let transfers = this.buildDeposits(lines);
    for (let transfer of transfers) {
      this.actions.insert(transfer.dateTime, transfer);
      if (transfer.currency === 'ETH') {
        ethDLW += transfer.amount;
      }
      if (transfer.currency === 'BTC') {
        btcDLW += transfer.amount;
      }
    }

    // Withdrawals file
    lines = this.readWithdrawalsFile();
    lines = lines.reverse();
    transfers = this.buildWithdrawals(lines);
    for (let transfer of transfers) {
      this.actions.insert(transfer.dateTime, transfer);
      if (transfer.currency === 'ETH') {
        ethDLW += transfer.amount;
      }
      if (transfer.currency === 'BTC') {
        btcDLW += transfer.amount;
      }
    }

    for (let action of this.actions.getValues()) {
      console.log(action.format());
      if (action.dateOpen) {
        // If position
        this.accountant.handlePositionPoloniex(action);
      } else if (action.price) {
        // If order
        this.accountant.handleTrade(action);
        if (action.base === 'ETH') {
          ethDLW += action.amount;
        }
        if (action.base === 'BTC') {
          btcDLW += action.amount;
        }
      } else {
        // If transfer
        this.accountant.handleTransfer(action);
      }
      console.log(this.accountant.getBalances());
    }
    //console.log('eth', ethDLW);
    //console.log('btc', btcDLW);
    /*
    return {
      'orders': this.spotOrders,
      'positions': this.positions
    };
    */
  }

  readTradesFile() {
    const file = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Poloniex/trades-2022-04-02T11_51_46-04_00.csv";
    return this.readFile(file);
  }

  readDepositsFile() {
    const file = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Poloniex/deposits-2022-04-02T11_52_00-04_00.csv";
    return this.readFile(file);
  }

  readWithdrawalsFile() {
    const file = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Poloniex/withdrawals-2022-04-02T11_51_55-04_00.csv";
    return this.readFile(file);
  }

  readMarginBorrowingFile() {
    const file = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Poloniex/marginBorrowing-2022-04-02T11_47_35-04_00.csv";
    return this.readFile(file);
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
          'Fee': order.fee,
          'PriceUSD': order.usdPrice
        };
        ret.push(obj);
      }
      return Papa.unparse(ret, {
          header: true
      })
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

  buildOrders(lines) {
    const orders = [];
    let trade = this.buildTrade(lines.shift());
    let currentOrder = new Order(trade);

    for (let line of lines) {
      /*
      if (line['Category'] === 'Settlement') {
        continue;
      }
      */
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

  buildBorrows(lines) {
    const borrows = new MapOneToMany(); // Date close -> Line
    
    for (let line of lines) {
      const borrow = {};
      borrow.dateTime = line['Close']; 
      borrow.currency = line['Currency'];
      borrow.amount = parseFloat(line['Amount']);
      borrow.fee = parseFloat(line['TotalFee']);
      borrows.insert(borrow.dateTime, borrow);
    }

    return borrows;
  }

  buildDeposits(lines) {
    const transfers = [];

    for (let line of lines) {
      if (line['Status'] !== 'COMPLETE') {
        continue;
      }
      const transfer = {};
      transfer.dateTime = new Date(line['Date']);
      transfer.currency = line['Currency'];
      transfer.amount = parseFloat(line['Amount']);
      transfer.format = function() {
        return {
          action: 'Transfer',
          dateTime: this.dateTime,
          currency: this.currency,
          amount: this.amount
        };
      }
      transfers.push(transfer);
    }

    return transfers;
  }

  buildWithdrawals(lines) {
    const transfers = [];

    for (let line of lines) {
      let status = line['Status'];
      status = status.split(' ')[0];
      if (status !== 'COMPLETE:') {
        continue;
      }
      const transfer = {};
      transfer.dateTime = new Date(line['Date']);
      transfer.currency = line['Currency'];
      transfer.amount = -parseFloat(line['Amount']);
      transfer.format = function() {
        return {
          action: 'Transfer',
          dateTime: this.dateTime,
          currency: this.currency,
          amount: -this.amount
        };
      }
      transfers.push(transfer);
    }

    return transfers;
  }


  /* Logic that handles a margin order
   *
   * @param order
   * @return -1 if i in loop should decrease to repeat order; 0 otherwise
   */
  handleMarginOrder(order) {
    this.marginOrders.push(order);
    const pair = `${order.base}${order.quote}`;
    let currentPosition = this.positionRouter.getCurrent(pair);

    currentPosition.handleOrder(order);
    // If complete
    if (currentPosition.isComplete()) {
      this.positions.push(currentPosition);
      this.actions.insert(currentPosition.dateClose, currentPosition);
      //this.accountant.handlePosition(currentPosition);
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

    trade.feeCurrency = 'USD';
    trade.fee = this.buildFee(line, trade);

    return trade;

  }

  buildFee(line, trade) {
    const fee = parseFloat(line['Fee Total']);
    const feeCurrency = line['Fee Currency'];

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
        type = 'settlement';
        break;
      default:
        throw Error("Can't recognize Poloniex line");
    }
    return type;
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
      if (position.compensationTrades.length > 0) {
        let order = position.compensationTrades[0];
        order = new OrderModel(order);
        const doc = await order.save();
        compensationTradeIds.push(doc.id);
      }
      /*
      for (let order of position.compensationTrades) {
        order = new OrderModel(order);
        const doc = await order.save();
        compensationTradeIds.push(doc.id);
      }
      */
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
    this.grossPnl = 0.0;
    this.netPnl = 0.0;
    this.outstanding = 0.0;
    this.basisFeeCurrency = 'USD';
    this.fundingTrades = [];
    this.compensationTrades = [];
    this.outstanding = 0.0; // Absolute number
    this.priceOpen = null;
    this.priceClose = null;
    this.base = null;
    this.quote = null;
    this.exchange = 'Poloniex';
    this.type = 'margin'
    
    this.max = 0.0;
  }

  format() {
    return {
      action: 'Position',
      dateOpen: this.dateOpen,
      dateClose: this.dateClose,
      base: this.base,
      quote: this.quote,
      netPnl: this.netPnl,
      fee: this.basisFee,
      compensationTrades: this.compensationTrades
    }
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
    this.basisFee += order.fee;
    
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
    for (let order of this.basisTrades) {
      pnl += (order.amount * order.price);
    }
    pnl = -pnl;
    pnl -= Math.abs(this.outstanding * order.price);
    this.grossPnl = pnl * order.usdPrice / order.price;
    this.netPnl = this.grossPnl - this.basisFee;

    this.buildCompensationTrade(order);
  }

  buildCompensationTrade(order) {
    const main = {};
    const alternative = {};

    if (this.netPnl < 0) {
      // If negative pnl
      main.price = order.usdPrice;
      main.base = order.base;
      main.amount = this.netPnl / order.usdPrice;
      main.usdPrice = order.usdPrice;
      main.dateTime =  order.dateTime;
      main.quote = 'USD';
      main.userId = order.userId;
      main.type = 'spot';
      main.fee = 0.0;
      main.feeCurrency = 'USD';
      main.exchange = 'Poloniex';
      main.tradeId = null;

      alternative.price =  order.usdPrice / order.price;
      alternative.base = order.quote;
      alternative.amount = this.netPnl / (order.usdPrice / order.price);
      alternative.usdPrice = order.usdPrice / order.price
      alternative.dateTime =  order.dateTime;
      alternative.quote = 'USD';
      alternative.userId = order.userId;
      alternative.type = 'spot';
      alternative.fee = 0.0;
      alternative.feeCurrency = 'USD';
      alternative.exchange = 'Poloniex';
      alternative.tradeId = null;
    } else if (this.netPnl > 0 && this.quote !== 'USD'){
      // If positive pnl
      main.dateTime = order.dateTime;
      main.price = order.usdPrice/order.price;
      main.usdPrice = order.usdPrice/order.price;
      main.base = order.quote;
      main.quote = 'USD';
      main.userId = order.userId;
      main.type = 'spot';
      main.fee = 0.0;
      main.feeCurrency = 'USD';
      main.exchange = 'Poloniex';
      main.amount = this.netPnl/(order.usdPrice/order.price);
      main.tradeId = null;

      alternative.type = null;
    } else {
      return;
    }

    // Handle collater reduction type
    this.compensationTrades.push(main);
    this.compensationTrades.push(alternative);
  }
  /*
  buildCompensationTrade(order) {
    if (this.netPnl > 0 && this.quote !== 'USD') {
      this.compensationTrades.push({ 
        'dateTime' : order.dateTime,
        'price' : order.usdPrice/order.price,
        'usdPrice' : order.usdPrice/order.price,
        'base' : order.quote,
        'quote' : 'USD',
        'userId' : order.userId,
        'type' : 'spot',
        'fee' : 0.0,
        'feeCurrency' : 'USD',
        'exchange' : 'Poloniex',
        'amount' : this.netPnl/(order.usdPrice/order.price),
        'tradeId' : null,
      });
    }
  }
  */

  flipCompensation() {
    const main = this.compensationTrades[0];
    const alternative = this.compensationTrades[1];
    this.compensationTrades = [alternative, main];
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

  format() {
    return {
      action: 'Order',
      dateTime: this.dateTime,
      base: this.base,
      quote: this.quote,
      amount: this.amount,
      price: this.price,
      type: this.type
    };
  }

  integrate(trade) {
    this.price = (this.price*this.amount + trade.price*trade.amount)/(this.amount + trade.amount);
    this.amount = this.amount + trade.amount;
    this.fee = this.fee + trade.fee;
    this.trades.push(trade);
  }
}
