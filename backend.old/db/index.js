const mongoose = require('mongoose');
const config = require('../config');
const configModel = require('./config');
const userModel = require('./user');


module.exports = async () => {
    mongoose.connect(config.mongo);

    const proofEventSchema = new mongoose.Schema({
        blockNumber: Number,
        hash: {
            type: String,
            unique: true,
        },
        type: String,
        data: String,
    });

    proofEventSchema.index({ blockNumber: 1 });
    const proofEvent = mongoose.model('proofEvent', proofEventSchema);

    const models = {
        mongoose,
    };
    models.config = configModel(models);
    models.user = userModel(models);
    models.proofEvent = proofEvent;
    
    return models;
};
