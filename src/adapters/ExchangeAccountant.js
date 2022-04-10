import Map from '../utils/Map';

export default class ExchangeAccountant {
  constructor() {
    this.map  = new Map();      
    this.map.insert('USD', 0);
  }

  handlePosition(position) {
    if (position.compensationTrades.length === 0) {
      // WIll always be positive because always profitable pnl
      this.updateCurrency('USD', position.pnl);
    } else {
      // Check if main compensation trade needs to be flipped
      const mainCompensation = position.compensationTrades[0];
      const remainingBalance = this.getBalance(mainCompensation.base);
      if (mainCompensation.amount > remainingBalance) {
        position.flipCompensation();
      }
      const trade = position.compensationTrades[0];
      this.updateCurrency(trade.base, trade.amount);
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
