import axios from 'axios';
import CryptoJS from 'crypto-js';

export class FtxClient {
  constructor(key, secret) {
    this.key = key;
    this.secret = secret;
    this.mainUrl = 'https://ftx.com';
  }

  generateAuthHeaders(path) {
    var timestamp = Date.now();
    var message = `${timestamp}GET${path}`;
    var signature = CryptoJS.HmacSHA256(message, this.secret)
    signature = signature.toString(CryptoJS.enc.Hex);
    return {
      'FTX-KEY': this.key,
      'FTX-SIGN': signature,
      'FTX-TS': timestamp
    };
  }

  getPositions() {
    var path = '/api/positions';
    var headers = this.generateAuthHeaders(path);
    axios.get(this.mainUrl + path, {
      headers: headers
    })
    .then(res => console.log(res.data.result))
    .catch(err => console.log(err))
  }

  async getFills() {
    // max return amount is 5000 trades

    var fills = [];
    var path = '/api/fills';
    var startTimeParam = '?start_time=0'
    var endTimeParam = `&end_time=${Math.floor(Date.now()/1000)}`;
    //var endTimeParam = '&end_time=1614300261';
    var headers = this.generateAuthHeaders(path + startTimeParam + endTimeParam);
    try {
      let res = await axios.get(this.mainUrl + path + startTimeParam + endTimeParam, {
        headers: headers
      })
      let data = res.data.result;
      let firstDate = data[data.length - 1].time;
      endTimeParam = `&end_time=${Math.floor(new Date(firstDate)/1000) - 1}`;
      fills.push( ...data );

      while (data.length === 5000) {
        headers = this.generateAuthHeaders(path + startTimeParam + endTimeParam);
        res = await axios.get(this.mainUrl + path + startTimeParam + endTimeParam, {
          headers: headers
        })
        data = res.data.result;
        firstDate = data[data.length - 1].time;
        endTimeParam = `&end_time=${Math.floor(new Date(firstDate)/1000) - 1}`;
        fills.push( ...data );
      }

      return fills;
    } catch (err) {
      console.log(err);
    }
  }

  async getOrderHistory() {
    var hasMoreData = true;
    var orders = [];
    var path = '/api/orders/history';
    var startTimeParam = '?start_time=0'
    var endTimeParam = `&end_time=${Math.floor(Date.now()/1000)}`;
    var headers = this.generateAuthHeaders(path + startTimeParam + endTimeParam);

    try {
      let res = await axios.get(this.mainUrl + path + startTimeParam + endTimeParam, {
        headers: headers
      });
      let data = res.data.result;
      orders.push(data);
      let lastDate = data[data.length - 1].createdAt;
      endTimeParam = `&end_time=${Math.floor(new Date(lastDate)/1000)}`;
      hasMoreData = res.data.hasMoreData;

      while (hasMoreData) {
        headers = this.generateAuthHeaders(path + startTimeParam + endTimeParam);
        let res = await axios.get(this.mainUrl + path + startTimeParam + endTimeParam, {
          headers: headers
        });
        hasMoreData = res.data.hasMoreData;
        data = res.data.result;
        orders.push(data);
        lastDate = data[data.length - 1].createdAt;
        endTimeParam = `&end_time=${Math.floor(new Date(lastDate)/1000)}`;
      }

      return orders;
    } catch (err) {
      console.log(err);
    }
  }

  async getHistoricalPrices(marketName, dateTime) {
    var path = '/api/markets/' + marketName + '/candles?resolution=15';
    var endTimeParam = `&end_time=${Math.floor(new Date(dateTime)/1000)}`;
    try {
      let res = await axios.get(this.mainUrl + path + endTimeParam);
      let data = res.data.result[res.data.result.length - 1].close;
      return data;
    } catch (err) {
      console.log(err);
    }
  }

  async getBorrowHistory() {
    var path = '/api/spot_margin/borrow_history';
    var headers = this.generateAuthHeaders(path);
    try {
      let res = await axios.get(this.mainUrl + path, { headers: headers })
      return res.data.result;
    } catch (err) {
      console.log(err);
    }
  }

  async getFundingPayments(startTime = 0, endTime = Date.now(), market = null) {
    var path = '/api/funding_payments';
    var startTimeParam = `?start_time=${Math.floor(startTime/1000)}`
    var endTimeParam = `&end_time=${Math.floor(endTime/1000)}`;
    var futureParam = '';
    if (market) futureParam = `&future=${market}`;
    var headers = this.generateAuthHeaders(
      path + startTimeParam + endTimeParam + futureParam
    );
    try {
      let res = await axios.get(
        this.mainUrl + path + startTimeParam + endTimeParam + futureParam,
        { headers: headers }
      );
      return res.data.result;
    } catch (err) {
      console.log(err);
    }
  }
}
