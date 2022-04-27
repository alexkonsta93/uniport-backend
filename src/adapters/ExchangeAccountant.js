import Map from '../utils/Map';

export default class ExchangeAccountant {
  constructor() {
    this.map  = new Map();      
    this.map.insert('USD', 0);
  }

  handlePosition(position) {
    //console.log('position', position);
    if (position.compensationTrades.length === 0) {
      // Will always be positive because always profitable pnl
      this.updateCurrency('USD', position.netPnl);
      position.compensationTrades = [];
    } else if (position.compensationTrades.length === 1) {
      const remainingUSD = this.getBalance('USD');
      if (position.netPnl < 0){
        if (remainingUSD > -position.netPnl) {
          console.log('here0.1');
          this.updateCurrency('USD', position.netPnl);
          position.compensationTrades = [];
        } else {
          console.log('here0.2');
          this.updateCurrency('USD', remainingUSD);
          const trade = position.compensationTrades[0];
          trade.amount -= remainingUSD/trade.usdPrice;
        }
      } 
    } else {
      const main = position.compensationTrades[0];
      const alt = position.compensationTrades[1];
      const remainingMain = this.getBalance(main.base);
      const remainingUSD = this.getBalance('USD');
      // Check if main compensation trade needs to be flipped in negative pnl scenario
      if (remainingUSD > 1) {
        if (remainingUSD > -position.netPnl) {
          this.updateCurrency('USD', position.netPnl);
          position.compensationTrades = [];
        } else {
          this.updateCurrency('USD', remainingUSD);
          main.amount -= remainingUSD/main.usdPrice;
          alt.amount -= remainingUSD/alt.usdPrice;
        }
      }
      /*
      if (position.pnl < 0) {
        if (this.getBalancek)
        if (this.getBalance(main.base))
        if (this.getBalance(main.base) < 0 && this.getBalance()) {}
        if (mainCompensation.base === 'ETH' && remainingBalance < -5000) {
          position.flipCompensation();
        } else if (mainCompensation.base === 'BTC' && remainingBalance < -25) {
          position.flipCompensation();
        }
        if (remainingBalance < 0 || Math.abs(mainCompensation.amount) > Math.abs(remainingBalance)) {
          position.flipCompensation();
        } 
        else if (remainingBalance < 0) {
          position.flipCompensation();
        }
      }
      const trade = position.compensationTrades[0];
      this.updateCurrency(trade.base, trade.amount);
      */
    }
    if (position.compensationTrades.length == 2) {
      const main = position.compensationTrades[0]; 
      const alt = position.compensationTrades[1];
      const remainingMain = this.getBalance(main.base);
      if (remainingMain < -position.netPnl/main.usdPrice) {
        console.log('here1');
        main.amount = -remainingMain;
        this.updateCurrency(main.base, main.amount);
        alt.amount = (alt.amount*alt.usdPrice + main.amount*main.usdPrice)/alt.usdPrice;
        this.updateCurrency(alt.base, alt.amount);
      } else {
        console.log('here2');
        position.compensationTrades = [main];
        this.updateCurrency(main.base, main.amount);
      }
    } else if (position.compensationTrades.length == 1) {
      console.log('here3');
      const main = position.compensationTrades[0]; 
      this.updateCurrency(main.base, main.amount);
    }
  }

  handleTrade(trade) {
    const base = trade.base;
    this.updateCurrency(base, trade.amount);
    
    const quote = trade.quote;
    this.updateCurrency(quote, -trade.amount * trade.price);
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
