module.exports = {
    web3URL: 'https://infura.io/v3/726090a0dd594c0490906b4133f5b02b',
    web3wss: 'wss://infura.io/ws/v3/726090a0dd594c0490906b4133f5b02b',
    escrowAddress: escrowAddress.toLowerCase(),
    mongo: `mongodb://mongo/scanner-mainnet-${escrowAddress}`,
    minerPrivKey: '179D881397D0F182F86E327395F13B0B6A46E45DF624640FEA9FE10C93C7C91F',
    minerGasPrice: 2*10**9,
    minerGasLimit: 3000000,
    minerGasMin: 1000000,
    eventPrivKey: '9DFF64C486B0A30524C02624EE29EDB46FD21A46F028DB4EA38CF59A3B738101',
    eventGasPriceHi: 2*10**9,
    eventGasPriceLo: 1*10**9,
    eventProvableGasAmount: 200000,
    eventGasLimit: 200000,
    eventProvableContribution: 10**16,
    sportrDepthFrom: -7,
    sportrDepthTo: 7,
};

