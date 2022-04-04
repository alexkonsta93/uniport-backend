import moment from 'moment';

export default class KrakenFuturesAdapter {
  constructor(userId) {
    this.userId = userId;
  }

  async processApiData() {}

  processCsvData(lines) {
    lines = lines.reverse();
    var validTypes = ['funding rate change', 'futures trade', 'futures liquidation'];
    var positions = [];
    var router = new PositionRouter(this.userId);

    const dateToCheck = moment.utc('2020-03-29 23:07:09')
    for (let line of lines) {
      // parse Date as UTC
      line.dateTime = moment.utc(line.dateTime);

      let position = router.route(line);
      if (validTypes.includes(line.type)) {
        position.handleLine(line);
      }

      if (position.isComplete()) {
        // Check for position complete and finalize
        if (
          line.dateTime.isAfter(dateToCheck) &&
          line.symbol.slice(0, 2) === 'pi'
        ) {
          continue;
        }

        //position.generatePnl();
        positions.push(position);
        router.finalize(position);
      }
    }

    return {
      positions: positions
    };
  }
}

class PositionRouter {

  constructor(userId) {
    this.userId = userId;
    this.positions = {};
  }

  route(line) {
    var position;
    var pair = line.account.slice(2).split(':');
    var base = pair[0] === 'xbt' ? 'btc' : pair[0];
    var quote = pair[1] === 'xbt' ? 'btc' : pair[1];
    var market = base + '/' + quote;
    if (!this.positions[market]) {
      position = new Position(this.userId);
      this.positions[market] = position;
    } else {
      position = this.positions[market];
    }
    return position;
  }

  finalize(position) {
    var market = position.base + '/' + position.quote;
    this.positions[market] = new Position(this.userId);
  }
}

class Position {
  constructor(userId) {
    this.collateralType = 'crypto';
    this.userId = userId;
    this.basisTrades = [];
    this.basisFee = 0.0;
    this.fundingFee = 0.0;
    this.pnl = 0.0;
    this.outstanding = 0.0;
    this.basisFeeCurrency = 'USD';
    this.fundingTrades = [];
    this.compensationTrades = [];
    this.outstanding = 0.0;
    this.openPrice = 0.0;
    this.closePrice = 0.0;
    this.dateOpen = null;
    this.dateClose = null;
    this.base = null;
    this.quote = null;
    this.exchange = 'Kraken Futures';
    this.type = 'future'
  }

  isComplete() {
    return !this.isEmpty() && this.outstanding == 0.0;
  }

  isEmpty() {
    return this.basisTrades.length == 0;
  }

  handleLine(line) {
    if (this.isEmpty()) {
      let pair = line.account.slice(2).split(':');
      this.base = pair[0];
      this.quote = pair[1];
      this.fundingFeeCurrency = pair[0].toUpperCase();
      if (this.base === 'xbt') this.base = 'btc';
      if (this.quote === 'xbt') this.quote = 'btc';
      this.dateOpen = line.dateTime;
    }

    if (line.symbol.slice(0, 2) === 'pi') {
      this.handleBasisTrade(line);
    } else {
      this.handleFundingTrade(line);
    }

    if (this.isComplete()) {
      this.dateClose = line.dateTime;
    }
  }

  handleBasisTrade(line) {
    this.createBasisTrade(line);

    this.outstanding = parseFloat(line['new balance']);
    this.openPrice = parseFloat(line['new average entry price']);
    this.closePrice = parseFloat(line['trade price'])
  }

  createBasisTrade(line) {
    const price = parseFloat(line['trade price']);
    const trade = {
      tradeId: line.uid,
      dateTime: line.dateTime,
      amount: parseFloat(line.change) / price,
      price: price,
      type: 'future-basis',
      exchange: this.exchange,
      base: this.base,
      quote: this.quote,
      userId: this.userId
    }
    this.basisTrades.push(trade);
  }

  handleFundingTrade(line) {
    var funding = parseFloat(line['realized funding']);
    var pnl = parseFloat(line['realized pnl']);
    var price = parseFloat(line['trade price']);
    var fee = parseFloat(line['fee']);

    if (funding && funding != 0.0) {
      this.fundingFee -= funding;
      this.createFuturesFundingTrade(line);
    }

    // if position open or close trade
    if (line.type !== 'funding rate change') {
      this.basisFee += fee * price;
    }

    // if line is a position close trade
    if (pnl && pnl != 0.0) {
      this.pnl += pnl * price;

      // add compensative exchange trade to Trade db
      this.createCompensationTrade(line);
      //console.log('created compensation trade');
    }
  }

  createCompensationTrade(line) {
    var trade = {
      exchangeTradeId: line.uid,
      dateTime: line.dateTime,
      quote: this.quote,
      base: this.base,
      price: parseFloat(line['trade price']),
      amount: parseFloat(line['realized pnl']),
      exchange: this.exchange,
      type: 'future-pnl',	
      comment: 'Compensative trade for futures position',
      userId: this.userId
    };
    this.compensationTrades.push(trade);
  }

  createFuturesFundingTrade(line) {
    var amount = parseFloat(line['realized funding']);
    if (isNaN(amount)) amount = 0;
    var price = parseFloat(line['funding rate']);
    if (isNaN(price)) price = 0;
    var trade = {
      exchangeTradeId: line.uid,
      dateTime: line.dateTime,
      quote: this.quote,
      base: this.base,
      amount: -amount,
      price: price,
      type: 'future-funding',	
      exchange: this.exchange,
      userId: this.userId
    };
    this.fundingTrades.push(trade);
  }
}

