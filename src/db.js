import mongoose from 'mongoose';
import express from 'express';
import orderRouter from './resources/order/order.router.js';
import tradeRouter from './resources/trade/trade.router.js';
//import exchangeRouter from './resources/exchange/exchange.router.js';
import positionRouter from './resources/leveraged-position/leveraged-position.router.js';
import userRouter from './resources/user/user.router';
import routerFactory from './utils/crudRouter';
import User from './resources/user/user.model';
import Exchange from './resources/exchange/exchange.model';
import bodyParser from 'body-parser';

export var app = express();

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
});

app.use('/api/order', orderRouter);
app.use('/api/trade', tradeRouter);
app.use('/api/leveraged-position', positionRouter);
var exchangeRouter = routerFactory(Exchange);
app.use('/api/exchange', exchangeRouter);
//var userRouter = routerFactory(User);
app.use('/api/user', userRouter);

export var start = async function() {
		try {
				await mongoose.connect(
						'mongodb://localhost:27017/uniport',
						{ 	
								useNewUrlParser: true,
								useUnifiedTopology: true,
								useFindAndModify: false,
								useCreateIndex: true
						}
				);
				console.log("Mongoose connection success!");
		}	catch (err) {
				console.error(err);
		}
};

export var stop = async function() {
		try {
				await mongoose.disconnect();
				console.log("Mongoose connection closed");
		} catch (err) {
				console.error(err);
		}
				
}
