import moment from 'moment';

import { FtxClient } from '../clients/FTX';
var client;

export async function processFtxData(data, userId, userClient) {
  client = userClient;
  var trades = [];

  for (let line of data) {
    let trade = { 
      userId: userId,
      exchange: 'ftx',
    };
     
    if (line['future']) {
      trade.type = 'future basis'
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
  console.log(orders);
  //orders = await mapMarginOrders(orders);
  //var positions = await buildPositions(orders, userId);
  return orders;
}

async function buildOrders(trades, userId) {
  var orders = [];
  var first = trades.shift();
  var order = new Order(first, userId);

  for (let trade of trades) {
    if (trade.orderId === order.orderId) order.appendTrade(trade);
    else {
      await order.fixFee();
      order.roundValues();
      orders.push(order);
      order = new Order(trade, userId);
    }
  }

  return orders;
}

async function buildPositions(orders, userId) {
  var positions = [];
  var router = new PositionRouter(userId);

  for (let order of orders) {
    console.log(order.dateTime);
    console.log(order.base + '/' + order.quote + ' ' + order.amount);
    if (order.type === 'spot' || order.type === 'margin') continue;
    let position = router.route(order);
    if (position.isComplete()) {
      //await position.calcFunding();
      positions.push(position);
      router.finalize(position);
    } else {
      let splitOrder = position.handleOrder(order);
      if (splitOrder) orders.unshift(splitOrder);
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
  }
}

class Position {
  
  constructor(userId) {
    this.userId = userId;
    this.basisTrades = [];
    this.basisFee = 0.0;
    this.fundingFee = 0.0;
    this.fundingFeeCurrency = 'USD';
    this.pnl = 0.0;
    this.outstanding = 0.0;
    this.avgEntryPrice = 0.0;
    this.closePrice = 0.0;
    this.dateOpen = null;
    this.dateClose = null;
    this.base = null;
    this.quote = null;
    this.side = 'long';
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
    var splitOrder = null;

    if (this.isEmpty()) {
      // initialize
      console.log('initialize');
      //this.print();
      this.dateOpen = order.dateTime;
      this.base = order.base;
      this.quote = order.quote;
      if (this.amount < 0) this.side = 'short';
    } 
    else if (
      (this.side = 'long' && (this.outstanding - order.amount < 0)) ||
      (this.side = 'short' && (this.outstanding + order.amount > 0))
    ) {
      console.log('split');
      //this.print();
      console.log(order.base + '/' + order.quote + ' ' + order.amount);
      //handle closing corner case
      var [ orderLeft, orderRight ] = order.split(this.outstanding);
      splitOrder = orderRight;
      order = orderLeft;
    } 

    this.outstanding += order.amount;
    this.avgEntryPrice = 
      this.avgEntryPrice*this.amount + order.price*order.amount / (this.amount + order.amount);
    this.closePrice = order.price;
    this.basisTrades.push(order);
    this.basisFee += order.fee;
    this.dateClose = order.dateTime;

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
    console.log(fundingPayments);
    for (let payment of fundingPayments) this.fundingFee += payment;
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
  }

  appendTrade(trade) {
    var prevAmount = this.amount;
    this.amount += trade.amount;
    this.price = Math.abs((this.price * prevAmount) + (trade.price * trade.amount)) / Math.abs(prevAmount + trade.amount);
    this.trades.push(trade);
  }

  roundValues() {
    this.amount = Math.round(this.amount*100)/100;
    this.price = Math.round(this.price*100)/100;
    this.fee = Math.round(this.fee*100)/100;
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
        type: 'futures basis split',
        userId: this.userId,
        trades: this.trades
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
        type: 'futures basis split',
        userId: this.userId,
        trades: this.trades
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
