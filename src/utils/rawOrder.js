class RawOrder {
  constructor(trade, userId) {
    this.properties = {
      ...trade,
      userId: userId,
      trades: []
    };
  }

  appendTrade(trade) {
    var prevAmount = this.properties.amount;
    this.properties.amount += trade.amount;
    this.properties.price = Math.abs((this.properties.price * prevAmount) + (trade.price * trade.amount)) / Math.abs(prevAmount + trade.amount);
    this.properties.trades.push(trade);
  }

}

