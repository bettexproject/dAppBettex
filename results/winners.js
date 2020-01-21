const _ = require('lodash');
const axios = require('axios');
const { importForDate, getEventResultsFromStruct } = require('./subeventresults');
const { subevents } = require('./subevents');

const main = async () => {
    let retval = '';
    const eventid = process.env.ARG0;
    const date = process.env.ARG1;
    const sport = process.env.ARG2;
    const data = {};
    await importForDate(date, data, sport);
    if (data[eventid]) {
        const results = getEventResultsFromStruct(data[eventid]);
        _.forEach(subevents, (memo, id) => {
            if (results[memo]) {
                retval += ('000000000000000' + id.toString(16).substr(-16));
            }
        });
    }
    console.log(retval);
};

main();
