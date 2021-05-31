import mongoose from 'mongoose';
var { Schema } = mongoose;

var userSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  orders: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true,
    ref: 'Order'
  },
  trades: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true,
    ref: 'Trade'
  },
  positions: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true,
    ref: 'Position'
  },
  exchanges: [{
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Exchange'
    },
    numTrades: {
      type: Number,
      default: 0
    },
    lastImport: {
      type: Date,
      default: '1/1/2020'
    }, 
    numLastImport: {
      type: Number,
      default: 0
    }
  }]
});

/***Index***/
userSchema.index({
  email: 1
}, { unique: true });

/***Hooks***/
/*
userSchema.pre('update', function(next) {
  let userExchangeIds = this.exchanges.map(exchange => exchange.info);
  if (userExchangeIds.includes())
})
*/

var User = mongoose.model('User', userSchema);
export default User;
