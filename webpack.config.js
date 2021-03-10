var path = require('path');
var nodeExternals = require('webpack-node-externals');

module.exports = () => {
		return {
				target: 'node',
				externals: [nodeExternals()],
				entry: path.resolve(__dirname, './src/router.js'),
				module: {
						rules: [
								{
										test: /\.(js|jsx)$/,
										exclude: /node_modules/,
										use: ['babel-loader'],
								}
						]
				},
				resolve: {
						extensions: ['*', '.js', 'jsx'],
				},
				output: {
						path: path.resolve(__dirname, './dist'),
						filename: 'bundle.js'
				}
		}
};
