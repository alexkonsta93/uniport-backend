import mongoose from 'mongoose';

import Order from '../order/order.model.js';
import Trade from '../trade/trade.model.js';

const { Schema } = mongoose;

const exchanges = ['bitfinex', 'poloniex', 'kraken', 'binance', 'gdax', 'gemini', 'coinbase', 'ftx', 'kraken futures'];

const positionSchema = new Schema({		
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
  dateOpen: {
    type: Date,
    required: true,
  },
  dateClose: {
    type: Date,
    required: true,
  },
  pnl: {
    type: Number,
    required: true
  },
  openPrice: {
    type: Number,
    required: true
  },
  closePrice: {
    type: Number,
    required: true
  },
  fundingFee: {
    type: Number,
    required: true
  },
  fundingTradeIds: {
    type: [mongoose.Schema.Types.ObjectId],
  },
  basisFee: {
    type: Number,
    required: true
  },
  basisFeeCurrency: {
    type: String,
    default: 'USD'
  },
  fundingFeeCurrency: {
    type: String,
    default: 'USD'
  },
  basisTradeIds: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true
  },
  compensationTradeIds: {
    type: [mongoose.Schema.Types.ObjectId],
  },
  base: {
    type: String,
    required: true,
    uppercase: true
  },
  quote: {
    type: String,
    required: true,
    uppercase: true
  },
  comments: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['future', 'margin'],
    required: true
  },
  collateralType: {
    type: String,
    enum: ['cash', 'crypto'],
    required: true
  }
}, {
  versionKey: false
});

/***Index***/
positionSchema.index({ 
  userId: 1,
  exchange: 1, 
  dateClose: 1,
  dateOpen: 1,
  quote: 1, 
  base: 1
}, { unique: true });

/***Hooks***/
/*
const cb = function(next) {
  this.select('-__v');
  next();
}

positionSchema.pre('find', cb);

positionSchema.pre('findOne', cb);

positionSchema.pre('findOneAndDelete', cb);

positionSchema.pre('deleteMany', cb);
*/

/***Virtual***/
positionSchema.virtual('id').get(function() {
  return this._id.toHexString();
})

/***Methods***/
positionSchema.methods.deleteTrades = async function() {
  const tradeIds = [];
  this.basisTradeIds.forEach(id => tradeIds.push(id));
  this.fundingTradeIds.forEach(id => tradeIds.push(id));
  this.compensationTradeIds.forEach(id => tradeIds.push(id));
  for (let id of tradeIds) {
    await Trade.findByIdAndDelete(id);
  }
}

/***Hooks***/
/*
positionSchema.post('save', async function() {
  console.log("Position created");
});

positionSchema.post('find', function() {
});

positionSchema.post('deleteOne', function() {
  console.log("Position deleted");
});

positionSchema.post('findOneAndDelete', function() {
  console.log("Position deleted");
});


positionSchema.post('deleteMany', function() {
  console.log("All positions deleted");
});

positionSchema.post('updateOne', function() {
  console.log("Position updated");
})
*/

/***Settings***/
const settings = {
	virtuals: true,
	transform: function(doc, ret) {
		delete ret._id;
	}
};
positionSchema.set('toJSON', settings);
positionSchema.set('toObject', settings);

const Position = new mongoose.model('Position', positionSchema);
export default Position;
