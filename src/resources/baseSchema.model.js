import mongoose from 'mongoose';

const { Schema } = mongoose;

const baseSchema = new Schema({});

/***Hooks***/
const cb = function(next) {
  this.select('-__v');
  next();
}
baseSchema.pre('find', cb);

baseSchema.pre('findOne', cb);

baseSchema.pre('findOneAndDelete', cb);

baseSchema.pre('deleteMany', cb);

/***Virtual***/
baseSchema.virtual('id').get(function() {
  return this._id.toHexString();
})

/**Options***/
baseSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
  }
});

baseSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
  }
});

const BaseSchema = new mongoose.model('BaseSchema', baseSchema);
export default BaseSchema;
