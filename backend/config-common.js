const fs = require('fs');
const abi = JSON.parse(fs.readFileSync('./abi.json'));

module.exports = {
    sports: [1, 2, 4, 5],
    countryWhitelist: [
        'England',
        'France',
        'Germany',
        'International',
        'International Clubs',
        'Italy',
        'Netherlands',
        'Portugal',
        'Russia',
        'Spain',
        'Ukraine',
        'USA',
        'ATP',
        'WTA',
    ],

    ODDS_PRECISION: 100,

    subevents: {
        1: 't1',
        2: 't2',
        3: 'draw',
    },

    proofEvents: {
        '0x92044645a95d9bb19c5fc216e5be180a47a434f0aeb5263c9a36c38f9ad65325': 'bet',
        '0xeaa18152488ce5959073c9c79c88ca90b3d96c00de1f118cfaad664c3dab06b9': 'deposit',
        '0x9da6493a92039daf47d1f2d7a782299c5994c6323eb1e972f69c432089ec52bf': 'withdraw',
        '0x4e4fbd9f26259e82cfb30871ba8fb37535ebc893e81ff81141c1a2dc925d930f': 'cancel',
    },
    rescanDepth: 10,
    confirmations: 1,
    forceMineEmpty: 100,
    maxEmptyPerRequest: 1000,
    abi,
};
