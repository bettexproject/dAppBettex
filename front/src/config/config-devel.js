const WavesAPI = require('@waves/waves-api');

const Waves = WavesAPI.create(WavesAPI.TESTNET_CONFIG);

const assetIds = {
  USD: 'AMFteLfPzPhTsFc3NfvHG7fSRUnsp3tJXPH88G1PCisT',
  BTXC: 'AcTzTgW1QbJK4Qu6hCsUCLjpxUyD3dofv8xq2CAPbzKJ',
  WAVES: 'WAVES',
};


module.exports = {
  domain: 'https://dex.bettex.bet',

  nodeREST: 'https://testnode1.wavesnodes.com',
  addressesPub: {
    sportrDataAddress: '3MsyaD5jU6iUZ6TqjFuR4ZNr2jbn3A1PpRZ',
    escrowAddress: '3MpBKNSG25gK9fufNK3tjRAnpD83mXYZog6', // escrow fin 1.2
    gatewayAddress: '3N93QXLc1rD2Rg55JGLckLUoaLmZc6cASaS',
    gatewayPubKey: '29z36gpZPhbggDNyFM6iVqDD2L4jWmLuwjVTDYcCLub1',
    dexAgentPubKey: '4tD3VgZ1AmHzY7q1KZpn2mAkpMbBoXVAKSw3FRP9EXfT',
    dexAgentAddress: '3NCN79gCSaKTFV6fDoEzELoxDMrAUTCekd5',
  },

  fee: {
    dataTx: {
      coins: 500000,
      assetId: 'WAVES',
    },
    dataTxGateway: {
      coins: 500000,
      assetId: 'WAVES',
    },
    transferTx: {
      coins: 500000,
      assetId: 'WAVES',
    },
  },

  topCategories: [
    {name: 'Rates', adapter: 'dex', betAsset: 'WAVES'},
    {name: 'Soccer', adapter: 'sportr', betAsset: 'USD'},
    {name: 'Basketball', adapter: 'sportr', betAsset: 'USD'},
    {name: 'Ice Hockey', adapter: 'sportr', betAsset: 'USD'},
    {name: 'Tennis', adapter: 'sportr', betAsset: 'USD'},
  ],

  dexTree: {
    WAVES: [
      'WAVES/USD',
      'WAVES/BTC',
    ],
  },

  assetIds,

  assetsPairs: {
    'WAVES/USD': {
      amountAsset: assetIds['USD'],
      priceAsset: null,
    },
  },

  dexJudgeGraceTs: 1000 * 60 * 5,
  maxDexPast: 1000 * 60 * 60 * 24,

  Waves,
  betUpdateInterval: 30000,
  eventsUpdateInterval: 30000,
  fetchMyBetsInterval: 30000,
  depositAddressInterval: 10000,
  betPageSize: 10,
  maxPlacedBets: 5,

  minCreateMarketBet: 1,
  minBet: 1,

  balanceUpdateInterval: 10000,

  minMatchCoins: 100000,
  betAssetId: 'AcTzTgW1QbJK4Qu6hCsUCLjpxUyD3dofv8xq2CAPbzKJ',
  betAssetDecimals: 8,
  betAssetDecimalsMul: Math.pow(10, 8),

  explorer: 'https://wavesexplorer.com/testnet',
  btxcexplorer: 'http://explorer.bettex.bet',

  minWithdrawAmount: 1,

  dummySeed: 'viable filter exchange increase deputy reopen copy pencil people joy enter hero',
};
