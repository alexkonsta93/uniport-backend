import Position from '../leveraged-position/leveraged-position.model';
import Order from '../order/order.model'
import { processLines } from '../backend';

import { app, start, stop } from '../../server';

describe('Futures Positions', () => {
		describe('Kraken', () => {
				var order1;
				
				beforeAll(async () => {
						// start server
						await start();

						[validPosition1] = initializeOrdersData();
				});

				afterAll(async (done) => {
						// delete all documents in collections
						await Order.deleteMany({});
						await Position.deleteMany({});

						// stop server
						await stop();
				});

				describe('Valid futures position - simple', () => {
						beforeAll(async () => {
								var { order1, order2 } = validPosition1;
								await Order.create(order1);
								await Order.create(order2);
						})

						test("")
				});
		});
});

function initializeOrdersData() {
		var validPosition1 = {
				order1: {
						'exchange': 'kraken',
						'exchangeOrderId': '0',
						'dateTime': new Date(2020, 1, 1, 0, 12, 0),
						'quote': 'btc',
						'base': 'usd',
						'type': 'futures',
						'amount': 10000,
						'price': 10000,
						'fee': 100,
						'feeCurrency': 'usd'
				},
				order2: {
						'exchange': 'kraken',
						'exchangeOrderId': '1',
						'dateTime': new Date(2020, 1, 2, 0, 12, 0),
						'quote': 'btc',
						'base': 'usd',
						'type': 'futures',
						'amount': 10000,
						'price': 20000,
						'fee': 200,
						'feeCurrency': 'usd'
				}
		}

		return [validPosition1];
}
