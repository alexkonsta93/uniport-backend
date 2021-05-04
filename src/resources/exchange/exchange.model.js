import mongoose from 'mongoose';

var { Schema } = mongoose;

var exchangeSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  apiUrl: {
    type: String,
    default: null
  },
  futuresApiUrl: {
    type: String,
    default: null
  },
  logoUri: {
    type: String
  }
})

/***Index***/
exchangeSchema.index({
  name: 1
}, { unique: true })

var Exchange = new mongoose.model('Exchange', exchangeSchema);
export default Exchange;
