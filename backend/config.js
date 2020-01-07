const fs = require('fs');
const abi = JSON.parse(fs.readFileSync('./abi.json'));

module.exports = {
    mongo: 'mongodb://mongo/scanner',
    web3URL: 'https://ropsten.infura.io/v3/177808a3ebca4e57b5847081b0b22ced',
    escrowAddress: '0x41d2C4890353D98BE8E12a7D5301D32837293bB8',
    proofEvents: {
        '0x92044645a95d9bb19c5fc216e5be180a47a434f0aeb5263c9a36c38f9ad65325': 'bet',
        '0xeaa18152488ce5959073c9c79c88ca90b3d96c00de1f118cfaad664c3dab06b9': 'deposit',
    },
    rescanDepth: 3,
    confirmations: 1,
    forceMineEmpty: 100,
    maxEmptyPerRequest: 1000,
    abi,
    privKey: '0x382F1BAE9F593B5C6A6DB515D7173F7E2BEA50C95931F8D36300DBF57707E0D0',
};
