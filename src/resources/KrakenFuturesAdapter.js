import moment from 'moment';
import Order from './order/order.model';
import Trade from './trade/trade.model';
import Position from './leveraged-position/leveraged-position.model';

export default async function processKrakenFuturesLines(lines) {
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

async function commitPosition(position) {
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

async function commitPnl(position) {
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

class KrakenFuturesPosition {
		constructor() {
				this.basisTradeIds = [];
				this.fundingTradeIds = [];
				this.compensationTradeIds = [];
				this.fundingFee = 0.0;
				this.basisFee = 0.0;
				this.pnl = 0.0;
				this.outstanding = 0.0;
				this.avgEntryPrice = 0.0;
				this.closePrice = 0.0;
				this.dateOpen = null;
				this.dateClose = null;
				this.quote = null;
		}

		isComplete() {
				return !this.isEmpty() && this.outstanding == 0.0;
		}

		isEmpty() {
				return this.basisTradeIds.length == 0;
		}

		async handleLine(line) {
				if (this.isEmpty()) {
						this.dateOpen = line.dateTime;
						this.quote = line.account.slice(2, 5);
				}

				if (line.symbol.slice(0, 2) === 'pi') {
						await this.handleBasisTrade(line);
						console.log('created basis trade');
				} else {
						await this.handleFundingTrade(line);
				}
				
				if (this.isComplete()) {
						this.dateClose = line.dateTime;
				}
		}

		async handleBasisTrade(line) {
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
				try {
						await Trade.create({ ...data })
						.then(doc => this.basisTradeIds.push(doc._id));
						//var doc = await Trade.find({ ...data }).select('id');
						//this.basisTradeIds.push(doc[0]._id);
				} catch (err) {
						console.log(err);
				}
				this.outstanding = parseFloat(line['new balance']);
				this.avgEntryPrice = parseFloat(line['new average entry price']);
				this.closePrice = parseFloat(line['trade price'])
		}

		async handleFundingTrade(line) {
				var funding = parseFloat(line['realized funding']);
				var pnl = parseFloat(line['realized pnl']);
				var price = parseFloat(line['trade price']);
				var fee = parseFloat(line['fee']);

				if (funding && funding != 0.0) {
						this.fundingFee += funding;
						await this.createFuturesFundingTrade(line);
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
						await this.createCompensationTrade(line);
						console.log('created compensation trade');
				}
		}

		async createCompensationTrade(line) {
				var data = {
						exchangeTradeId: line.uid,
						dateTime: line.dateTime,
						quote: line.account.slice(2, 5),
						base: 'usd',
						price: parseFloat(line['trade price']),
						amount: parseFloat(line['realized pnl']),
						exchange: 'kraken',
						type: 'futures-pnl',	
						comments: 'Compensative trade for futures position',
				};
				try {
						await Trade.create({ ...data })
						.then(doc => this.compensationTradeIds.push(doc._id));
						//var doc = await Trade.find({ ...data }).select('id');
						//this.compensationTradeIds.push(doc[0]._id);
				} catch (err) {
						console.log(err);
				}
		}

		async createFuturesFundingTrade(line) {
				var amount = parseFloat(line['realized funding']);
				if (isNaN(amount)) amount = 0;
				var price = parseFloat(line['funding rate']);
				if (isNaN(price)) price = 0;
				var data = {
						exchangeTradeId: line.uid,
						dateTime: line.dateTime,
						quote: line.account.slice(2, 5),
						base: 'usd',
						amount: -amount,
						price: price,
						type: 'futures-funding',	
						exchange: 'kraken'
				};
				try {
						await Trade.create({ ...data })
						.then(doc => this.fundingTradeIds.push(doc._id));
						//var doc = await Trade.find({ ...data }).select('id');
						//this.fundingTradeIds.push(doc[0]._id);
				} catch (err) {
						console.log(err);
				}
		}
}
