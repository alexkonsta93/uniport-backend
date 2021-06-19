import moment from 'moment';
import Order from './order/order.model';

export async function processCoinbaseLines(lines) {
		var orders = linesToOrders(lines);		
	  var processedOrders = [];

		try {
				for (let order of orders) {
						processedOrders.push(await Order.create({ ...order }));
				}
			  return processedOrders;
		} catch (err) {
				console.log(err);
		}
}

export function toCoinbaseOrders(lines) {
		var orders = [];
		
		for (let line of lines) {
				if (
						line['TRANSACTION'].split(' ')[0] == 'Sold' || 
						line['TRANSACTION'].split(' ')[0] == 'Bought'
				) {

						let dateTime = moment.utc(line['TIMESTAMP']);
						let amount = line['AMOUNT'];
						let amountUSD = line['AMOUNT (USD)'];
						if (amount.slice(amount.length - 4) === amountUSD.slice(amountUSD.length - 4)) {
								continue;
						}
						amount = parseFloat(amount.slice(0, amount.length - 4));
						amountUSD = parseFloat(amountUSD.slice(0, amountUSD.length - 4));
						let price = amountUSD / amount;
						orders.push({
								exchange: 'coinbase',
								dateTime: dateTime,
								quote: line['ACCOUNT'].slice(0, 3),
								base: 'USD',
								amount: amount,
								price: price,
								fee: 0.0,
								feeCurrency: 'USD',
								type: 'exchange',
						});
				}
		}

		return orders;
}
