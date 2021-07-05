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
      trade.type = 'future'
      let baseQuote = line['market'].split('-');
      trade.base = baseQuote[0]; 
      trade.quote = baseQuote[1];
    } else {
      trade.type = 'exchange';
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
  //orders = await mapMarginOrders(orders);
  var positions = await buildPositions(orders, userId);
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
      order = new Order(trade);
    }
  }

  return orders;
}

async function buildPositions(orders, userId) {
  await client.getFundingPayments();
  var positions = [];
  /*
  var router = new PositionRouter(userId);

  for (let order of orders) {
    let position = router.route(order);
    if (position.isComplete()) {
      await position.handleFunding();
      positions.push(position);
      router.finalize(position);
    } else {
      position.handleOrder(order);
    }
  }
  */
  return positions;
}

class PositionRouter {

  constructor(userId, positions = []) {
    this.userId = userId;
    this.positions = positions;
  }

  route(order) {
    for (let position of this.positions) {
      if (
        position.base === order.base &&
        position.quote === order.quote
      ) return position;

      position = new Position(this.userId);
      this.positions.push(position);
      return position;
    }
  }

  finalize(position) {
    this.positions = this.positions.filter(item => item !== position);
  }
}

async function mapMarginOrders(orders) {
  let history = await client.getFundingPayments();
  console.log(history);
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
  }

  isEmpty() {
    return this.basisTrades.length == 0;
  }

  isComplete() {
    return !this.isEmpty() && this.outstanding == 0.0;
  }

  handleOrder(order) {

    if (this.isEmpty()) {
      // initialized
      this.dateOpen = order.dateTime;
      this.base = order.basis;
      this.quote = order.quote;
    } else if (Math.abs(this.outstanding) < Math.abs(order.amount)) {
      //handle closing corner case
      let [ order1, order2 ] = order.split(this.outstanding);
      order = order1;
      this.dateClose = order.dateTime;
    } 

    this.outstanding += order.amount;
    this.avgEntryPrice = 
      this.avgEntryPrice*this.amount + order.price*order.amount / (this.amount + order.amount);
    this.basisTrades.push(order);
    this.basisFee += order.fee;
    this.dateClose = order.dateTime;
  }

  async hanldeFunding() {
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

  checkMargin() {
  }

}
