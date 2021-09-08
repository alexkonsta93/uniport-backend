import moment from 'moment';

export class KrakenFuturesAdapter {
  constructor(userId) {
    this.userId = userId;
  }

  processApiData() {}

  processCsvData(lines) {
    var validTypes = ['funding rate change', 'futures trade', 'futures liquidation'];
    var positions = [];
    var router = new PositionRouter(userId);

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
        position = router.finalize(position);
      }
    }

    return {
      positions: positions
    };
  }

  /*
  async processCsvLines(lines) {
    var validTypes = ['funding rate change', 'futures trade', 'futures liquidation'];
    const dateToCheck = moment.utc('2020-03-29 23:07:09')

    var currentEthPosition = new KrakenFuturesPosition();
    var currentBtcPosition = new KrakenFuturesPosition();

    for (let line of lines) {
      // parse Date as UTC
      line.dateTime = moment.utc(line.dateTime);

      // Determine wether Eth or Btc position
      // !!!!
      if (line.account.slice(2, 5) === 'eth') {
        // Handle line
        if (validTypes.includes(line.type)) {
          await currentEthPosition.handleLine(line);
        }

        // Check for position completion and commit
        if (currentEthPosition.isComplete()) {
          if (
            line.dateTime.isAfter(dateToCheck) && 
            line.symbol.slice(0, 2) === 'pi'
          )  {
            continue;
          }
          await commitPosition(currentEthPosition);
          //await commitPnl(currentEthPosition);
          currentEthPosition = new KrakenFuturesPosition();
        }
      } else if (line.account.slice(2, 5) === 'xbt') {
        // Handle line
        if (validTypes.includes(line.type)) {
          // turn 'xbt' to 'btc'
          line.symbol = line.symbol.replace(/xbt/i, 'btc');
          line.account = line.account.replace(/xbt/i, 'btc');
          line.collateral = line.collateral.replace(/XBT/i, 'BTC');
          await currentBtcPosition.handleLine(line);
        }

        // Check for position completion and commit
        if (currentBtcPosition.isComplete()) {
          if (
            line.dateTime.isAfter(dateToCheck) && 
            line.symbol.slice(0, 2) === 'pi'
          )  {
            continue;
          }
          await commitPosition(currentBtcPosition);
          //await commitPnl(currentBtcPosition);
          currentBtcPosition = new KrakenFuturesPosition();
        }
      } else {
        continue;
      }
    }
  }

  async commitPosition(position) {
    try {
      var data = {
        exchange: 'kraken',
        dateOpen: position.dateOpen,
        dateClose: position.dateClose,
        pnl: position.pnl,
        avgEntryPrice: position.avgEntryPrice,
        closePrice: position.closePrice,
        fundingFee: parseFloat(position.fundingFee),
        fundingTradeIds: position.fundingTradeIds, 
        basisFee: position.basisFee,
        basisFeeCurrency: 'USD',
        basisTradeIds: position.basisTradeIds, 
        compensationTradeIds: position.compensationTradeIds, 
        quote: position.quote,
        base: 'USD',
        type: 'futures'
      };
      await Position.create({ ...data });
    } catch (err) {
      console.log(err);
    }
  }

  async commitPnl(position) {
    try {
      var data = {
        exchange: 'kraken',	
        dateTime: position.dateClose,
        quote: position.quote,
        base: 'USD',
        amount: position.pnl / position.closePrice,
        price: position.closePrice,
        fee: 0.0,
        feeCurrency: 'USD',
        type: 'futures-pnl',
      }
      await Order.create({ ...data });
    } catch (err) {
      console.log(err);
    }
  }
  */

}

class PositionRouter {

  constructor(userId) {
    this.userId = userId;
    this.positions = {};
  }

  route(trade) {
    var position;
    var market = trade.base + '/' + trade.quote;
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
    return this.positions[market];
  }
}

class Position {
  constructor(userId) {
    this.collateralType = 'crypto';
    this.userId = userId;
    this.basisTrades = [];
    this.basisFee = 0.0;
    this.fundingFee = 0.0;
    this.fundingFeeCurrency = 'USD';
    this.pnl = 0.0;
    this.outstanding = 0.0;
    this.fundingTrades = [];
    this.compensationTrades = [];
    this.fundingFee = 0.0;
    this.basisFee = 0.0;
    this.outstanding = 0.0;
    this.avgEntryPrice = 0.0;
    this.closePrice = 0.0;
    this.dateOpen = null;
    this.dateClose = null;
    this.base = null;
    this.quote = null;
    this.exchange = 'kraken futures'
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
      if (this.base === 'xbt') this.base = 'btc';
      if (this.quote === 'xbt') this.quote = 'btc';
      this.dateOpen = line.dateTime;
    }

    if (line.symbol.slice(0, 2) === 'pi') {
      let trade = this.handleBasisTrade(line);
      this.basisTrade.push(trade);
    } else {
      let trade = this.handleFundingTrade(line);
      this.fundingTrades.push(trade);
    }

    if (this.isComplete()) {
      this.dateClose = line.dateTime;
    }
  }

  handleBasisTrade(line) {
    /*
  var data = {
    exchangeTradeId: line.uid,
    dateTime: line.dateTime,
    quote: line.account.slice(2, 5),
    base: 'usd',
    amount: line.change,
    price: parseFloat(line['trade price']),
    type: 'futures-basis',
    exchange: 'kraken',
  };
  */
    var trade = {
      tradeId: line.uid,
      dateTime: line.dateTime,
      amount: line.change,
      price: parseFloat(line['trade price']),
      type: 'future-basis',
      exchange: this.exchange,
      base = this.base,
      quote = this.quote

    }
    /*
  try {
    await Trade.create({ ...data })
      .then(doc => this.basisTradeIds.push(doc._id));
    //var doc = await Trade.find({ ...data }).select('id');
    //this.basisTradeIds.push(doc[0]._id);
  } catch (err) {
    console.log(err);
  }
  */
    position.outstanding = parseFloat(line['new balance']);
    position.avgEntryPrice = parseFloat(line['new average entry price']);
    position.closePrice = parseFloat(line['trade price'])

    return trade;
  }

  async handleFundingTrade(line) {
    var funding = parseFloat(line['realized funding']);
    var pnl = parseFloat(line['realized pnl']);
    var price = parseFloat(line['trade price']);
    var fee = parseFloat(line['fee']);

    if (funding && funding != 0.0) {
      this.fundingFee += funding;
      this.createFuturesFundingTrade(line);
      console.log('created futures funding trade');
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
      console.log('created compensation trade');
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
      type: 'futures-pnl',	
      comment: 'Compensative trade for futures position',
    };
    this.compensationTrades.push(trade);
    /*
  try {
    await Trade.create({ ...data })
      .then(doc => this.compensationTradeIds.push(doc._id));
    //var doc = await Trade.find({ ...data }).select('id');
    //this.compensationTradeIds.push(doc[0]._id);
  } catch (err) {
    console.log(err);
  }
  */
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
      type: 'futures-funding',	
      exchange: this.exchange
    };
    this.fundingTrades.push(trade);
    /*
  try {
    await Trade.create({ ...data })
      .then(doc => this.fundingTradeIds.push(doc._id));
    //var doc = await Trade.find({ ...data }).select('id');
    //this.fundingTradeIds.push(doc[0]._id);
  } catch (err) {
    console.log(err);
  }
  */
  }
}

