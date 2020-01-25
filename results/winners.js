const _ = require('lodash');
const axios = require('axios');
const { importForDate, getEventResultsFromStruct } = require('./subeventresults');
const { subevents } = require('./subevents');

const uint64str = (uint) => ('0000000000000000' + id.toString(16).substr(-16));
const uintArrStr = (arr) => {
    const arrStr = _.map(arr, uint64str);
    return `${uint64str(arr.length)}${arrStr.join()}`;
}

const main = async () => {
    const trueEvents = [];
    const falseEvents = [];
    const eventid = process.env.ARG0;
    const date = process.env.ARG1;
    const sport = process.env.ARG2;
    const data = {};
    await importForDate(date, data, sport);
    if (data[eventid]) {
        const results = getEventResultsFromStruct(data[eventid]);
        _.forEach(subevents, (memo, id) => {
            if (results[memo] === true) {
                trueEvents.push(id);
            }
            if (results[memo] === false) {
                falseEvents.push(id);
            }
        });
    }
    console.log(`${uintArrStr(trueEvents)}${uintArrStr(falseEvents)}`);
};

main();
