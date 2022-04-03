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
        const userId = '62015b3eec19272ccca25765';
			  //const orders = await axios.get('http://localhost:3000/api/user/' + userId + '/orders')
			  const trades = await axios.get('http://localhost:3000/api/user/' + userId + '/trades');
				//console.log('trades', trades);
				var csv = tradesToCsv(trades.data);
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
        const userId = '62015b3eec19272ccca25765';
        const positions = await axios.get('http://localhost:3000/api/user/' + userId + '/positions');
				const csv = positionsToCsv(positions.data);
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
				buyCurrency = item.base;
				sellAmount = item.amount * item.price;
				sellCurrency = item.quote;
		} else {
				buyAmount = -item.amount * item.price;
				buyCurrency = item.quote;
				sellAmount = -item.amount;
				sellCurrency = item.base;
		}
		return {
				'Type': 'Trade',
				'BuyAmount': buyAmount,
				'BuyCurrency': buyCurrency,
				'SellAmount': sellAmount,
				'SellCurrency': sellCurrency,
				'FeeAmount': item.fee,
				'FeeCurrency': item.feeCurrency,
				'Exchange': item.exchange,
				'Group': null,
				'Comment': null,
				'Date': item.dateTime

		}
}

function tradesToCsv(trades) {
		var ret = [];
		
		for (let trade of trades) {
				if (
			    trade.type === 'future-pnl' ||
			    trade.type === 'spot'
		    ) {
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
		    const fundingFeeUSD =
		      (position.fundingFeeCurrency === 'USD') ?
		      position.fundingFee :
		      position.fundingFee * position.closePrice;
				ret.push({
						'Exchange': position.exchange,
						'Date Open': position.dateOpen,
						'Date Close': position.dateClose,
						'Base': position.base,
						'Quote': position.quote,
						'Open Price': position.openPrice,
						'Close Price': position.closePrice,
						'Basis Fee': position.basisFee,
						'Basis Fee Currency': position.basisFeeCurrency,
						'Funding Fee': position.fundingFee,
						'Funding Fee Currency':  position.fundingFeeCurrency,
					  'Gross PNL': position.pnl,
						'Net PNL': position.pnl - position.basisFee - fundingFeeUSD,
					  'Collateral Type': position.collateralType
				})
		}
		return Papa.unparse(ret, {
				header: true
		})
}

app.listen(3000, () => {
		console.log('Listening on port 3000');	
});
