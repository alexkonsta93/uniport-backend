import moment from 'moment';

import { FtxClient } from '../clients/FTX';

export async function processFtxData(data, userId) {
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

  return await ordersFromTrades(trades, userId);
}

async function ordersFromTrades(trades, userId) {
  var orders = [];
  var first = trades.shift();
  var order = new RawOrder(first, userId);

  for (let trade of trades) {
    if (trade.orderId === order.orderId) order.appendTrade(trade);
    else {
      await order.fixFee();
      order.roundValues();
      orders.push(order);
      order = new RawOrder(trade);
    }
  }

  return orders;
}

class RawOrder {
  constructor(trade, userId) {
    this.orderId = trade.orderId;
    this.exchange = trade.exchange;
    this.quote = trade.quote;
    this.base = trade.base;
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
      let client = new FtxClient();
      let res = await client.getHistoricalPrices(this.feeCurrency + '/USD', this.dateTime);
      let price = (res.data.result[res.data.result.length - 1]).close;
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
