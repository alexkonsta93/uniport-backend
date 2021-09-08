export default class KrakenClient {
  constructor(key, secret) {
    this.key = key;
    this.secret = secret;
    this.mainUrl = 'https://ftx.com';
  }
}
