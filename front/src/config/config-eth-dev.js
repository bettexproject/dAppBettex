module.exports = {
  escrowAddress: '0x7725C59dfC672c30E0FC35Dfb0E69646a5DE6567',
  decimalMultiplicator: Math.pow(10, 3),
  ODDS_PRECISION: 100,
  minCreateMarketBet: 5,

  requiredChainId: '0x3',
  fakeDeposit: true,

  ethExplorer: 'https://ropsten.etherscan.io/tx',

  subevents: {
    1: 't1',
    2: 't2',
    3: 'draw',
  },
}
