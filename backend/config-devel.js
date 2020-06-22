const escrowAddress = '0xD82288A43461877a1D91Ea8d84C60E7B0B32daC9';

module.exports = {
    web3URL: 'https://ropsten.infura.io/v3/726090a0dd594c0490906b4133f5b02b',
    web3wss: 'wss://ropsten.infura.io/ws/v3/726090a0dd594c0490906b4133f5b02b',
    escrowAddress: escrowAddress.toLowerCase(),
    mongo: `mongodb://mongo/scanner-devel-${escrowAddress}`,
    minerPrivKey: '0x382F1BAE9F593B5C6A6DB515D7173F7E2BEA50C95931F8D36300DBF57707E0D0',
    minerGasPrice: 2*10**9,
    minerGasLimit: 3000000,
    minerGasMin: 1000000,
    eventPrivKey: '0x96A29664E06C4B7B1D3D9E027620B4490B692A245804C4D2B9BF62B8D2D41587',
    eventGasPriceHi: 2*10**9,
    eventGasPriceLo: 1*10**9,
    eventProvableGasAmount: 200000,
    eventGasLimit: 200000,
    eventProvableContribution: 10**16,
    sportrDepthFrom: -7,
    sportrDepthTo: 7,
};

