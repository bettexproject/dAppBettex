const config = require('../config');
const axios = require('axios');
const _ = require('lodash');
const moment = require('moment');
const { importForDate } = require('../subeventresults');

const importAll = async (app) => {
    for (let i = -7; i <= 7; i++) {
        const scanDate = moment().add(i, 'd').format('YYYY-MM-DD');

        const data = {};

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