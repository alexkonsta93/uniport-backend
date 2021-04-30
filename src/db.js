import mongoose from 'mongoose';
import express from 'express';
import orderRouter from './resources/order/order.router.js';
import tradeRouter from './resources/trade/trade.router.js';
import appRouter from './resources/app/app.router.js';
import positionRouter from './resources/leveraged-position/leveraged-position.router.js';
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
app.use('/api/app', appRouter);

export var start = async function() {
		try {
				await mongoose.connect(
						'mongodb://localhost:27017/beartracks',
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
