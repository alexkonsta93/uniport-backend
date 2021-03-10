import moment from 'moment';

import Order from './order/order.model';
import Trade from './trade/trade.model';

export default async function processGdaxLines(lines) {
		var trades = linesToTrades(lines);

		try {

				var first = trades.shift();
				var order = new GdaxOrder(first);
				await Trade.create({ ...first });
				var doc = await Trade.find({ ...first });
				order.properties.tradeIds.push(doc[0]._id);

				for (let trade of trades) {
						if (trade.dateTime.isAfter(order.properties.dateTime)) {
								//console.log( { ...order.properties });
								await Order.create({ ...order.properties });
								// Returns undefined for some reason
								//let doc = await Order.find({ ...order.properties });
								//console.log(doc[0]);
								order = new GdaxOrder(trade);
						} else {
								order.appendTrade(trade);
						}
						await Trade.create({ ...trade })
					  .then(doc => order.properties.tradeIds.push(doc._id));
					  /*
						let doc = await Trade.find({ ...trade }).select('id');
						order.properties.tradeIds.push(doc[0]._id);
						*/
				}

				await Order.create({ ...order.properties });
		} catch (err) {
				console.log(err);
		}
}

class GdaxOrder {
		constructor(trade) {
				this.properties = {
						...trade,
						tradeIds: []
				};
		}

		appendTrade(trade) {
				var prevAmount = this.properties.amount;
				this.properties.amount += trade.amount;
				this.properties.price = Math.abs((this.properties.price * prevAmount) + (trade.price * trade.amount)) / Math.abs(prevAmount + trade.amount);
		}
}

function linesToTrades(lines) {
		var trades = [];

		for (let i = 0; i < lines.length; i++) {
				let line = lines[i];

				if (line['TYPE'] === 'transfer') continue;
				else if (line['TYPE'] === 'fee') {
						// fee, match , match
						
						// fee
						let fee = Math.abs(parseFloat(line['AMOUNT']));

						// feeCurrency
						let feeCurrency = line['CURRENCY'];

						// nextRow
						i = i + 2;
						line = lines[i];

						// dateTime
						let dateTime = moment.utc(line['TIMESTAMP']);

						// amount
						let amount = parseFloat(line['AMOUNT']);

						// price
						let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);
				
						var trade = {
								exchange: 'gdax',
								dateTime: dateTime,
								quote: line['CURRENCY'],
								base: 'USD',
								amount: amount,
								price: price,
								exchangeTradeId: line['ID'],	
								type: 'exchange',
								fee: fee,
								feeCurrency: feeCurrency
						};
						trades.push(trade);

				} else {
						if (lines[i+1]['TYPE'] === 'fee') {
								// match, fee, match
								
								// fee
								let fee = Math.abs(parseFloat(lines[i+1]['AMOUNT']));
								
								// dateTime
								let dateTime = moment.utc(line['TIMESTAMP']);

								// amount
								let amount = parseFloat(line['AMOUNT']);

								// price
								let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);

								let trade = {
										exchange: 'gdax',
										dateTime: dateTime,
										quote: line['CURRENCY'],
										base: 'USD',
										exchangeTradeId: line['ID'],
										amount: amount,
										price: price,
										type: 'exchange',
										fee: fee,
										feeCurrency: 'USD'
								}
								trades.push(trade); 
								// skip 2 rows
								i = i + 2;

						} else {
								// match match
								if (line['CURRENCY'] === 'BTC') {
										let dateTime = moment.utc(line['TIMESTAMP']);
										let amount = parseFloat(line['AMOUNT']);
										let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);

										let trade = {
												exchange: 'gdax',
												dateTime: dateTime,
												quote: line['CURRENCY'],
												base: 'USD',
												amount: amount,
												price: price,
												fee: 0.0,
												feeCurrency: 'USD',
												type: 'exchange',
												exchangeTradeId: line['ID']
										}
										trades.push(trade);

										i = i + 1;
								} else {
										i = i + 1;
										line = lines[i];

										let dateTime = moment.utc(line['TIMESTAMP']);
										let amount = parseFloat(line['AMOUNT']);
										let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);

										let trade = {
												exchange: 'gdax',
												dateTime: dateTime,
												quote: line['CURRENCY'],
												base: 'USD',
												amount: amount,
												price: price,
												fee: 0.0,
												feeCurrency: 'USD',
												type: 'exchange',
												exchangeTradeId: line['ID']
										}
										trades.push(trade);
								}
						}
				}
		}

		return trades;
}
