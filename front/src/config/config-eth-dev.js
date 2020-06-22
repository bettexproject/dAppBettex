module.exports = {
  escrowAddress: '0xd2d4B31951a6749DdCb573E1312278D5C3815738',
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
