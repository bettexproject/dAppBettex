const _ = require('lodash');

const subevents = {
    1: 't1',
    2: 't2',
    3: 'draw',
};

module.exports = {
    subevents,
    subeventsReverse: _.invert(subevents),
};
