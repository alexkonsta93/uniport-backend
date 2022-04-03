import DatePriceMap from '../ohlcv/date-price-map'; 
import moment from 'moment';

export default class PoloniexAdapter {
  constructor(userId) {
    this.userId = userId;
    this.btcHistory = new DatePriceMap("/home/alexandros/Projects/uniport/uniport-backend/src/ohlc/daily_BTCUSD.csv");
    this.ethHistory = new DatePriceMap("/home/alexandros/Projects/uniport/uniport-backend/src/ohlc/daily_ETHUSD.csv")
  }

  async processCsvData(lines) {
    lines = lines.reverse();

    for (let line of lines) {
      switch (line.Category) {
        case 'Exchange': 
          handleExchangeTrade(line);
          break;
        case 'Margin trade': 
          handleMarginTrade(line);
          break;
        case 'Settlement':
          handleSettleMentTrade(line);
          break;
        default: throw Error('Unrecognized line');
    }

    
  }

  function handleExchangeTrade(line) {
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

    const fee = Number(line['Fee Total']) * priceUSD;
    
    trade.type = 'spot';


    let usdPrice = price;
    if (trade.quote !== 'USD') {
      switch (trade.quote) {
        case 'ETH': {
          const ethPrice = this.ethHistory.getValue(trade.dateTime);
          priceUSD = price * ethPrice;
          break;
        }
        case 'BTC': {
          const btcPrice = this.btcHistory.getValue(trade.dateTime);
          priceUSD = price * btcPrice;
          break;
        }
        default: {
          throw Error(`No historical data for ${trade.quote}`);
        }
      }
    }
    trade.usdPrice = usdPrice;
    trade.feeCurrency = 'USD';

    console.log(trade);
      
  };

  function handleMarginTrade(line) {};
  function handleSettleMentTrade(line) {};

}
