//import hmacSHA256 from 'crypto-js/hmac-sha256';
import moment from 'moment';
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
    var path = '/api/fills';
    var startTimeParam = '?start_time=0'
    var endTimeParam = `&end_time=${Math.floor(Date.now()/1000)}`;
    var headers = this.generateAuthHeaders(path + startTimeParam + endTimeParam);
    try {
      let res = await axios.get(this.mainUrl + path + startTimeParam + endTimeParam, {
        headers: headers
      })
      let data = res.data.result;
      return data;
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
        console.log(data);
        orders.push(data);
        lastDate = data[data.length - 1].createdAt;
        endTimeParam = `&end_time=${Math.floor(new Date(lastDate)/1000)}`;
      }

      return orders;
    } catch (err) {
      console.log(err);
    }
  }

  getHistoricalPrices(marketName, dateTime) {
    var path = '/api/markets/' + marketName + '/candles?resolution=15';
    var endTimeParam = `&end_time=${Math.floor(new Date(dateTime)/1000)}`;
    axios.get(this.mainUrl + path + endTimeParam)
    .then(res => res.data.result)
    .catch(err => console.log(err))
  }

  getBorrowHistory() {

  }
}
