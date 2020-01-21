const escrowAddress = '0x46BAE71b96BC99F51101887b165010a5E455827B';

module.exports = {
    web3URL: 'https://ropsten.infura.io/v3/177808a3ebca4e57b5847081b0b22ced',
    web3wss: 'wss://ropsten.infura.io/ws',
    escrowAddress,
    mongo: `mongodb://mongo/scanner-devel-${escrowAddress}`,
    privKey: '0x382F1BAE9F593B5C6A6DB515D7173F7E2BEA50C95931F8D36300DBF57707E0D0',
    minerGasPrice: 1*10**9,
};
