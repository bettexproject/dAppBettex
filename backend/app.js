const models = require('./models');
const scanner = require('./scanner');
const miner = require('./miner');

const app = {};

models(app).then(() => {
    scanner(app);
    miner(app);
});


