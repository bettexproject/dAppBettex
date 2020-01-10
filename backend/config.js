const fs = require('fs');
const abi = JSON.parse(fs.readFileSync('./abi.json'));

module.exports = {
    mongo: 'mongodb://mongo/scanner',
    web3URL: 'https://ropsten.infura.io/v3/177808a3ebca4e57b5847081b0b22ced',
    web3wss: 'wss://ropsten.infura.io/ws',

    // escrowAddress: '0x3B07cfAEAd145bBDf20156A4e83b8CBE29F5855B',
    escrowAddress: '0x78044fB5ADAA596555288B3F0F939b54C19AeFF2',
    proofEvents: {
        '0x92044645a95d9bb19c5fc216e5be180a47a434f0aeb5263c9a36c38f9ad65325': 'bet',
        '0xeaa18152488ce5959073c9c79c88ca90b3d96c00de1f118cfaad664c3dab06b9': 'deposit',
        '0x9da6493a92039daf47d1f2d7a782299c5994c6323eb1e972f69c432089ec52bf': 'withdraw',
    },
    rescanDepth: 10,
    confirmations: 1,
    forceMineEmpty: 100,
    maxEmptyPerRequest: 1000,
    abi,
    privKey: '0x382F1BAE9F593B5C6A6DB515D7173F7E2BEA50C95931F8D36300DBF57707E0D0',
};

