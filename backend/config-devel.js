const escrowAddress = '0xe590B5eFb445dcFB1DEB93A936C5F7CfCE0f29Fa';

module.exports = {
    web3URL: 'https://ropsten.infura.io/v3/177808a3ebca4e57b5847081b0b22ced',
    web3wss: 'wss://ropsten.infura.io/ws/v3/177808a3ebca4e57b5847081b0b22ced',
    escrowAddress: escrowAddress.toLowerCase(),
    mongo: `mongodb://mongo/scanner-devel-${escrowAddress}`,
    minerPrivKey: '0x382F1BAE9F593B5C6A6DB515D7173F7E2BEA50C95931F8D36300DBF57707E0D0',
    minerGasPrice: 1*10**9,
    minerGasLimit: 3000000,
    minerGasMin: 1000000,
    eventPrivKey: '0x96A29664E06C4B7B1D3D9E027620B4490B692A245804C4D2B9BF62B8D2D41587',
    eventGasPriceHi: 2*10**9,
    eventGasPriceLo: 1*10**9,
    eventProvableGasAmount: 150000,
    eventGasLimit: 200000,
    eventProvableContribution: 10**16,
    sportrDepthFrom: -1,
    sportrDepthTo: -1,
};

