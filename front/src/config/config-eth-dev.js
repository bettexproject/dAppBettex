module.exports = {
  escrowAddress: '0xD82288A43461877a1D91Ea8d84C60E7B0B32daC9',
  decimalMultiplicator: Math.pow(10, 3),
  ODDS_PRECISION: 100,
  minCreateMarketBet: 5,

  requiredChainId: '0x3',
  fakeDeposit: true,

  subevents: {
    1: 't1',
    2: 't2',
    3: 'draw',
  },
}
