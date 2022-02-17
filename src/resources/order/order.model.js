import mongoose from 'mongoose';
import Trade from '../trade/trade.model.js';

var { Schema } = mongoose;

var exchanges = ['bitfinex', 'poloniex', 'kraken', 'binance', 'gdax', 'gemini', 'coinbase', 'ftx', 'kraken futures'];

var orderSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  exchange: {
    type: String,
    enum: exchanges,
    required: true,
    lowercase: true
  },
  orderId: {
    type: String,
    default: null
  },
  dateTime: {
    type: Date,
    required: true
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
    required: true,
    uppercase: true
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
  isSplit: {
    type: Boolean,
    required: true
  },
  comments: {
    type: String,
    default: null
  },
  tradeIds: {
    type: [mongoose.Schema.Types.ObjectId],
    default: []
  },
}, {
  versionKey: false
});

/***Index***/
orderSchema.index({
  userId: 1,
  dateTime: 1,
  type: 1,
  exchange: 1, 
  exchangeOrderId: 1, 
  quote: 1, 
  base: 1
}, { unique: true });

/***Statics***/
orderSchema.statics.sumAmount = function(orders) {
  var amount = 0;
  orders.forEach(trade => {
    amount += trade.amount;
  });
  return amount;
};

/***Methods***/
orderSchema.methods.deleteTrades = async function() {
  for (let tradeId of this.tradeIds) {
    await Trade.findByIdAndDelete(tradeId);
  }
}

/***Hooks***/
/*
const cb = function(next) {
  this.select('-__v');
  next();
}

orderSchema.pre('find', cb);

orderSchema.pre('findOne', cb);

orderSchema.pre('findOneAndDelete', cb);

orderSchema.pre('deleteMany', cb);
*/
/*
orderSchema.pre('save', async function() {
  // if order exists in db -> skip
  //var exists = await this.exists;
  //if (exists) throw Error("Order already exists");
});

orderSchema.post('save', function() {
    console.log("Order created");
})

orderSchema.post('findOneAndDelete', function() {
    console.log("Order deleted");
})
orderSchema.post('deleteMany', function() {
    console.log("All orders deleted");
})

orderSchema.post('updateOne', function() {
    console.log("Order updated");
})
*/

/***Virtuals***/
orderSchema.virtual('id').get(function() {
	return this._id.toHexString();
});

orderSchema.virtual('isComplete').get(async function() {
  var trades = [];
  try {
    trades = await Trade.find({ orderId: this._id }).exec();	
  } catch (err) {
    console.log(err);
  }
  return this.amount == Trade.sumAmount(trades);
});

/***Settings***/
const settings = {
	virtuals: true,
	transform: function(doc, ret) {
		delete ret._id;
	}
};

orderSchema.set('toJSON', settings);
orderSchema.set('toObject', settings);

var Order = new mongoose.model('Order', orderSchema); // Must be at bottom of file for hooks to work
export default Order;
