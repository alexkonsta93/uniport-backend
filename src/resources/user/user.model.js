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
		exchanges: {
				type: [new Schema({
						name: String,
						apiKey: Number
				})],
				required: true
		}
});

userSchema.methods.updateAuto = function(exchanges) {
		[{ exchangeName, apiKey }] = exchanges;

		this.exchanges.forEach(({ exchangeName, apiKey }) => {
				var client = clients["name"];

				client.connect(apiKey)
						.then(client => {
								var data = await client.downloadUpdate();
								await this.update(name, data);
						})
						.catch(error => {
								throw new Error(error);
						})
		});
}

userSchema.methods.updateManual = function(data) {
		await this.update(data);
}

userSchema.

var User = mongoose.model('User', userSchema);
