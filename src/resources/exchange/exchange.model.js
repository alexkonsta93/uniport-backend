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
  }
})

/***Index***/
exchangeSchema.index({
  name: 1
}, { unique: true })
