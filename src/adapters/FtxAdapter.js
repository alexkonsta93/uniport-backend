import moment from 'moment';

import { FtxClient } from '../clients/FtxClient';
var client;

export async function processFtxApiData(userId, userClient) {
  client = userClient;
  var trades = [];
  var data = await client.getFills();

  for (let line of data) {
    let trade = { 
      userId: userId,
      exchange: 'ftx',
    };

    if (line['future']) {
      trade.type = 'future-basis'
      let baseQuote = line['market'].split('-');
      trade.base = baseQuote[0]; 
      trade.quote = baseQuote[1];
    } else {
      trade.type = 'spot';
      trade.base = line['baseCurrency'];
      trade.quote = line['quoteCurrency'];
    }

    trade.price = line['price'];
    trade.feeCurrency = line['feeCurrency'];
    trade.fee = line['fee'];
    trade.amount = line['size'];
    if (line['side'] === 'sell') trade.amount = -trade.amount;
    trade.dateTime = moment.utc(line['time']);
    trade.orderId = line['orderId'];
    trade.tradeId = line['tradeId'];

    trades.push(trade);
  }

  var orders = await buildOrders(trades, userId);
  orders = orders.reverse();
  var positions = await buildPositions(orders, userId);

  return {
    orders: orders,
    positions: positions
  };
}

async function buildOrders(trades, userId) {
  var orders = [];
  var first = trades.shift();
  var order = new Order(first, userId);

  for (let trade of trades) {
    if (trade.orderId == order.orderId) {
      order.appendTrade(trade);
    } else {
      await order.fixFee();
      order.roundValues();
      orders.push(order);
      order = new Order(trade, userId);
    }
  }
  orders.push(order);
  return orders;
}

async function buildPositions(orders, userId) {
  var positions = [];
  var router = new PositionRouter(userId);

  for (let i = 0; i < orders.length; i++) {
    let order = orders[i];

    if (order.type === 'spot' || order.type === 'margin') continue;
    let position = router.route(order);
    if (position.isComplete()) {
      await position.calcFunding();
      positions.push(position);
      position = router.finalize(position);
      position.handleOrder(order);
    } else {
      let splitOrder = position.handleOrder(order);
      if (splitOrder) {
        orders[i] = splitOrder;
        i -= 1;
      }
    }
  }

  return positions;
}

class PositionRouter {

  constructor(userId) {
    this.userId = userId;
    this.positions = {};
  }

  route(order) {
    var position;
    var market = order.base + '/' + order.quote;
    if (!this.positions[market]) {
      position = new Position(order.userId);
      this.positions[market] = position;
    } else {
      position = this.positions[market];
    }
    return position;
  }

  finalize(position) {
    var market = position.base + '/' + position.quote;
    this.positions[market] = new Position(position.userId);
    return this.positions[market];
  }
}

class Position {

  constructor(userId) {
    this.collateralType = 'cash';
    this.userId = userId;
    this.basisTrades = [];
    this.basisFee = 0.0;
    this.fundingFee = 0.0;
    this.fundingFeeCurrency = 'USD';
    this.pnl = 0.0;
    this.outstanding = 0.0;
    //this.avgEntryPrice = 0.0;
    this.openPrice = 0.0;
    this.closePrice = 0.0;
    this.dateOpen = null;
    this.dateClose = null;
    this.base = null;
    this.quote = null;
    this.side = 'long';
    this.exchange = 'ftx';
    this.type = 'future';
  }

  print() {
    console.log(this.base);
    console.log(this.quote);
    console.log(this.outstanding);
  }

  isEmpty() {
    return this.basisTrades.length == 0;
  }

  isComplete() {
    return !this.isEmpty() && this.outstanding == 0.0;
  }

  handleOrder(order) {
    //console.log(order.base + '/' + order.quote + ' ' + order.amount + ' ' + order.price);
    var splitOrder = null;

    if (this.isEmpty()) {
      // initialize
      this.dateOpen = order.dateTime;
      this.base = order.base;
      this.quote = order.quote;
      if (order.amount < 0) this.side = 'short';
      this.openPrice = order.price;
    } 
    else if (
      (this.side === 'long' && (this.outstanding + order.amount < 0)) ||
      (this.side === 'short' && (this.outstanding + order.amount > 0))
    ) {
      //handle closing corner case
      var [ orderLeft, orderRight ] = order.split(-this.outstanding);
      splitOrder = orderRight;
      order = orderLeft;
    } 
    this.outstanding += order.amount;
    this.closePrice = order.price;
    this.basisTrades.push(order);
    this.basisFee += order.fee;
    this.dateClose = order.dateTime;
    this.pnl -= order.amount * order.price;

    return splitOrder;
  }

  async calcFunding() {
    if (!this.dateOpen || !this.dateClose) {
      throw Error('Position not initialized');
    }

    var fundingPayments = await client.getFundingPayments(
      this.dateOpen,
      this.dateClose,
      this.base + '-' + this.quote
    );
    for (let obj of fundingPayments) this.fundingFee += obj.payment;
  }

}

class Order {

  constructor(trade, userId) {
    this.orderId = trade.orderId;
    this.exchange = trade.exchange;
    this.base = trade.base;
    this.quote = trade.quote;
    this.amount = trade.amount;
    this.price = trade.price;
    this.dateTime = trade.dateTime;
    this.feeCurrency = trade.feeCurrency;
    this.fee = trade.fee;
    this.type = trade.type;
    this.userId = userId;
    this.trades = [trade];
    this.isSplit = false;
  }

  appendTrade(trade) {
    var prevAmount = this.amount;
    this.amount += trade.amount;
    this.price = Math.abs((this.price * prevAmount) + (trade.price * trade.amount)) / Math.abs(prevAmount + trade.amount);
    this.trades.push(trade);
  }

  roundValues() {
    this.amount = Math.round(this.amount*10000)/10000;
    this.price = Math.round(this.price*10000)/10000;
    this.fee = Math.round(this.fee*10000)/10000;
  }

  split(amount) {
    var orderLeft = {
      orderId: this.orderId,
      exchange: this.exchange,
      base: this.base,
      quote: this.quote,
      amount: amount,
      price: this.price,
      dateTime: this.dateTime,
      feeCurrency: this.feeCurrency,
      fee: this.fee,
      type: this.type,
      userId: this.userId,
      trades: this.trades,
      isSplit: true,
    };
    var orderRight = {
      orderId: this.orderId,
      exchange: this.exchange,
      base: this.base,
      quote: this.quote,
      amount: this.amount - amount,
      price: this.price,
      dateTime: this.dateTime,
      feeCurrency: this.feeCurrency,
      fee: this.fee,
      type: this.type,
      userId: this.userId,
      trades: this.trades,
      isSplit: true
    };
    return [orderLeft, orderRight];
  }

  async fixFee() {
    if (this.feeCurrency !== 'USD' && this.quote !== 'USD') {
      let price = await client.getHistoricalPrices(this.feeCurrency + '/USD', this.dateTime);
      this.fee = price * this.fee;
      this.feeCurrency = 'USD';
    } else if (this.feeCurrency !== 'USD') {
      this.fee = this.price * this.fee;
      this.feeCurrency = 'USD';
    } else {
      return;
    }
  }

}
