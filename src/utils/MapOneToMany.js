import createRBTree from "functional-red-black-tree";

export default class MapOneToMany {
  constructor() {
    this._tree = createRBTree();
  }

  insert(key, value) {
    const iter = this._tree.find(key);
    if (iter.valid) {
      // If date already exists in tree -> update node
      const node = iter.node;
      const values = node.value;
      values.push(value);
      this._tree = iter.update(values);
      return;
    }

    // If not -> create node and insert
    const values = [value];
    this._tree = this._tree.insert(key, values);
  }

  getKeyValuePairsArray() {
    const iter = this._tree.begin;
    const pairs = [];
    while (iter.valid) {
      const key = iter.node.key;
      const values = iter.node.value;
      pairs.push([key, values]);
      iter.next();
    }
    return pairs;
  }

  getValuesList(key) {
    const iter = this._tree.find(key);
    if (iter.valid) {
      return iter.node.value;
    }
    return []
  }

  getValuesListGE(key) {
    const iter = this._tree.ge(key);
    if (iter.valid) {
      return iter.node.value;
    }
    return []
  }

  getValuesListGELE(minKey, maxKey) {
    const iter = this._tree.doVisit(minKey, maxKey);
  }
}
