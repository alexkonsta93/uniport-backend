/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/db.js":
/*!*******************!*\
  !*** ./src/db.js ***!
  \*******************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.stop = exports.start = exports.app = undefined;\n\nvar _mongoose = __webpack_require__(/*! mongoose */ \"mongoose\");\n\nvar _mongoose2 = _interopRequireDefault(_mongoose);\n\nvar _express = __webpack_require__(/*! express */ \"express\");\n\nvar _express2 = _interopRequireDefault(_express);\n\nvar _orderRouter = __webpack_require__(/*! ./resources/order/order.router.js */ \"./src/resources/order/order.router.js\");\n\nvar _orderRouter2 = _interopRequireDefault(_orderRouter);\n\nvar _tradeRouter = __webpack_require__(/*! ./resources/trade/trade.router.js */ \"./src/resources/trade/trade.router.js\");\n\nvar _tradeRouter2 = _interopRequireDefault(_tradeRouter);\n\nvar _leveragedPositionRouter = __webpack_require__(/*! ./resources/leveraged-position/leveraged-position.router.js */ \"./src/resources/leveraged-position/leveraged-position.router.js\");\n\nvar _leveragedPositionRouter2 = _interopRequireDefault(_leveragedPositionRouter);\n\nvar _bodyParser = __webpack_require__(/*! body-parser */ \"body-parser\");\n\nvar _bodyParser2 = _interopRequireDefault(_bodyParser);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar app = exports.app = (0, _express2.default)();\napp.use(_bodyParser2.default.json({\n  limit: '50mb'\n}));\napp.use(_bodyParser2.default.urlencoded({\n  limit: '50mb',\n  extended: true\n}));\napp.use((req, res, next) => {\n  res.header('Access-Control-Allow-Origin', '*');\n  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');\n  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');\n  next();\n});\napp.use('/api/order', _orderRouter2.default);\napp.use('/api/trade', _tradeRouter2.default);\napp.use('/api/leveraged-position', _leveragedPositionRouter2.default);\n\nvar start = exports.start = async function () {\n  try {\n    await _mongoose2.default.connect('mongodb://localhost:27017/beartracks', {\n      useNewUrlParser: true,\n      useUnifiedTopology: true,\n      useFindAndModify: false,\n      useCreateIndex: true\n    });\n    console.log(\"Mongoose connection success!\");\n  } catch (err) {\n    console.error(err);\n  }\n};\n\nvar stop = exports.stop = async function () {\n  try {\n    await _mongoose2.default.disconnect();\n    console.log(\"Mongoose connection closed\");\n  } catch (err) {\n    console.error(err);\n  }\n};\n\n//# sourceURL=webpack://beartracks-backend/./src/db.js?");

/***/ }),

/***/ "./src/resources/CoinbaseAdapter.js":
/*!******************************************!*\
  !*** ./src/resources/CoinbaseAdapter.js ***!
  \******************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.default = processCoinbaseLines;\n\nvar _moment = __webpack_require__(/*! moment */ \"moment\");\n\nvar _moment2 = _interopRequireDefault(_moment);\n\nvar _order = __webpack_require__(/*! ./order/order.model */ \"./src/resources/order/order.model.js\");\n\nvar _order2 = _interopRequireDefault(_order);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nasync function processCoinbaseLines(lines) {\n  var orders = linesToOrders(lines);\n\n  try {\n    for (let order of orders) {\n      await _order2.default.create({ ...order\n      });\n    }\n  } catch (err) {\n    console.log(err);\n  }\n}\n\nfunction linesToOrders(lines) {\n  var orders = [];\n\n  for (let line of lines) {\n    if (line['TRANSACTION'].split(' ')[0] == 'Sold' || line['TRANSACTION'].split(' ')[0] == 'Bought') {\n      let dateTime = _moment2.default.utc(line['TIMESTAMP']);\n\n      let amount = line['AMOUNT'];\n      let amountUSD = line['AMOUNT (USD)'];\n\n      if (amount.slice(amount.length - 4) === amountUSD.slice(amountUSD.length - 4)) {\n        continue;\n      }\n\n      amount = parseFloat(amount.slice(0, amount.length - 4));\n      amountUSD = parseFloat(amountUSD.slice(0, amountUSD.length - 4));\n      let price = amountUSD / amount;\n      orders.push({\n        exchange: 'coinbase',\n        dateTime: dateTime,\n        quote: line['ACCOUNT'].slice(0, 3),\n        base: 'USD',\n        amount: amount,\n        price: price,\n        fee: 0.0,\n        feeCurrency: 'USD',\n        type: 'exchange'\n      });\n    }\n  }\n\n  return orders;\n}\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/CoinbaseAdapter.js?");

/***/ }),

/***/ "./src/resources/GdaxAdapter.js":
/*!**************************************!*\
  !*** ./src/resources/GdaxAdapter.js ***!
  \**************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.default = processGdaxLines;\n\nvar _moment = __webpack_require__(/*! moment */ \"moment\");\n\nvar _moment2 = _interopRequireDefault(_moment);\n\nvar _order = __webpack_require__(/*! ./order/order.model */ \"./src/resources/order/order.model.js\");\n\nvar _order2 = _interopRequireDefault(_order);\n\nvar _trade = __webpack_require__(/*! ./trade/trade.model */ \"./src/resources/trade/trade.model.js\");\n\nvar _trade2 = _interopRequireDefault(_trade);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nasync function processGdaxLines(lines) {\n  var trades = linesToTrades(lines);\n\n  try {\n    var first = trades.shift();\n    var order = new GdaxOrder(first);\n    await _trade2.default.create({ ...first\n    });\n    var doc = await _trade2.default.find({ ...first\n    });\n    order.properties.tradeIds.push(doc[0]._id);\n\n    for (let trade of trades) {\n      if (trade.dateTime.isAfter(order.properties.dateTime)) {\n        //console.log( { ...order.properties });\n        await _order2.default.create({ ...order.properties\n        }); // Returns undefined for some reason\n        //let doc = await Order.find({ ...order.properties });\n        //console.log(doc[0]);\n\n        order = new GdaxOrder(trade);\n      } else {\n        order.appendTrade(trade);\n      }\n\n      await _trade2.default.create({ ...trade\n      }).then(doc => order.properties.tradeIds.push(doc._id));\n      /*\n      let doc = await Trade.find({ ...trade }).select('id');\n      order.properties.tradeIds.push(doc[0]._id);\n      */\n    }\n\n    await _order2.default.create({ ...order.properties\n    });\n  } catch (err) {\n    console.log(err);\n  }\n}\n\nclass GdaxOrder {\n  constructor(trade) {\n    this.properties = { ...trade,\n      tradeIds: []\n    };\n  }\n\n  appendTrade(trade) {\n    var prevAmount = this.properties.amount;\n    this.properties.amount += trade.amount;\n    this.properties.price = Math.abs(this.properties.price * prevAmount + trade.price * trade.amount) / Math.abs(prevAmount + trade.amount);\n  }\n\n}\n\nfunction linesToTrades(lines) {\n  var trades = [];\n\n  for (let i = 0; i < lines.length; i++) {\n    let line = lines[i];\n    if (line['TYPE'] === 'transfer') continue;else if (line['TYPE'] === 'fee') {\n      // fee, match , match\n      // fee\n      let fee = Math.abs(parseFloat(line['AMOUNT'])); // feeCurrency\n\n      let feeCurrency = line['CURRENCY']; // nextRow\n\n      i = i + 2;\n      line = lines[i]; // dateTime\n\n      let dateTime = _moment2.default.utc(line['TIMESTAMP']); // amount\n\n\n      let amount = parseFloat(line['AMOUNT']); // price\n\n      let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);\n      var trade = {\n        exchange: 'gdax',\n        dateTime: dateTime,\n        quote: line['CURRENCY'],\n        base: 'USD',\n        amount: amount,\n        price: price,\n        exchangeTradeId: line['ID'],\n        type: 'exchange',\n        fee: fee,\n        feeCurrency: feeCurrency\n      };\n      trades.push(trade);\n    } else {\n      if (lines[i + 1]['TYPE'] === 'fee') {\n        // match, fee, match\n        // fee\n        let fee = Math.abs(parseFloat(lines[i + 1]['AMOUNT'])); // dateTime\n\n        let dateTime = _moment2.default.utc(line['TIMESTAMP']); // amount\n\n\n        let amount = parseFloat(line['AMOUNT']); // price\n\n        let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);\n        let trade = {\n          exchange: 'gdax',\n          dateTime: dateTime,\n          quote: line['CURRENCY'],\n          base: 'USD',\n          exchangeTradeId: line['ID'],\n          amount: amount,\n          price: price,\n          type: 'exchange',\n          fee: fee,\n          feeCurrency: 'USD'\n        };\n        trades.push(trade); // skip 2 rows\n\n        i = i + 2;\n      } else {\n        // match match\n        if (line['CURRENCY'] === 'BTC') {\n          let dateTime = _moment2.default.utc(line['TIMESTAMP']);\n\n          let amount = parseFloat(line['AMOUNT']);\n          let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);\n          let trade = {\n            exchange: 'gdax',\n            dateTime: dateTime,\n            quote: line['CURRENCY'],\n            base: 'USD',\n            amount: amount,\n            price: price,\n            fee: 0.0,\n            feeCurrency: 'USD',\n            type: 'exchange',\n            exchangeTradeId: line['ID']\n          };\n          trades.push(trade);\n          i = i + 1;\n        } else {\n          i = i + 1;\n          line = lines[i];\n\n          let dateTime = _moment2.default.utc(line['TIMESTAMP']);\n\n          let amount = parseFloat(line['AMOUNT']);\n          let price = Math.abs(parseFloat(line['EQUIV USD']) / amount);\n          let trade = {\n            exchange: 'gdax',\n            dateTime: dateTime,\n            quote: line['CURRENCY'],\n            base: 'USD',\n            amount: amount,\n            price: price,\n            fee: 0.0,\n            feeCurrency: 'USD',\n            type: 'exchange',\n            exchangeTradeId: line['ID']\n          };\n          trades.push(trade);\n        }\n      }\n    }\n  }\n\n  return trades;\n}\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/GdaxAdapter.js?");

/***/ }),

/***/ "./src/resources/KrakenFuturesAdapter.js":
/*!***********************************************!*\
  !*** ./src/resources/KrakenFuturesAdapter.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\nexports.default = processKrakenFuturesLines;\n\nvar _moment = __webpack_require__(/*! moment */ \"moment\");\n\nvar _moment2 = _interopRequireDefault(_moment);\n\nvar _order = __webpack_require__(/*! ./order/order.model */ \"./src/resources/order/order.model.js\");\n\nvar _order2 = _interopRequireDefault(_order);\n\nvar _trade = __webpack_require__(/*! ./trade/trade.model */ \"./src/resources/trade/trade.model.js\");\n\nvar _trade2 = _interopRequireDefault(_trade);\n\nvar _leveragedPosition = __webpack_require__(/*! ./leveraged-position/leveraged-position.model */ \"./src/resources/leveraged-position/leveraged-position.model.js\");\n\nvar _leveragedPosition2 = _interopRequireDefault(_leveragedPosition);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nasync function processKrakenFuturesLines(lines) {\n  var validTypes = ['funding rate change', 'futures trade', 'futures liquidation'];\n\n  const dateToCheck = _moment2.default.utc('2020-03-29 23:07:09');\n\n  var currentEthPosition = new KrakenFuturesPosition();\n  var currentBtcPosition = new KrakenFuturesPosition();\n\n  for (let line of lines) {\n    // parse Date as UTC\n    line.dateTime = _moment2.default.utc(line.dateTime); // Determine wether Eth or Btc position\n    // !!!!\n\n    if (line.account.slice(2, 5) === 'eth') {\n      // Handle line\n      if (validTypes.includes(line.type)) {\n        await currentEthPosition.handleLine(line);\n      } // Check for position completion and commit\n\n\n      if (currentEthPosition.isComplete()) {\n        if (line.dateTime.isAfter(dateToCheck) && line.symbol.slice(0, 2) === 'pi') {\n          continue;\n        }\n\n        await commitPosition(currentEthPosition); //await commitPnl(currentEthPosition);\n\n        currentEthPosition = new KrakenFuturesPosition();\n      }\n    } else if (line.account.slice(2, 5) === 'xbt') {\n      // Handle line\n      if (validTypes.includes(line.type)) {\n        // turn 'xbt' to 'btc'\n        line.symbol = line.symbol.replace(/xbt/i, 'btc');\n        line.account = line.account.replace(/xbt/i, 'btc');\n        line.collateral = line.collateral.replace(/XBT/i, 'BTC');\n        await currentBtcPosition.handleLine(line);\n      } // Check for position completion and commit\n\n\n      if (currentBtcPosition.isComplete()) {\n        if (line.dateTime.isAfter(dateToCheck) && line.symbol.slice(0, 2) === 'pi') {\n          continue;\n        }\n\n        await commitPosition(currentBtcPosition); //await commitPnl(currentBtcPosition);\n\n        currentBtcPosition = new KrakenFuturesPosition();\n      }\n    } else {\n      continue;\n    }\n  }\n}\n\nasync function commitPosition(position) {\n  try {\n    var data = {\n      exchange: 'kraken',\n      dateOpen: position.dateOpen,\n      dateClose: position.dateClose,\n      pnl: position.pnl,\n      avgEntryPrice: position.avgEntryPrice,\n      closePrice: position.closePrice,\n      fundingFee: parseFloat(position.fundingFee),\n      fundingTradeIds: position.fundingTradeIds,\n      basisFee: position.basisFee,\n      basisFeeCurrency: 'USD',\n      basisTradeIds: position.basisTradeIds,\n      compensationTradeIds: position.compensationTradeIds,\n      quote: position.quote,\n      base: 'USD',\n      type: 'futures'\n    };\n    await _leveragedPosition2.default.create({ ...data\n    });\n  } catch (err) {\n    console.log(err);\n  }\n}\n\nasync function commitPnl(position) {\n  try {\n    var data = {\n      exchange: 'kraken',\n      dateTime: position.dateClose,\n      quote: position.quote,\n      base: 'USD',\n      amount: position.pnl / position.closePrice,\n      price: position.closePrice,\n      fee: 0.0,\n      feeCurrency: 'USD',\n      type: 'futures-pnl'\n    };\n    await _order2.default.create({ ...data\n    });\n  } catch (err) {\n    console.log(err);\n  }\n}\n\nclass KrakenFuturesPosition {\n  constructor() {\n    this.basisTradeIds = [];\n    this.fundingTradeIds = [];\n    this.compensationTradeIds = [];\n    this.fundingFee = 0.0;\n    this.basisFee = 0.0;\n    this.pnl = 0.0;\n    this.outstanding = 0.0;\n    this.avgEntryPrice = 0.0;\n    this.closePrice = 0.0;\n    this.dateOpen = null;\n    this.dateClose = null;\n    this.quote = null;\n  }\n\n  isComplete() {\n    return !this.isEmpty() && this.outstanding == 0.0;\n  }\n\n  isEmpty() {\n    return this.basisTradeIds.length == 0;\n  }\n\n  async handleLine(line) {\n    if (this.isEmpty()) {\n      this.dateOpen = line.dateTime;\n      this.quote = line.account.slice(2, 5);\n    }\n\n    if (line.symbol.slice(0, 2) === 'pi') {\n      await this.handleBasisTrade(line);\n      console.log('created basis trade');\n    } else {\n      await this.handleFundingTrade(line);\n    }\n\n    if (this.isComplete()) {\n      this.dateClose = line.dateTime;\n    }\n  }\n\n  async handleBasisTrade(line) {\n    var data = {\n      exchangeTradeId: line.uid,\n      dateTime: line.dateTime,\n      quote: line.account.slice(2, 5),\n      base: 'usd',\n      amount: line.change,\n      price: parseFloat(line['trade price']),\n      type: 'futures-basis',\n      exchange: 'kraken'\n    };\n\n    try {\n      await _trade2.default.create({ ...data\n      }).then(doc => this.basisTradeIds.push(doc._id)); //var doc = await Trade.find({ ...data }).select('id');\n      //this.basisTradeIds.push(doc[0]._id);\n    } catch (err) {\n      console.log(err);\n    }\n\n    this.outstanding = parseFloat(line['new balance']);\n    this.avgEntryPrice = parseFloat(line['new average entry price']);\n    this.closePrice = parseFloat(line['trade price']);\n  }\n\n  async handleFundingTrade(line) {\n    var funding = parseFloat(line['realized funding']);\n    var pnl = parseFloat(line['realized pnl']);\n    var price = parseFloat(line['trade price']);\n    var fee = parseFloat(line['fee']);\n\n    if (funding && funding != 0.0) {\n      this.fundingFee += funding;\n      await this.createFuturesFundingTrade(line);\n      console.log('created futures funding trade');\n    } // if position open or close trade\n\n\n    if (line.type !== 'funding rate change') {\n      this.basisFee += fee * price;\n    } // if line is a position close trade\n\n\n    if (pnl && pnl != 0.0) {\n      this.pnl += pnl * price; // add compensative exchange trade to Trade db\n\n      await this.createCompensationTrade(line);\n      console.log('created compensation trade');\n    }\n  }\n\n  async createCompensationTrade(line) {\n    var data = {\n      exchangeTradeId: line.uid,\n      dateTime: line.dateTime,\n      quote: line.account.slice(2, 5),\n      base: 'usd',\n      price: parseFloat(line['trade price']),\n      amount: parseFloat(line['realized pnl']),\n      exchange: 'kraken',\n      type: 'futures-pnl',\n      comments: 'Compensative trade for futures position'\n    };\n\n    try {\n      await _trade2.default.create({ ...data\n      }).then(doc => this.compensationTradeIds.push(doc._id)); //var doc = await Trade.find({ ...data }).select('id');\n      //this.compensationTradeIds.push(doc[0]._id);\n    } catch (err) {\n      console.log(err);\n    }\n  }\n\n  async createFuturesFundingTrade(line) {\n    var amount = parseFloat(line['realized funding']);\n    if (isNaN(amount)) amount = 0;\n    var price = parseFloat(line['funding rate']);\n    if (isNaN(price)) price = 0;\n    var data = {\n      exchangeTradeId: line.uid,\n      dateTime: line.dateTime,\n      quote: line.account.slice(2, 5),\n      base: 'usd',\n      amount: -amount,\n      price: price,\n      type: 'futures-funding',\n      exchange: 'kraken'\n    };\n\n    try {\n      await _trade2.default.create({ ...data\n      }).then(doc => this.fundingTradeIds.push(doc._id)); //var doc = await Trade.find({ ...data }).select('id');\n      //this.fundingTradeIds.push(doc[0]._id);\n    } catch (err) {\n      console.log(err);\n    }\n  }\n\n}\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/KrakenFuturesAdapter.js?");

/***/ }),

/***/ "./src/resources/leveraged-position/leveraged-position.controller.js":
/*!***************************************************************************!*\
  !*** ./src/resources/leveraged-position/leveraged-position.controller.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _crud = __webpack_require__(/*! ../../utils/crud */ \"./src/utils/crud.js\");\n\nvar _crud2 = _interopRequireDefault(_crud);\n\nvar _trade = __webpack_require__(/*! ../trade/trade.model */ \"./src/resources/trade/trade.model.js\");\n\nvar _trade2 = _interopRequireDefault(_trade);\n\nvar _leveragedPosition = __webpack_require__(/*! ../leveraged-position/leveraged-position.model */ \"./src/resources/leveraged-position/leveraged-position.model.js\");\n\nvar _leveragedPosition2 = _interopRequireDefault(_leveragedPosition);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nasync function deleteOne(req, res) {\n  try {\n    _leveragedPosition2.default.findOneAndDelete({ ...req.body\n    }, (err, removed) => {\n      if (err) res.status(400).end();\n      res.status(200).json({\n        data: removed\n      });\n    });\n  } catch (err) {\n    res.status(400).end();\n  }\n}\n\nasync function deleteAll(req, res) {\n  try {\n    let removed = await _leveragedPosition2.default.deleteMany({});\n    if (!removed) return res.status(400).end();\n    return res.status(200).json({\n      data: removed\n    });\n  } catch (err) {\n    console.log(err);\n    res.status(400).end();\n  }\n}\n\nvar controllers = (0, _crud2.default)(_leveragedPosition2.default);\ncontrollers.deleteOne = deleteOne;\ncontrollers.deleteAll = deleteAll;\nexports.default = controllers;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/leveraged-position/leveraged-position.controller.js?");

/***/ }),

/***/ "./src/resources/leveraged-position/leveraged-position.model.js":
/*!**********************************************************************!*\
  !*** ./src/resources/leveraged-position/leveraged-position.model.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _mongoose = __webpack_require__(/*! mongoose */ \"mongoose\");\n\nvar _mongoose2 = _interopRequireDefault(_mongoose);\n\nvar _orderModel = __webpack_require__(/*! ../order/order.model.js */ \"./src/resources/order/order.model.js\");\n\nvar _orderModel2 = _interopRequireDefault(_orderModel);\n\nvar _tradeModel = __webpack_require__(/*! ../trade/trade.model.js */ \"./src/resources/trade/trade.model.js\");\n\nvar _tradeModel2 = _interopRequireDefault(_tradeModel);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar {\n  Schema\n} = _mongoose2.default;\nvar currencies = ['ETH', 'BTC', 'USD'];\nvar exchanges = ['kraken'];\nvar positionSchema = new Schema({\n  userId: {\n    type: _mongoose2.default.Schema.Types.ObjectId,\n    ref: 'User',\n    default: null\n  },\n  exchange: {\n    type: String,\n    enum: exchanges,\n    required: true,\n    lowercase: true\n  },\n  dateOpen: {\n    type: Date,\n    required: true\n  },\n  dateClose: {\n    type: Date,\n    required: true\n  },\n  pnl: {\n    type: Number,\n    required: true\n  },\n  avgEntryPrice: {\n    type: Number,\n    required: true\n  },\n  closePrice: {\n    type: Number,\n    required: true\n  },\n  fundingFee: {\n    type: Number,\n    required: true\n  },\n  fundingTradeIds: {\n    type: [_mongoose2.default.Schema.Types.ObjectId],\n    required: true\n  },\n  basisFee: {\n    type: Number,\n    required: true\n  },\n  basisFeeCurrency: {\n    type: String,\n    enum: currencies,\n    required: true,\n    uppercase: true\n  },\n  basisTradeIds: {\n    type: [_mongoose2.default.Schema.Types.ObjectId],\n    required: true\n  },\n  compensationTradeIds: {\n    type: [_mongoose2.default.Schema.Types.ObjectId],\n    required: true\n  },\n  quote: {\n    type: String,\n    enum: currencies,\n    required: true,\n    uppercase: true\n  },\n  base: {\n    type: String,\n    enum: currencies,\n    required: true,\n    uppercase: true\n  },\n  comments: {\n    type: String,\n    default: null\n  },\n  type: {\n    type: String,\n    enum: ['futures'],\n    required: true\n  }\n});\n/***Index***/\n\npositionSchema.index({\n  exchange: 1,\n  dateClose: 1,\n  dateOpen: 1,\n  quote: 1,\n  base: 1\n}, {\n  unique: true\n});\n/***Virtual***/\n\n/***Methods***/\n\n/***Hooks***/\n\npositionSchema.post('save', async function () {\n  console.log(\"Position created\");\n});\npositionSchema.post('find', function () {});\npositionSchema.post('deleteOne', function () {\n  console.log(\"Position deleted\");\n});\npositionSchema.post('findOneAndDelete', function () {\n  console.log(\"Position deleted\");\n});\npositionSchema.post('deleteMany', function () {\n  console.log(\"All positions deleted\");\n});\npositionSchema.post('updateOne', function () {\n  console.log(\"Position updated\");\n});\nvar Position = new _mongoose2.default.model('Position', positionSchema);\nexports.default = Position;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/leveraged-position/leveraged-position.model.js?");

/***/ }),

/***/ "./src/resources/leveraged-position/leveraged-position.router.js":
/*!***********************************************************************!*\
  !*** ./src/resources/leveraged-position/leveraged-position.router.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _express = __webpack_require__(/*! express */ \"express\");\n\nvar _express2 = _interopRequireDefault(_express);\n\nvar _leveragedPosition = __webpack_require__(/*! ./leveraged-position.controller */ \"./src/resources/leveraged-position/leveraged-position.controller.js\");\n\nvar _leveragedPosition2 = _interopRequireDefault(_leveragedPosition);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar router = _express2.default.Router(); // /api/leveraged-position\n\n\nrouter.route('/').get(_leveragedPosition2.default.getOne).post(_leveragedPosition2.default.createOne).delete(_leveragedPosition2.default.deleteOne); // /api/leveraged-position/all\n\nrouter.route('/all').get(_leveragedPosition2.default.getAll).delete(_leveragedPosition2.default.deleteAll); // /api/leveraged-position/:id\n\nrouter.route('/:id').get(_leveragedPosition2.default.getOne).delete(_leveragedPosition2.default.deleteOne);\nexports.default = router;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/leveraged-position/leveraged-position.router.js?");

/***/ }),

/***/ "./src/resources/order/order.controllers.js":
/*!**************************************************!*\
  !*** ./src/resources/order/order.controllers.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _crud = __webpack_require__(/*! ../../utils/crud.js */ \"./src/utils/crud.js\");\n\nvar _crud2 = _interopRequireDefault(_crud);\n\nvar _orderModel = __webpack_require__(/*! ./order.model.js */ \"./src/resources/order/order.model.js\");\n\nvar _orderModel2 = _interopRequireDefault(_orderModel);\n\nvar _tradeModel = __webpack_require__(/*! ../trade/trade.model.js */ \"./src/resources/trade/trade.model.js\");\n\nvar _tradeModel2 = _interopRequireDefault(_tradeModel);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nasync function deleteOne(req, res) {\n  try {\n    _orderModel2.default.findOneAndDelete({ ...req.body\n    }, function (err, removed) {\n      if (err) return res.status(400).end(); // delete subtrades\n\n      removed.tradeIds.forEach(async id => {\n        await _tradeModel2.default.deleteOne({\n          \"_id\": id\n        });\n      });\n      return res.status(200).json({\n        data: removed\n      });\n    });\n  } catch (err) {\n    console.log(err);\n    res.status(400).end();\n  }\n}\n\nasync function deleteAll(req, res) {\n  try {\n    let removed = await _orderModel2.default.deleteMany({});\n    if (!removed) return res.status(400).end(); // if order deletion successful, delete all trades\n\n    await _tradeModel2.default.deleteMany({});\n    return res.status(200).json({\n      data: removed\n    });\n  } catch (err) {\n    console.log(err);\n    res.status(400).end();\n  }\n}\n\nvar controllers = (0, _crud2.default)(_orderModel2.default);\ncontrollers.deleteOne = deleteOne;\ncontrollers.deleteAll = deleteAll;\nexports.default = controllers;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/order/order.controllers.js?");

/***/ }),

/***/ "./src/resources/order/order.model.js":
/*!********************************************!*\
  !*** ./src/resources/order/order.model.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _mongoose = __webpack_require__(/*! mongoose */ \"mongoose\");\n\nvar _mongoose2 = _interopRequireDefault(_mongoose);\n\nvar _tradeModel = __webpack_require__(/*! ../trade/trade.model.js */ \"./src/resources/trade/trade.model.js\");\n\nvar _tradeModel2 = _interopRequireDefault(_tradeModel);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar {\n  Schema\n} = _mongoose2.default;\nvar currencies = ['ETH', 'BTC', 'USD'];\nvar exchanges = ['bitfinex', 'poloniex', 'kraken', 'binance', 'gemini', 'coinbase', 'gdax'];\nvar orderSchema = new Schema({\n  userId: {\n    type: _mongoose2.default.Schema.Types.ObjectId,\n    ref: 'User',\n    default: null\n  },\n  exchange: {\n    type: String,\n    enum: exchanges,\n    required: true,\n    lowercase: true\n  },\n  exchangeOrderId: {\n    type: String,\n    default: null\n  },\n  dateTime: {\n    type: Date,\n    required: true\n  },\n  amount: {\n    type: Number,\n    required: true\n  },\n  price: {\n    type: Number,\n    required: true\n  },\n  quote: {\n    type: String,\n    enum: currencies,\n    required: true,\n    uppercase: true\n  },\n  base: {\n    type: String,\n    enum: currencies,\n    required: true,\n    uppercase: true\n  },\n  fee: {\n    type: Number,\n    default: 0\n  },\n  feeCurrency: {\n    type: String,\n    enum: currencies,\n    default: \"USD\",\n    uppercase: true\n  },\n  type: {\n    type: String,\n    enum: ['exchange', 'margin', 'futures-basis', 'futures-funding', 'futures-pnl'],\n    required: true\n  },\n  comments: {\n    type: String,\n    default: null\n  },\n  tradeIds: {\n    type: [_mongoose2.default.Schema.Types.ObjectId],\n    required: true,\n    ref: 'Trade'\n  }\n});\n/***Index***/\n\norderSchema.index({\n  dateTime: 1,\n  type: 1,\n  exchange: 1,\n  exchangeOrderId: 1,\n  quote: 1,\n  base: 1\n}, {\n  unique: true\n});\n/***Statics***/\n\norderSchema.statics.sumAmount = function (orders) {\n  var amount = 0;\n  orders.forEach(trade => {\n    amount += trade.amount;\n  });\n  return amount;\n};\n/***Methods***/\n\n/***Hooks***/\n\n\norderSchema.pre('save', async function () {// if order exists in db -> skip\n\n  /*\n  var exists = await this.exists;\n  if (exists) throw Error(\"Order already exists\");\n  */\n});\norderSchema.post('save', function () {\n  console.log(\"Order created\");\n});\norderSchema.post('findOneAndDelete', function () {\n  console.log(\"Order deleted\");\n});\norderSchema.post('deleteMany', function () {\n  console.log(\"All orders deleted\");\n});\norderSchema.post('updateOne', function () {\n  console.log(\"Order updated\");\n});\n/***Virtuals***/\n\n/*\norderSchema.virtual('exists').get(async function() {\n\t\tvar queryParams = {\n\t\t\t\texchange: this.exchange,\n\t\t\t\texchangeOrderId: this.exchangeOrderId,\n\t\t\t\tdateTime: this.dateTime,\n\t\t};\n\n\t\tvar exists = false;\n\t\ttry {\n\t\t\t\tlet doc = await Order.findOne(queryParams);\n\t\t\t\tif (doc) exists = true;\n\t\t} catch (err) {\n\t\t\t\tconsole.error(err);\n\t\t}\n\t\treturn exists;\n});\n*/\n\norderSchema.virtual('isComplete').get(async function () {\n  var trades = [];\n\n  try {\n    trades = await _tradeModel2.default.find({\n      orderId: this._id\n    }).exec();\n  } catch (err) {\n    console.error(err);\n  }\n\n  return this.amount == _tradeModel2.default.sumAmount(trades);\n});\nvar Order = new _mongoose2.default.model('Order', orderSchema); // Must be at bottom of file for hooks to work\n\nexports.default = Order;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/order/order.model.js?");

/***/ }),

/***/ "./src/resources/order/order.router.js":
/*!*********************************************!*\
  !*** ./src/resources/order/order.router.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _express = __webpack_require__(/*! express */ \"express\");\n\nvar _express2 = _interopRequireDefault(_express);\n\nvar _orderControllers = __webpack_require__(/*! ./order.controllers.js */ \"./src/resources/order/order.controllers.js\");\n\nvar _orderControllers2 = _interopRequireDefault(_orderControllers);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar router = _express2.default.Router(); // /api/order\n\n\nrouter.route('/').get(_orderControllers2.default.getOne).post(_orderControllers2.default.createOne).delete(_orderControllers2.default.deleteOne); // /api/order/all\n\nrouter.route('/all').get(_orderControllers2.default.getAll).delete(_orderControllers2.default.deleteAll); // /api/order/:id\n\nrouter.route('/:id').get(_orderControllers2.default.getOne).delete(_orderControllers2.default.deleteOne);\nexports.default = router;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/order/order.router.js?");

/***/ }),

/***/ "./src/resources/trade/trade.controllers.js":
/*!**************************************************!*\
  !*** ./src/resources/trade/trade.controllers.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _crud = __webpack_require__(/*! ../../utils/crud.js */ \"./src/utils/crud.js\");\n\nvar _crud2 = _interopRequireDefault(_crud);\n\nvar _tradeModel = __webpack_require__(/*! ./trade.model.js */ \"./src/resources/trade/trade.model.js\");\n\nvar _tradeModel2 = _interopRequireDefault(_tradeModel);\n\nvar _orderModel = __webpack_require__(/*! ../order/order.model.js */ \"./src/resources/order/order.model.js\");\n\nvar _orderModel2 = _interopRequireDefault(_orderModel);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nasync function deleteOne(req, res) {\n  try {\n    _tradeModel2.default.findOneAndDelete({ ...req.body\n    }, async function (err, removed) {\n      if (err) return res.status(400).end(); // delete tradeId from parent order\n\n      let id = removed.orderId;\n      let parentOrder = await _orderModel2.default.findById(id);\n      let tradeIds = parentOrder.tradeIds;\n      tradeIds.splice(tradeIds.indexOf(removed.id), 1);\n      await parentOrder.updateOne({\n        tradeIds: tradeIds\n      });\n      return res.status(200).json({\n        data: removed\n      });\n    });\n  } catch (err) {\n    console.log(err);\n    res.status(400).end();\n  }\n}\n\nasync function deleteAll(req, res) {\n  try {\n    let removed = await _tradeModel2.default.deleteMany({});\n    if (!removed) return res.status(400).end();\n    return res.status(200).json({\n      data: removed\n    });\n  } catch (err) {\n    console.log(err);\n    res.status(400).end();\n  }\n}\n\nvar controllers = (0, _crud2.default)(_tradeModel2.default);\ncontrollers.deleteOne = deleteOne;\ncontrollers.deleteAll = deleteAll;\nexports.default = controllers;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/trade/trade.controllers.js?");

/***/ }),

/***/ "./src/resources/trade/trade.model.js":
/*!********************************************!*\
  !*** ./src/resources/trade/trade.model.js ***!
  \********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _mongoose = __webpack_require__(/*! mongoose */ \"mongoose\");\n\nvar _mongoose2 = _interopRequireDefault(_mongoose);\n\nvar _orderModel = __webpack_require__(/*! ../order/order.model.js */ \"./src/resources/order/order.model.js\");\n\nvar _orderModel2 = _interopRequireDefault(_orderModel);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar {\n  Schema\n} = _mongoose2.default;\nvar currencies = ['ETH', 'BTC', 'USD'];\nvar exchanges = ['bitfinex', 'poloniex', 'kraken', 'binance', 'gdax', 'gemini', 'coinbase'];\nvar tradeSchema = new Schema({\n  userId: {\n    type: _mongoose2.default.Schema.Types.ObjectId,\n    ref: 'User',\n    default: null\n  },\n  exchange: {\n    type: String,\n    enum: exchanges,\n    required: true,\n    lowercase: true\n  },\n  exchangeTradeId: {\n    type: String,\n    default: null\n  },\n  dateTime: {\n    type: Date,\n    required: true\n  },\n  amount: {\n    type: Number,\n    required: true\n  },\n  price: {\n    type: Number,\n    required: true\n  },\n  quote: {\n    type: String,\n    enum: currencies,\n    required: true,\n    uppercase: true\n  },\n  base: {\n    type: String,\n    enum: currencies,\n    uppercase: true,\n    required: true\n  },\n  fee: {\n    type: Number,\n    default: 0\n  },\n  feeCurrency: {\n    type: String,\n    enum: currencies,\n    default: \"USD\",\n    uppercase: true\n  },\n  type: {\n    type: String,\n    enum: ['exchange', 'margin', 'futures-basis', 'futures-funding', 'futures-pnl'],\n    required: true\n  },\n  orderId: {\n    type: _mongoose2.default.Schema.Types.ObjectId,\n    ref: 'Order',\n    default: null\n  },\n  exchangeOrderId: {\n    type: Number,\n    default: null\n  }\n});\n/***Index***/\n\ntradeSchema.index({\n  dateTime: 1,\n  type: 1,\n  exchange: 1,\n  exchangeOrderId: 1,\n  exchangeTradeId: 1,\n  quote: 1,\n  base: 1\n});\n/***Statics***/\n\ntradeSchema.statics.sumAmount = function (trades) {\n  var amount = 0;\n  trades.forEach(trade => {\n    amount += trade.amount;\n  });\n  return amount;\n};\n/***Methods***/\n\n\ntradeSchema.methods.associate = async function (order) {\n  // associate Order with Trade\n  var tradeIds = order.tradeIds;\n  tradeIds.push(this._id);\n  order = await _orderModel2.default.findByIdAndUpdate(order._id, {\n    tradeIds: tradeIds\n  }, {\n    new: true\n  }); // associate Trade with Order \n\n  this.orderId = order.id;\n  this.exchangeOrderId = order.exchangeOrderId;\n};\n\ntradeSchema.methods.findParentOrder = async function () {\n  var order; // conidition on exchangeOrderId\n\n  try {\n    if (this.exchangeOrderId) {\n      order = await _orderModel2.default.findOne({\n        'exchangeOrderId': this.exchangeOrderId,\n        'exchange': this.exchange\n      }).exec();\n    } else {\n      order = await _orderModel2.default.findOne({\n        'exchange': this.exchange,\n        'quote': this.quote,\n        'base': this.base,\n        'type': this.type,\n        'dateStart': {\n          $lte: this.date\n        },\n        'dateStop': {\n          $gte: this.date\n        }\n      }).exec();\n    }\n  } catch (err) {\n    console.error(err);\n  }\n\n  if (!order) throw Error(\"No parent order found\");\n  return order;\n};\n/***Hooks***/\n\n\ntradeSchema.pre('save', async function (next) {\n  // if trade exists in db -> skip\n  //var exists = await this.exists;\n  //if (exists) throw Error(\"Trade already exists\");\n  // if futures trade\n  if (this.type !== 'exchange' || this.exchange === 'gdax') next(); // if parent order not found, will throw an error\n\n  var parentOrder = await this.findParentOrder(); // if order is complete -> skip\n\n  if (await parentOrder.isComplete) throw Error(\"Parent order already complete\"); // if trade amount exceeds remaining amount left in order -> skip\n\n  var trades = await Trade.find({\n    '_id': {\n      $in: parentOrder.tradeIds\n    }\n  });\n  var filledAmount = Trade.sumAmount(trades);\n  if (filledAmount + this.amount > parentOrder.amount) throw Error(\"Max amount exceeded\"); // associate with parent order\n\n  await this.associate(parentOrder);\n});\ntradeSchema.post('save', async function () {\n  console.log(\"Trade created\");\n});\ntradeSchema.post('find', function () {});\ntradeSchema.post('deleteOne', function () {\n  console.log(\"Trade deleted\");\n});\ntradeSchema.post('findOneAndDelete', function () {\n  console.log(\"Trade deleted\");\n});\ntradeSchema.post('deleteMany', function () {\n  console.log(\"All trades deleted\");\n});\ntradeSchema.post('updateOne', function () {\n  console.log(\"Trade updated\");\n});\n/***Virtuals***/\n\ntradeSchema.virtual('pair').get(function () {\n  return `${this.quote}${this.base}`;\n});\ntradeSchema.virtual('exists').get(async function () {\n  var queryParams = {\n    exchange: this.exchange,\n    exchangeTradeId: this.exchangeTradeId\n  };\n  var exists = false;\n\n  try {\n    var doc = await Trade.findOne(queryParams);\n    if (doc) exists = true;\n  } catch (err) {\n    console.error(err);\n  }\n\n  return exists;\n});\n/*\ntradeSchema.virtual('orderIsComplete').get(async function() {\n\n\t\tvar order = await Order.findById(this.orderId);\n\n\t\treturn order.isComplete ? true : false;\n});\n*/\n\nvar Trade = new _mongoose2.default.model('Trade', tradeSchema);\nexports.default = Trade;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/trade/trade.model.js?");

/***/ }),

/***/ "./src/resources/trade/trade.router.js":
/*!*********************************************!*\
  !*** ./src/resources/trade/trade.router.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar _express = __webpack_require__(/*! express */ \"express\");\n\nvar _express2 = _interopRequireDefault(_express);\n\nvar _tradeControllers = __webpack_require__(/*! ./trade.controllers.js */ \"./src/resources/trade/trade.controllers.js\");\n\nvar _tradeControllers2 = _interopRequireDefault(_tradeControllers);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar router = _express2.default.Router(); // /api/trade\n\n\nrouter.route('/').get(_tradeControllers2.default.getOne).post(_tradeControllers2.default.createOne).delete(_tradeControllers2.default.deleteOne); // /api/trade/all\n\nrouter.route('/all').get(_tradeControllers2.default.getAll).delete(_tradeControllers2.default.deleteAll); // /api/trade/:id\n\nrouter.route('/:id').get(_tradeControllers2.default.getOne).delete(_tradeControllers2.default.deleteOne);\nexports.default = router;\n\n//# sourceURL=webpack://beartracks-backend/./src/resources/trade/trade.router.js?");

/***/ }),

/***/ "./src/router.js":
/*!***********************!*\
  !*** ./src/router.js ***!
  \***********************/
/***/ ((__unused_webpack_module, __unused_webpack_exports, __webpack_require__) => {

eval("\n\nvar _db = __webpack_require__(/*! ./db */ \"./src/db.js\");\n\nvar _KrakenFuturesAdapter = __webpack_require__(/*! ./resources/KrakenFuturesAdapter */ \"./src/resources/KrakenFuturesAdapter.js\");\n\nvar _KrakenFuturesAdapter2 = _interopRequireDefault(_KrakenFuturesAdapter);\n\nvar _CoinbaseAdapter = __webpack_require__(/*! ./resources/CoinbaseAdapter */ \"./src/resources/CoinbaseAdapter.js\");\n\nvar _CoinbaseAdapter2 = _interopRequireDefault(_CoinbaseAdapter);\n\nvar _GdaxAdapter = __webpack_require__(/*! ./resources/GdaxAdapter */ \"./src/resources/GdaxAdapter.js\");\n\nvar _GdaxAdapter2 = _interopRequireDefault(_GdaxAdapter);\n\nvar _papaparse = __webpack_require__(/*! papaparse */ \"papaparse\");\n\nvar _papaparse2 = _interopRequireDefault(_papaparse);\n\nvar _axios = __webpack_require__(/*! axios */ \"axios\");\n\nvar _axios2 = _interopRequireDefault(_axios);\n\nvar _fs = __webpack_require__(/*! fs */ \"fs\");\n\nvar _fs2 = _interopRequireDefault(_fs);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n(0, _db.start)();\n\n_db.app.use((req, res, next) => {\n  res.header('Access-Control-Allow-Origin', '*');\n  res.header('Access-Control-Allow-Methods', '*');\n  res.header('Access-Control-Allow-Headers', '*');\n  next();\n});\n/*\napp.use((req, res, next) => {\n\t\tres.header('Access-Control-Allow-Origin', '*');\n\t\tres.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');\n\t\tres.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');\n\t\tnext();\n});\n*/\n\n\n_db.app.post('/process-kraken-futures-trades', async (req, res, next) => {\n  res.status(200);\n  res.send('success');\n  var lines = Object.keys(req.body).map(key => req.body[key]);\n  await (0, _KrakenFuturesAdapter2.default)(lines.reverse());\n});\n\n_db.app.post('/process-gdax-trades', async (req, res, next) => {\n  res.status(200);\n  res.send('success');\n  var lines = Object.keys(req.body).map(key => req.body[key]);\n  await (0, _GdaxAdapter2.default)(lines);\n});\n\n_db.app.post('/process-coinbase-trades', async (req, res, next) => {\n  res.status(200);\n  res.send('success');\n  var lines = Object.keys(req.body).map(key => req.body[key]);\n  await (0, _CoinbaseAdapter2.default)(lines.reverse());\n});\n\n_db.app.get('/print-trades', async (req, res, next) => {\n  try {\n    var orders = await _axios2.default.get('http://localhost:3000/api/order/all');\n    var trades = await _axios2.default.get('http://localhost:3000/api/trade/all');\n    var csv = tradesToCsv(orders.data.data, trades.data.data);\n\n    _fs2.default.writeFile('../trades.csv', csv, err => {\n      if (err) throw err;\n    });\n\n    res.status(200);\n    res.send('File created');\n  } catch (err) {\n    console.log(err);\n    res.status(400);\n    res.send(err);\n  }\n});\n\n_db.app.get('/print-positions', async (req, res, next) => {\n  try {\n    var positions = await _axios2.default.get('http://localhost:3000/api/leveraged-position/all');\n    var csv = positionsToCsv(positions.data.data);\n\n    _fs2.default.writeFile('../positions.csv', csv, err => {\n      if (err) throw err;\n    });\n\n    res.status(200);\n    res.send('File created');\n  } catch (err) {\n    console.log(err);\n    res.status(400);\n    res.send(err);\n  }\n});\n\nfunction converToObj(item) {\n  let buyAmount, buyCurrency, sellAmount, sellCurrency;\n\n  if (item.amount > 0) {\n    buyAmount = item.amount;\n    buyCurrency = item.quote;\n    sellAmount = item.amount * item.price;\n    sellCurrency = item.base;\n  } else {\n    buyAmount = -item.amount * item.price;\n    buyCurrency = item.base;\n    sellAmount = -item.amount;\n    sellCurrency = item.quote;\n  }\n\n  return {\n    'Type': 'Trade',\n    'Buy Amount': buyAmount,\n    'Buy Currency': buyCurrency,\n    'Sell Amount': sellAmount,\n    'Sell Currency': sellCurrency,\n    'Fee': item.fee,\n    'Fee Currency': item.feeCurrency,\n    'Exchange': item.exchange,\n    'Trade-Group': null,\n    'Comment': null,\n    'Date': item.dateTime\n  };\n}\n\nfunction tradesToCsv(orders, trades) {\n  var ret = [];\n\n  for (let order of orders) {\n    ret.push(converToObj(order));\n  }\n\n  for (let trade of trades) {\n    if (trade.type === 'futures-pnl') {\n      ret.push(converToObj(trade));\n    }\n  }\n\n  return _papaparse2.default.unparse(ret, {\n    header: true\n  });\n}\n\nfunction positionsToCsv(positions) {\n  var ret = [];\n\n  for (let position of positions) {\n    ret.push({\n      'Date Open': position.dateOpen,\n      'Date Close': position.dateClose,\n      'Quote': position.quote,\n      'Base': position.base,\n      'Average Entry Price': position.avgEntryPrice,\n      'Close Price': position.closePrice,\n      'Gross PNL': position.pnl,\n      'Basis Fee': position.basisFee,\n      'Basis Fee Currency': position.basisFeeCurrency,\n      'Funding Fee': position.fundingFee,\n      'Funding Fee Currency': position.quote,\n      'Net PNL': position.pnl - position.basisFee - position.fundingFee * position.closePrice,\n      'Exchange': position.exchange\n    });\n  }\n\n  return _papaparse2.default.unparse(ret, {\n    header: true\n  });\n}\n\n_db.app.listen(3000, () => {\n  console.log('Listening on port 3000');\n});\n\n//# sourceURL=webpack://beartracks-backend/./src/router.js?");

/***/ }),

/***/ "./src/utils/crud.js":
/*!***************************!*\
  !*** ./src/utils/crud.js ***!
  \***************************/
/***/ ((__unused_webpack_module, exports) => {

eval("\n\nObject.defineProperty(exports, \"__esModule\", ({\n  value: true\n}));\n\nvar createOne = model => async (req, res) => {\n  try {\n    let doc = await model.create({ ...req.body\n    });\n    res.status(201).json({\n      data: doc\n    });\n  } catch (e) {\n    console.log(e);\n    res.status(400).end();\n    console.log;\n  }\n};\n\nvar getOne = model => async (req, res) => {\n  try {\n    let doc = await model.find({ ...req.body\n    }).lean().exec();\n    res.status(200).json({\n      data: doc\n    });\n  } catch (e) {\n    console.log(e);\n    res.status(400).end();\n  }\n};\n\nvar getAll = model => async (req, res) => {\n  try {\n    let docs = await model.find({}).lean().exec();\n    res.status(200).json({\n      data: docs\n    });\n  } catch (e) {\n    console.log(e);\n    res.status(400).end();\n  }\n};\n\nexports.default = model => {\n  return {\n    createOne: createOne(model),\n    getOne: getOne(model),\n    //deleteOne: deleteOne(model),\n    //deleteAll: deleteAll(model),\n    getAll: getAll(model)\n  };\n};\n\n//# sourceURL=webpack://beartracks-backend/./src/utils/crud.js?");

/***/ }),

/***/ "axios":
/*!************************!*\
  !*** external "axios" ***!
  \************************/
/***/ ((module) => {

module.exports = require("axios");;

/***/ }),

/***/ "body-parser":
/*!******************************!*\
  !*** external "body-parser" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("body-parser");;

/***/ }),

/***/ "express":
/*!**************************!*\
  !*** external "express" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("express");;

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");;

/***/ }),

/***/ "moment":
/*!*************************!*\
  !*** external "moment" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("moment");;

/***/ }),

/***/ "mongoose":
/*!***************************!*\
  !*** external "mongoose" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("mongoose");;

/***/ }),

/***/ "papaparse":
/*!****************************!*\
  !*** external "papaparse" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("papaparse");;

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = __webpack_require__("./src/router.js");
/******/ 	
/******/ })()
;