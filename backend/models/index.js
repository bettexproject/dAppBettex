const mongoose = require('mongoose');
const config = require('../config');
const configModel = require('./config');
const proofModel = require('./proof');

module.exports = async (app) => {
    await mongoose.connect(config.mongo);
    app.mongoose = mongoose;
    app.models = {};
    configModel(app);
    proofModel(app);
};
