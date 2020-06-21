const models = require('./models');
const scanner = require('./scanner');
const miner = require('./miner');
const sportr = require('./sportr');
const api = require('./api');

const app = {};

models(app).then(() => {
    scanner(app);
    miner(app);
    sportr(app);
    api(app);
});

