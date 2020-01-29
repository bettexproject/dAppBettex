const config = require('../config');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { importForDate } = require('../subeventresults');

const importAll = async (app) => {
    for (let i = config.sportrDepthFrom; i <= config.sportrDepthTo; i++) {
        const scanDate = moment().add(i, 'd').format('YYYY-MM-DD');

        const data = {};

        console.log('import for date', scanDate);
        await importForDate(scanDate, data);
        const keys = _.keys(data);
        for (let i = 0; i < keys.length; i++) {
            await app.models.sportr.createOrUpdate(data[keys[i]]);
        }
    }
}

module.exports = (app) => {
    importAll(app);
};