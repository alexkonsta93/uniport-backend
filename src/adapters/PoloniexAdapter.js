import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';

export default class PoloniexAdapter {
  constructor(userId) {
    this.userId = userId;
    this.btcHistory = new DatePriceMap('BTC');
    this.btcHistory.load("/home/alexandros/Projects/uniport/uniport-backend/src/ohlcv/daily_BTCUSD.csv");
    this.ethHistory = new DatePriceMap('ETH');
    this.ethHistory.load("/home/alexandros/Projects/uniport/uniport-backend/src/ohlcv/daily_ETHUSD.csv")
  }

  processCsvData(lines) {
    // Reverse for chronological order
    lines = lines.reverse();

    for (let line of lines) {
      switch (line.Category) {
        case 'Exchange': 
          this.handleExchangeTrade(line);
          break;
        case 'Margin trade': 
          this.handleMarginTrade(line);
          break;
        case 'Settlement':
          this.handleSettleMentTrade(line);
          break;
        default: throw Error('Unrecognized line');
      }
    }

  }

  handleExchangeTrade(line) {
    const trade = {};

    trade.dateTime = new Date(line['Date']);
    console.log(trade.dateTime);

    trade.userId = this.userId;
    
    trade.exchange = 'Poloniex';

    const pair = line['Market'].split('/');
    trade.base = pair[0];
    trade.quote = pair[1];

    trade.price = Number(line['Price']);

    const amount = Number(line['Amount']);
    if (line['Type'] === 'Buy') {
      trade.amount = amount;
    } else {
      trade.amount = -amount;
    }

    trade.orderId = line['Order Number'];

    
    trade.type = 'spot';


    let price = trade.price;
    if (trade.quote !== 'USD') {
      const dateTime = moment.utc(trade.dateTime);
      dateTime.set('hour', 0);
      dateTime.set('minute', 0);
      dateTime.set('second', 0);
      dateTime.set('millisecond', 0);

      switch (trade.quote) {
        case 'ETH': {
          const ethPrice = this.ethHistory.getValue(dateTime.format());
          console.log('ethPrice', ethPrice);
          price = price * ethPrice;
          break;
        }
        case 'BTC': {
          const btcPrice = this.btcHistory.getValue(dateTime.format());
          console.log('btcPrice', btcPrice);
          price = price * btcPrice;
          break;
        }
        default: {
          throw Error(`No historical data for ${trade.quote}`);
        }
      }
    }
    trade.usdPrice = price;

    let fee = Number(line['Fee Total']) * trade.usdPrice;
    const feeCurrency = line['Fee Currency'];
    if (feeCurrency === trade.quote) {
      fee = fee / price
    }
    trade.fee = fee;
    trade.feeCurrency = 'USD';

    console.log(trade);
      
  }

  handleMarginTrade(line) {}
  handleSettleMentTrade(line) {}

}
