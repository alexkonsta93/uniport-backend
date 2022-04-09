import createRBTree from "functional-red-black-tree";

export default class Map {
  constructor(doubles = true) {
    this._tree = createRBTree();
    this.doubles = doubles;
  }

  insert(key, value) {
    if (!this.doubles && this.contains(key)) return;
    this._tree = this._tree.insert(key, value);
  }

  getValue(key) {
		const iter = this._tree.find(key);
		return iter.node.value;
  }

	getValueGE(key) {
		const iter = this._tree.ge(key);
		return iter.node.value;
	}

  remove(key) {
    this._tree = this._tree.remove(key);
  }

  replace(key, value) {
    const iter = this._tree.find(key);
    iter.node.value = value;
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
