import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';
import Map from '../utils/Map';
import Papa from 'papaparse';
import fs from 'fs';

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
  }

  processCsvData() {
    let lines = this.readTradesFile();
    lines = lines.reverse();
    const orders = this.buildOrders(lines);

    console.log(orders);
  }

  readTradesFile() {
    const tradesFile = "/home/alexandros/Projects/uniport/uniport-backend/src/adapters/alexkonsta93_trades_FROM_Sat-Mar-21-2015_TO_Mon-Apr-04-2022_ON_2022-04-04T21-19-14.701Z.csv";
    const lines = [];
    try {
      const data = fs.readFileSync(tradesFile, 'utf-8');
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
    this.exchange = 'Bitfinex';
    this.type = 'margin'
  }

  /*
   * Checks if positiona has been initiateded
   *
   * @return boolean
   */
  isEmpty() {
    return this.basisTrades.length === 0; 
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
