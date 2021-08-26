import { app, start, stop } from './db';
/*
import processKrakenFuturesLines from './resources/KrakenFuturesAdapter';
import processCoinbaseLines from './resources/CoinbaseAdapter';
import processGdaxLines from './resources/GdaxAdapter';
*/

import Papa from 'papaparse';
import axios from 'axios';
import fs from 'fs';

start();

app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', '*');
		res.header('Access-Control-Allow-Headers', '*');
		next();
});
/*
app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
});
*/

/*
app.post('/process-kraken-futures-trades', async (req, res, next) => {
		res.status(200);
		res.send('success');
		var lines = Object.keys(req.body).map(key => req.body[key]);
		await processKrakenFuturesLines(lines.reverse());
});

app.post('/process-gdax-trades', async (req, res, next) => {
		res.status(200);
		res.send('success');
		var lines = Object.keys(req.body).map(key => req.body[key]);
		await processGdaxLines(lines);
})

app.post('/process-coinbase-trades', async (req, res, next) => {
		res.status(200);
		res.send('success');
		var lines = Object.keys(req.body).map(key => req.body[key]);
	  console.log(req.userId);
		//await processCoinbaseLines(lines.reverse(), req.userId);
})
*/

app.get('/print-trades', async (req, res, next) => {
		try {
				var orders = await axios.get('http://localhost:3000/api/order/all');
				var trades = await axios.get('http://localhost:3000/api/trade/all');
				var csv = tradesToCsv(orders.data.data, trades.data.data);
				fs.writeFile('../trades.csv', csv, err => {
						if (err) throw err;
				});
				res.status(200);
				res.send('File created');
		} catch (err) {
				console.log(err);
				res.status(400);
				res.send(err);
		}
});

app.get('/print-positions', async (req, res, next) => {
		try {
				var positions = await axios.get('http://localhost:3000/api/leveraged-position/all');
				var csv = positionsToCsv(positions.data.data);
				fs.writeFile('../positions.csv', csv, err => {
						if (err) throw err;
				});
				res.status(200);
				res.send('File created');
		} catch (err) {
				console.log(err);
				res.status(400);
				res.send(err);
		}
});

function converToObj(item) {
		let buyAmount, buyCurrency, sellAmount, sellCurrency;
		if (item.amount > 0) {
				buyAmount = item.amount;		
				buyCurrency = item.quote;
				sellAmount = item.amount * item.price;
				sellCurrency = item.base;
		} else {
				buyAmount = -item.amount * item.price;
				buyCurrency = item.base;
				sellAmount = -item.amount;
				sellCurrency = item.quote;
		}
		return {
				'Type': 'Trade',
				'Buy Amount': buyAmount,
				'Buy Currency': buyCurrency,
				'Sell Amount': sellAmount,
				'Sell Currency': sellCurrency,
				'Fee': item.fee,
				'Fee Currency': item.feeCurrency,
				'Exchange': item.exchange,
				'Trade-Group': null,
				'Comment': null,
				'Date': item.dateTime

		}
}

function tradesToCsv(orders, trades) {
		var ret = [];
		
		for (let order of orders) {
				ret.push(converToObj(order))
		}
		for (let trade of trades) {
				if (trade.type === 'futures-pnl') {
						ret.push(converToObj(trade));
				}
		}
		return Papa.unparse(ret, {
				header: true
		})
}

function positionsToCsv(positions) {
		var ret = [];
		for (let position of positions) {
				ret.push({
						'Date Open': position.dateOpen,
						'Date Close': position.dateClose,
						'Quote': position.quote,
						'Base': position.base,
						'Average Entry Price': position.avgEntryPrice,
						'Close Price': position.closePrice,
						'Gross PNL': position.pnl,
						'Basis Fee': position.basisFee,
						'Basis Fee Currency': position.basisFeeCurrency,
						'Funding Fee': position.fundingFee,
						'Funding Fee Currency':  position.quote,
						'Net PNL': position.pnl - position.basisFee - (position.fundingFee * position.closePrice),
						'Exchange': position.exchange
				})
		}
		return Papa.unparse(ret, {
				header: true
		})
}

app.listen(3000, () => {
		console.log('Listening on port 3000');	
});
