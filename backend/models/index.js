const mongoose = require('mongoose');
const config = require('../config');
const configModel = require('./config');
const proofModel = require('./proof');
const snapModel = require('./snap');
const sportrModel = require('./sportr');
const unpaidModel = require('./unpaid');

module.exports = async (app) => {
    await mongoose.connect(config.mongo);
    app.mongoose = mongoose;
    app.models = {};
    configModel(app);
    proofModel(app);
    snapModel(app);
    sportrModel(app);
    unpaidModel(app);
};
