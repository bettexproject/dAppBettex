const fs = require('fs');
const abi = require('./abi');

module.exports = {
    ODDS_PRECISION: 100,

    subevents: {
        1: 't1',
        2: 't2',
        3: 'draw',
    },

    proofMethods: {
        bet: 1,
        deposit: 1,
        cancel: 1,
        withdraw: 1,
    },

    FetchResultActivated: '0x36323d6466ffb8bdfde5e5e719ee14d5afff4fdda2ade0c3a1cbd80109ac9b48',

    rescanDepth: 3,
    confirmations: 1,
    forceMineEmpty: 100,
    maxEmptyPerRequest: 1000,
    abi,
};
