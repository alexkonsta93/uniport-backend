import Map from '../utils/Map';

export default class ExchangeAccountant {
  constructor() {
    this.map  = new Map();      
    this.map.insert('USD', 0.0);
    this.map.insert('BTC', 0.0);
    this.map.insert('ETH', 0.0);
    this.maxBtc = 77.19;
    this.maxEth = 2059.44;
  }

  handlePositionPoloniex(position) {
    const main = position.compensationTrades[0]; 
    const alt = position.compensationTrades[1];

    const dateClose = position.dateClose.format();
    /*
    if (dateClose === '2017-12-07T11:33:15Z') {
      console.log('here1');
      main.amount = -this.getBalance(main.base);
      this.updateCurrency(main.base, main.amount);
      alt.amount = (alt.amount*alt.price - main.amount*main.price)/alt.price;
      this.updateCurrency(alt.base, alt.amount);
      return;
    }
    */
    /*
    if (dateClose === '2016-07-26T10:09:10Z') {
      console.log('here2');
      this.updateCurrency(alt.base, alt.amount);
      position.compensationTrades = [alt];
      return;

    }
    */
    if (dateClose === '2018-06-22T07:06:02Z' ||
        dateClose === '2018-04-27T21:01:48Z' ||
        dateClose === '2018-06-08T14:08:43Z') {
      //console.log('here');
      this.updateCurrency(alt.base, alt.amount);
      position.compensationTrades = [alt];
      return;
    }
    if (alt.type && position.compensationTrades.length == 2) {
      const main = position.compensationTrades[0]; 
      const alt = position.compensationTrades[1];
      const remainingMain = this.getBalance(main.base) * main.price;
      const remainingAlt = this.getBalance(alt.base) * alt.price;
      if (remainingMain > remainingAlt) {
        this.updateCurrency(main.base, main.amount);
        position.compensationTrades = [main];
      } else {
        this.updateCurrency(alt.base, alt.amount);
        position.compensationTrades = [alt];
      }
    } else {
      this.updateCurrency(main.base, main.amount);
    }
  }

  handlePosition(position) {
    for (let settlement of position.compensationTrades) {
      this.updateCurrency(settlement.base, settlement.amount);
    }
  }

  handlePositionPoloniex2(position) {
    const main = position.compensationTrades[0]; 
    const alt = position.compensationTrades[1];
    if (alt.type && position.compensationTrades.length == 2) {
      if (this.maxBtc === 0) {
        console.log('here1');
        this.updateCurrency(main.base, main.amount);
        this.maxEth += main.amount;
        position.compensationTrades = [main];
      } else if (this.maxBtc < -alt.amount) {
        console.log('here2');
        alt.amount = this.maxBtc;
        this.updateCurrency(alt.base, alt.amount);
        this.maxBtc = 0;
        main.amount = (main.amount*main.price - alt.amount*alt.price)/main.price;
        this.updateCurrency(main.base, main.amount);
        this.maxEth += main.amount;
        this.compensationTrades = [main, alt];
      } else {
        console.log('here3', this.maxBtc);
        this.updateCurrency(alt.base, alt.amount);
        position.compensationTrades = [alt];
        this.maxBtc += alt.amount;
      }
    } else {
      this.updateCurrency(main.base, main.amount);
      console.log('here4');
    }
  }

  handlePositionBitfinex(position) {
    const [usdTrade, baseTrade, quoteTrade] = [...position.compensationTrades];

    
    if (position.dateClose.format() === '2018-04-24T05:59:27Z') {
      const [btcTrade, ethTrade] = [...position.compensationTrades];
      this.updateCurrency('BTC', btcTrade.amount);
      this.updateCurrency('ETH', ethTrade.amount);
      return;
    }
    if (position.netPnl < 0) {
      const usdBalance = this.getBalance('USD');
      const baseUsdBalance = this.getBalance(baseTrade.base) * baseTrade.price;
      const quoteUsdBalance = this.getBalance(quoteTrade.base) * quoteTrade.price;

      // Choose whichever has most remaining USD balance
      if (usdBalance >= baseUsdBalance && usdBalance >= quoteUsdBalance) {
        //console.log('here1');
        // USD trade
        this.updateCurrency('USD', usdTrade.amount);
        position.compensationTrades = [usdTrade];
      } else if (baseUsdBalance >= usdBalance && baseUsdBalance >= quoteUsdBalance) {
        //console.log('here2');
        // base trade
        this.updateCurrency(baseTrade.base, baseTrade.amount);
        position.compensationTrades = [baseTrade];
      } else {
        //console.log('here3');
        // quote trade
        this.updateCurrency(quoteTrade.base, quoteTrade.amount);
        position.compensationTrades = [quoteTrade];
      }
      
    } else {
      if (position.quote === 'USD') {
        this.updateCurrency('USD', usdTrade.amount);
        position.compensationTrades = [usdTrade];
      } else {
        this.updateCurrency(quoteTrade.base, quoteTrade.amount);
        position.compensationTrades = [quoteTrade];
      }
    }
  }

  handleTrade(trade) {
    const base = trade.base;
    this.updateCurrency(base, trade.amount);
    
    if (trade.type !== 'settlement') {
      const quote = trade.quote;
      this.updateCurrency(quote, -trade.amount * trade.price);
    }
  }

  handleTransfer(transfer) {
    this.updateCurrency(transfer.currency, transfer.amount);
  }

  updateCurrency(currency, amount) {
    if (this.map.contains(currency)) {
      let value = this.map.getValue(currency);
      value += amount;
      this.map.replace(currency, value);
    } else {
      this.map.insert(currency, amount);
    }
  }

  getBalances() {
    return this.map.getKeyValuePairsArray();
  }

  getBalance(currency) {
    return this.map.getValue(currency);
  }
}
