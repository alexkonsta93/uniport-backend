import createRBTree from "functional-red-black-tree";

export default class Map {
  constructor() {
    this._tree = createRBTree();
  }

  insert(key, value) {
    this._tree = this._tree.insert(key, value);
  }

  getValue(key) {
		const iter = this._tree.find(key);
		return iter.value;
  }

  remove(key) {
    this._tree = this._tree.remove(key);
  }

  contains(key) {
    const iter = this._tree.find(key);
    if (iter.node) return true;
    return false;
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
