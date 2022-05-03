import mongoose from 'mongoose';
import Order from '../order/order.model.js';

var { Schema } = mongoose;

var exchanges = ['Bitfinex', 'Poloniex', 'Kraken', 'Binance', 'Gdax', 'Gemini', 'Coinbase', 'Ftx', 'Kraken Kutures'];

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
		usdPrice: {
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
						'settlement',
						'future-basis', 
						'future-funding',
						'future-pnl'
				],
				required: true
		},
		orderId: {
				type: String,
				default: null
		},
    comment: {
      type: String
    }
}, {
	versionKey: false
});

/***Index***/
tradeSchema.index({ 
    userId: 1,
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

const cb = function(next) {
  this.select('-__v');
  next();
}

tradeSchema.pre('find', cb);

tradeSchema.pre('findOne', cb);

tradeSchema.pre('findOneAndDelete', cb);

tradeSchema.pre('deleteMany', cb);

/***Virtuals***/
tradeSchema.virtual('id').get(function() {
	return this._id.toHexString();
});

/*
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


/***Settings***/
const settings = {
	virtuals: true,
	transform: function(doc, ret) {
		delete ret._id;
	}
};

tradeSchema.set('toJSON', settings);
tradeSchema.set('toObject', settings);

var Trade = new mongoose.model('Trade', tradeSchema);
export default Trade;
