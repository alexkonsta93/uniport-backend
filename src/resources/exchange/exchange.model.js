import mongoose from 'mongoose';

var { Schema } = mongoose;

var exchangeSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  logoUri: {
    type: String,
    required: true
  },
}, {
  versionKey: false
});

/***Index***/
exchangeSchema.index({
  name: 1
}, { unique: true });

/***Hooks***/
/*
exchangeSchema.pre('save', function(next) {
  var err = new Error('Futures url info needed');
  if (this.futures && (!this.futuresApiUrl || !this.processFuturesUrl)) next(err);
  next();
});
*/

var Exchange = new mongoose.model('Exchange', exchangeSchema);
export default Exchange;
