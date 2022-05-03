import createRBTree from "functional-red-black-tree";

export default class SortedMap {
  constructor() {
    this._tree = createRBTree();
  }

  insert(key, value) {
    const iter = this._tree.find(key);
    if (iter.valid) {
      // If date already exists in tree -> update node
      const values = iter.node.value;
      values.push(value);
      this._tree = iter.update(values);
      return;
    }

    // If not -> create node and insert
    const values = [value];
    this._tree = this._tree.insert(key, values);
  }

  getValues() {
    const iter = this._tree.begin;
    const items = [];
    while(iter.valid) {
      const values = iter.node.value;
      items.push(...values);
      iter.next();
    }
    return items;
  }

  getValue(key) {
		const iter = this._tree.find(key);
		return iter.node.value;
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
