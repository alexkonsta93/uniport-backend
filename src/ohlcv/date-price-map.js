import createRBTree from 'functional-red-black-tree';
import Papa from 'papaparse';
import fs from 'fs';

export default class DatePriceMap {

	constructor(ticker) {
		this._tree = createRBTree();
		this.ticker = ticker.toUpperCase();
	}

	insert(key, value) {
		this._tree = this._tree.insert(key, value);
	}

	getValue(key) {
		const iter = this._tree.find(key);
		return iter.value;
	}

	load(filePath) {
		function processLine(classObj, line) {
			const datetime = new Date(line.timestamp);
			const price = Number(line.open);
			classObj.insert(datetime, price);
		}

		try {
			const data = fs.readFileSync(filePath, 'utf-8');
			Papa.parse(data, {
				header: true,
				complete: (results) => {
					results.data.forEach(line => processLine(this, line));

				},
				error: (error) => {
					console.log(error);
				},
				skipEmptyLines: true
			});
		} catch (err) {
			console.log(err);
		}
	}

	getKeyValuePairsArray() {
		const iter = this._tree.begin;
		const pairs = [];
		while(iter.valid) {
			const key = iter.node.key;
			const value = iter.node.value;
			pairs.push([key, value]);
			iter.next();
		}	
		return pairs;
	}

}
