import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';
import MapOneToMany from '../utils/MapOneToMany';
import Map from '../utils/Map';
import Papa from 'papaparse';
import fs from 'fs';
import OrderModel from '../resources/order/order.model';
import PositionModel from '../resources/position/position.model';
import ExchangeAccountant from './ExchangeAccountant';
import SortedMap from '../utils/SortedMap';


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
    this.ledger2 = new MapOneToMany();
    this.accountant = new ExchangeAccountant();
    this.actions = new MapOneToMany();
    this.positionCloses = [];
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

  processLocalData() {
    // Ledger file
    let lines = this.readLedgerFile();
    lines = lines.reverse();
    this.readLedgerFile(lines);
    this.processLedgerLines(lines);
    for (let line of lines) {
      const date = this.buildDate(line);
      this.ledger.insert(date, line);
    }

    // Trades file
    lines = this.readTradesFile();
    lines = lines.reverse();
    const orders = this.buildOrders(lines);

    this.categorizeOrders(orders);
    for (let order of orders) {
      if (order.type === 'spot') {
        this.spotOrders.push(order);
        this.actions.insert(order.dateTime.format(), order);
      } else {
        this.handleMarginOrder(order);
      }
    }

    // Process ledger trades
    const dateToPositionsMap = new Map();
    for (let position of this.positions) {
      const dateOpen = this.stripTime(moment(position.dateOpen));
      const dateClose = this.stripTime(moment(position.dateClose));
      let date = dateOpen;
      while (date <= dateClose) {
        dateToPositionsMap.insert(date.format(), position);
        date = date.add(1, 'days');
      }
    }
    for (let order of this.ledger2.getAllValues()) {
      if (order.type === 'position funding') {
        let dateTimeStripped = this.stripTime(moment(order.dateTime));
        let position = dateToPositionsMap.getValue(dateTimeStripped.format());
        if (position === null) {
          dateTimeStripped = dateTimeStripped.subtract(1, 'days');
          position = dateToPositionsMap.getValue(dateTimeStripped.format());
        }
        if (position === null) {
          continue;
        }
        // Update funding trades
        position.fundingTrades.push(order);
        // Update funding fee
        if (order.quote !== 'USD') {
          position.fundingFee -= order.amount * order.priceUsd;
        } else {
          position.fundingFee -= order.amount * order.price;
        }
      } else {
        if (order.type === 'settlement') {
          //this.spotOrders.push(order);
          continue;
        } else if (order.type === 'position close') {
          this.positionCloses.push(order);
          continue;
        }
        this.actions.insert(order.dateTime.format(), order);
      }
    }

    // Movements file
    lines = this.readMovementsFile();
    lines = lines.reverse();
    const transfers = this.buildTransfers(lines);
    for (let transfer of transfers) {
      this.actions.insert(transfer.dateTime.format(), transfer); 
    } 
    //console.log(this.actions.getValues());
    for (let action of this.actions.getAllValues()) {
      console.log(action.format());
      if (action.dateOpen) {
        // If position
        action.netPnl -= action.fundingFee;
        this.accountant.handlePositionBitfinex(action);
      } else if (action.price) {
        // If order
        this.accountant.handleTrade(action);
      } else {
        // If transfer
        this.accountant.handleTransfer(action);
      }
      console.log(this.accountant.getBalances());
    }
    
    return {
      'orders': this.spotOrders,
      'positions': this.positions
    };
  }

  stripTime(dateTime) {
    let stripped = dateTime.seconds(0);
    stripped = dateTime.minutes(0);
    stripped = dateTime.hours(0);
    return stripped;
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
    const currentPosition = this.positionRouter.getCurrent(pair);

    currentPosition.handleOrder(order);
    // If complete
    if (currentPosition.isComplete()) {
      this.positions.push(currentPosition);
      this.actions.insert(currentPosition.dateClose.format(), currentPosition);
      this.positionRouter.finalize(pair); 
    }

  }

  readTradesFile() {
    const tradesFile = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Bitfinex/alexkonsta93_trades_FROM_Sat-Mar-21-2015_TO_Mon-Apr-04-2022_ON_2022-04-04T21-19-14.701Z.csv";
    return this.readFile(tradesFile);
  }

  readLedgerFile() {
    const ledgerFile = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Bitfinex/alexkonsta93_ledgers_FROM_Sat-Mar-21-2015_TO_Mon-Apr-04-2022_ON_2022-04-04T21-20-36.448Z.csv";
    return this.readFile(ledgerFile);
  }

  readMovementsFile() {
    const movementsFile = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/Bitfinex/alexkonsta93_movements_FROM_Sat-Mar-21-2015_TO_Mon-Apr-04-2022_ON_2022-04-04T21-20-41.578Z.csv";
    return this.readFile(movementsFile);
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

  buildTransfers(lines) {
    const transfers = [];

    for (let line of lines) {
      if (line['STATUS'] !== 'COMPLETED') {
        continue;
      }
      const transfer = {};
      transfer.dateTime = this.buildDate(line);
      transfer.currency = line['CURRENCY'];
      transfer.amount = this.buildAmount(line);
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

  categorizeOrders(orders) {
    for (let order of orders) {
      const lines = this.ledger.getValuesListGE(order.dateTime);
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

  processLedgerLines(lines) {
    for (let i = 0; i < lines.length - 1; i++) {
      let line = lines[i];
      //console.log(line);
      const description = line['DESCRIPTION'].split(' ');
      if (description[0] === 'Extraordinary') {
        // Bitfinex hack
        let trade = {};
        if (line['CURRENCY'] === 'BTC') {
          const dateTime = this.buildDate(line);
          const btcAmount = this.buildAmount(line);
          const btcPrice = this.btcHistory.getValueLE(dateTime.unix());
          trade = { 
            type: 'loss',
            amount: -btcAmount*btcPrice,
            price: 1/btcPrice,
            quote: line['CURRENCY'],
            base: 'BFX',
            dateTime: dateTime,
            exchange: 'Bitfinex',
            feeCurrency: 'USD', 
            fee: 0,
            tradeIds: null,
            orderId: line['#'],
            userId: this.userId,
            usdPrice: btcPrice,
          };
        } else {
          const dateTime = this.buildDate(line);
          const ethAmount = this.buildAmount(line);
          const ethPrice = this.ethHistory.getValueLE(dateTime.unix());
          trade = { 
            type: 'loss',
            amount: -ethAmount*ethPrice,
            price: 1/ethPrice,
            quote: line['CURRENCY'],
            base: 'BFX',
            dateTime: dateTime,
            exchange: 'Bitfinex',
            feeCurrency: 'USD', 
            fee: 0,
            tradeIds: null,
            orderId: line['#'],
            userId: this.userId,
            usdPrice: ethPrice,
          };
        }
        const order = new Order(trade); 
        i += 1; // Skip next line
        this.ledger2.insert(order.dateTime, order);
      } else if (line['WALLET'] === 'margin') {
        if (description[0] === 'Settlement') {
          const trade = {
            type: 'settlement',
            amount: this.buildAmount(line),
            base: line['CURRENCY'],
            tradeIds: null,
            orderId: line['#'],
            dateTime: this.buildDate(line),
            exchange: 'Bitfinex',
            fee: 0,
            feeCurrency: 'USD',
            userId: this.userId,
            price: 1,
            usdPrice: 1,
            quote: 'USD'
          };
          trade.price = parseFloat(description[2]);
          if (trade.base !== 'USD') {
            trade.usdPrice = this.buildUsdPrice(trade);
          }
          const order = new Order(trade);
          i += 1;
          this.ledger2.insert(order.dateTime, order);
        } else if ((description[1] === 'funding' && description[2] === 'cost') ||
                   (description[2] === 'funding' && description[3] === 'cost')) {
          const trade = {
            type: 'position funding',
            amount: this.buildAmount(line),
            quote: line['CURRENCY'],
            base: line['CURRENCY'],
            tradeIds: null,
            orderId: line['#'],
            fee: 0,
            feeCurrency: 'USD',
            userId: this.userId,
            dateTime: this.buildDate(line),
            exchange: 'Bitfinex',
            price : 1,
            usdPrice : 1
          };
          if (trade.base !== 'USD') {
            if (trade.base === 'ZRX') {
              trade.price = 0.8;
            } else {
              trade.price = this.buildUsdPrice(trade);
            }
            trade.usdPrice = trade.price;
            trade.quote = 'USD';
          }
          const order = new Order(trade);
          this.ledger2.insert(order.dateTime, order);
        }

      } else if (description[0] === 'Position' &&
                 description[1] === 'closed') {
        const trade = {
          type: 'position close',
          amount: this.buildAmount(line),
          base: line['CURRENCY'],
          quote: 'USD',
          tradeIds: null,
          orderId: line['#'],
          fee: 0,
          feeCurrency: 'USD',
          userId: this.userId,
          dateTime: this.buildDate(line),
          exchange: 'Bitfinex',
          price: 1,
          usdPrice: 1
        };
        if (trade.base !== 'USD') {
          if (trade.base === 'ZRX') {
            trade.price = 0.8;
          } else {
            trade.price = this.buildUsdPrice(trade);
          }
          const order = new Order(trade);
          this.ledger2.insert(order.dateTime, order);
        }
      } else {
        if (description[0] === 'BFX') {
          const trade = {
            type: 'redemption',
            amount: this.buildAmount(line),
            price: 1,
            base: 'BFX',
            quote: 'USD',
            dateTime: this.buildDate(line),
            exchange: 'Bitfinex',
            feeCurrency: 'USD',
            fee: 0,
            tradeIds: null,
            orderId: line['#'],
            usdPrice: 1,
            userId: this.userId
          };
          const order = new Order(trade);
          i += 1; // Skip next line
          this.ledger2.insert(order.dateTime, order);
        }
      }
    }
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
        if (order.base !== 'USD') {
          order = new OrderModel(order);
          const doc = await order.save();
          compensationTradeIds.push(doc.id);
        }
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

  getAllPairs() {
    return this.map.getKeyValuePairsArray();
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
    this.priceOpen = 0.0;
    this.priceClose = 0.0;
    this.dateOpen = null;
    this.dateClose = null;
    this.base = null;
    this.quote = null;
    this.exchange = 'Bitfinex';
    this.type = 'margin'

    this.max = 0.0;
  }

  format() {
    return {
      action: 'Position',
      dateOpen: this.dateOpen.format(),
      dateClose: this.dateClose.format(),
      base: this.base,
      quote: this.quote,
      netPnl: this.netPnl,
      basisfee: this.basisFee,
      fundingFee: this.fundingFee, 
      compensationTrades: this.compensationTrades
    }
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
    /**
     * For negative pnl, compensation trades array consists
     * of 3 trades
     *
     * 1 - usd compensation trade
     * 2 - base compensation trade
     * 3 - quote compensation trade
    */
    if (order.dateTime.format() === '2018-04-24T05:59:27Z') {
      const btcTrade = {
        dateTime: order.dateTime,
        amount: -5.14,
        base: 'BTC', 
        quote: 'USD',
        price: order.price,
        usdPrice: order.price,
        exchange: order.exchange,
        fee: 0.0,
        feeCurrency: 'USD',
        type: 'settlement',
        tradeId: null,
        userId: this.userId
      }
      const ethTrade = {
        dateTime: order.dateTime,
        amount: -72.1,
        base: 'ETH',
        quote: 'USD',
        price: 640.0,
        usdPrice: 640.0,
        exchange: order.exchange,
        fee: 0.0,
        feeCurrency: 'USD',
        type: 'settlement',
        tradeId: null,
        userId: this.userId
      }
      this.compensationTrades.push(btcTrade, ethTrade);
      return;
    }
    const usdTrade = {
      dateTime: order.dateTime,
      price: 1,
      usdPrice: 1,
      base: 'USD',
      quote: 'USD',
      amount: this.netPnl,
      exchange: this.exchange,
      fee: 0.0,
      feeCurrency : 'USD',
      type: 'settlement',
      tradeId: null,
      userId: this.userId
    };
    
    const baseTrade = { ...usdTrade };
    baseTrade.amount = this.netPnl / order.usdPrice;
    baseTrade.base = order.base;
    baseTrade.usdPrice = order.usdPrice;
    baseTrade.price = order.usdPrice;

    const quoteTrade = { ...usdTrade };
    quoteTrade.base = order.quote;
    quoteTrade.amount = this.netPnl / (order.usdPrice / order.price);
    quoteTrade.usdPrice = order.usdPrice / order.price;
    quoteTrade.usdPrice = order.usdPrice / order.price;


    this.compensationTrades.push(usdTrade, baseTrade, quoteTrade);
    /*
    if (this.netPnl > 0) {
      this.compensationTrades.push(usdTrade, baseTrade, quoteTrade);
    }
    */
  }

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
