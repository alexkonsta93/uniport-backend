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
    exchangeId: mongoose.Schema.Types.ObjectId,
    numTrades: Number,
    lastImport: Date, 
    numLastImport: Number
  }]
});

/***Index***/
userSchema.index({
  email: 1
}, { unique: true });

/***Hooks***/
userSchema.pre('save', function() {
});

var User = mongoose.model('User', userSchema);
export default User;
