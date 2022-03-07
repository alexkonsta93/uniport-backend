import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema({
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
  exchanges: [{
    exchange: {
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
    },
    apiKey: {
      type: String,
      default: ''
    },
    apiSecret: {
      type: String,
      default: ''
    }
  }],
  settings: {
    maxLines: {
      type: Number,
      default: 25
    }
  }
}, {
  versionKey: false
});

/***Index***/
userSchema.index({
  email: 1
}, { unique: true });

/***Hooks***/
/*
const cb = function(next) {
  this.select('-__v');
  next();
}
userSchema.pre('find', cb);

userSchema.pre('findOne', cb);

userSchema.pre('findOneAndDelete', cb);

userSchema.pre('deleteMany', cb);
*/

/***Virtuals***/
userSchema.virtual('id').get(function() {
	return this._id.toHexString();
});
/*
userSchema.pre('update', function(next) {
  let userExchangeIds = this.exchanges.map(exchange => exchange.info);
  if (userExchangeIds.includes())
})
*/

/***Methods***/
/*
userSchema.methods.updateOrders = function(userId, orders, cb) {
  console.log('here');
  return mongoose.model('User').findById(userId, (err, user) => {
    if (err) {
      throw new Error(err);
    }
    orders.forEach(async order => {
      let doc = await Order.save(order);
      console.log(doc);
      user.orders.push(doc.id);
      user.save(cb);
    })
  })
}
*/

userSchema.methods.updateSettings = async function(settings) {
  this.settings = settings;
  await this.save();
}

/***Settings***/
const settings = {
	virtuals: true,
	transform: function(doc, ret) {
		delete ret._id;
	}
};

userSchema.set('toJSON', settings);
userSchema.set('toObject', settings);

var User = mongoose.model('User', userSchema);
export default User;
