import mongoose from 'mongoose';
var { Schema } = mongoose;

var userSchema = new Schema({
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
    ref: 'orders'
  },
  trades: {
    type: [mongoose.Schema.Types.ObjectId],
    required: true,
    ref: 'trades'
  },
  exchanges: [{
    exchangeId: mongoose.Schema.Types.ObjectId,
    numTrades: Number,
    lastImport: Date, 
    numLastImport: Number
  }]
});

var User = mongoose.model('User', userSchema);
export default User;
