import mongoose from 'mongoose';
import Order from '../order/order.model.js';

var { Schema } = mongoose;

var exchanges = ['bitfinex', 'poloniex', 'kraken', 'binance', 'gdax', 'gemini', 'coinbase', 'ftx'];

var tradeSchema = new Schema({
		userId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'User',
				default: null
		},
		exchange: {
				type: String,
				enum: exchanges,
				required: true,
				lowercase: true
		},
		tradeId: {
				type: String,
				default: null
		},
		dateTime: {
				type: Date,
				required: true,
		},
		amount: {
				type: Number,
				required: true,
		},
		price: { 
				type: Number,
				required: true
		},
		quote: {
				type: String,
				required: true,
				uppercase: true
		},
		base: {
				type: String,
				uppercase: true,
				required: true
		},
		fee: {
				type: Number,
				default: 0
		},
		feeCurrency: {
				type: String,
				default: "USD",
				uppercase: true
		},
		type: {
				type: String,
				enum: [
						'spot', 
						'margin', 
						'future-basis', 
						'future-funding',
						'future-pnl'
				],
				required: true
		},
	  /*
		orderId: {
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Order',
				default: null
		},
		*/
		orderId: {
				type: String,
				default: null
		}
});

/***Index***/
tradeSchema.index({ 
		dateTime: 1, 
		type: 1,
		exchange: 1, 
		exchangeOrderId: 1, 
		exchangeTradeId: 1, 
		quote: 1, 
		base: 1,
});

/***Statics***/
tradeSchema.statics.sumAmount = function(trades) {
		var amount = 0;
		trades.forEach(trade => {
				amount += trade.amount;
		});
		return amount;
};


/***Methods***/
tradeSchema.methods.associate = async function(order) {

		// associate Order with Trade
		var tradeIds = order.tradeIds;
		tradeIds.push(this._id);
		order = await Order.findByIdAndUpdate(order._id, { tradeIds : tradeIds }, { new: true });

		// associate Trade with Order 
		this.orderId = order.id;
		this.exchangeOrderId = order.exchangeOrderId;
}

tradeSchema.methods.findParentOrder = async function() {
		
		var order;

		// conidition on exchangeOrderId
		try {
				if (this.exchangeOrderId) {
						order = await Order.findOne({ 
								'exchangeOrderId': this.exchangeOrderId,
								'exchange': this.exchange
						})
						.exec();
				} else {
						order = await Order.findOne({ 
								'exchange': this.exchange,
								'quote': this.quote,
								'base': this.base,
								'type': this.type,
								'dateStart': { $lte: this.date },
								'dateStop': { $gte: this.date },
						})
						.exec();
				}
		} catch (err) {
				console.error(err);
		}

		if (!order) throw Error("No parent order found");
		return order;
}

/***Hooks***/
tradeSchema.pre('save', async function(next) {
		// if trade exists in db -> skip
		//var exists = await this.exists;
		//if (exists) throw Error("Trade already exists");

		// if futures trade
		if 	(this.type !== 'exchange' || this.exchange === 'gdax')
				next();

		// if parent order not found, will throw an error
		var parentOrder = await this.findParentOrder();

		// if order is complete -> skip
		if (await parentOrder.isComplete) throw Error("Parent order already complete");

		// if trade amount exceeds remaining amount left in order -> skip
		var trades = await Trade.find({ '_id': { $in: parentOrder.tradeIds } });
		var filledAmount = Trade.sumAmount(trades);
		if (filledAmount + this.amount > parentOrder.amount) throw Error("Max amount exceeded");

		// associate with parent order
		await this.associate(parentOrder);

});

/*
tradeSchema.post('save', async function() {
		console.log("Trade created");
});

tradeSchema.post('find', function() {
});

tradeSchema.post('deleteOne', function() {
		console.log("Trade deleted");
});

tradeSchema.post('findOneAndDelete', function() {
		console.log("Trade deleted");
});


tradeSchema.post('deleteMany', function() {
		console.log("All trades deleted");
});

tradeSchema.post('updateOne', function() {
		console.log("Trade updated");
})
*/

/***Virtuals***/
tradeSchema.virtual('pair').get(function() {
		return `${this.quote}${this.base}`;
});

tradeSchema.virtual('exists').get(async function() {
		var queryParams = {
				exchange: this.exchange,
				exchangeTradeId: this.exchangeTradeId,
		};

		var exists = false;
		try {
				var doc = await Trade.findOne(queryParams);
				if (doc) exists = true;
		} catch (err) {
				console.error(err);
		}
		return exists;
})
/*
tradeSchema.virtual('orderIsComplete').get(async function() {

		var order = await Order.findById(this.orderId);

		return order.isComplete ? true : false;
});
*/

var Trade = new mongoose.model('Trade', tradeSchema);
export default Trade;
