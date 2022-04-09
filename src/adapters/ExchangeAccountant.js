import Map from '../utils/Map';

export default class ExchangeAccountant {
  constructor() {
    this.map  = new Map();      
    this.map.insert('USD', 0);
  }

  handlePosition(position) {
    if (position.compensationTrades.length === 0) {
      this.updateCurrency('USD', position.pnl);
    } else {
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

  getAccounts() {
    return this.map.getKeyValuePairsArray();
  }
}
