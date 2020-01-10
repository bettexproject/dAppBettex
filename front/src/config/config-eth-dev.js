const WavesAPI = require('@waves/waves-api');

const Waves = WavesAPI.create(WavesAPI.TESTNET_CONFIG);

const assetIds = {
  // WAVES: 'WAVES',
  USD: '0x25211b0c499f143e7b6f09ec38c7e60d78e37d15',
  // BTXC: '3XdQ6uoMAgsEhUJjTcv8osPFNN9HWVSEnDQJKJMStBTc',
  // VST: '4LHHvYGNKJUg5hj65aGD5vgScvCBmLpdRFtjokvCjSL8',
  // BTC: '8LQW8f7P5d5PZM7GtZEBgaqRPGSzS3DfPuiXrURJ4AJS',
};


module.exports = {
  domain: 'https://dex.bettex.bet',

  explorer: 'https://wavesexplorer.com',
  nodeREST: 'https://nodes-stagenet.wavesnodes.com',

  eth: {
    maxRequests: 2,
    nextBlockDelay: 10000,
    scanFrom: 6936835,
    minDepositAmount: 10**5,

    ethSmart: '0x3b0D47AB5c3C0F23fF63aE387A274226f3988663'.toLowerCase(), // ropsten
    USDT: '0x25211B0C499f143E7B6f09eC38C7e60d78E37d15'.toLowerCase(), // ropsten
    decimalsUSDT: 8,
    generator: '0x83bed8Ca671b4B1F11ea2b25C447C30a6c8eA56C',
    // USDT: '0xdac17f958d2ee523a2206206994597c13d831ec7', // mainnet
  },

  addressesPub: {
    sportrDataAddress: '3McMXKF6q6yznyHCyVGTd2pmBN3TfYLUJvq',
    escrowAddress: '3MyXEmrjz8G5z2Q8xiyBnucF9LUyggiChiP',

    // gatewayAddress: Waves.tools.getAddressFromPublicKey('CtYRPgqQj7YMCtXnApQ7WW9xGFJ7WuSAbx8zBb9mnusg'),
    // gatewayPubKey: 'CtYRPgqQj7YMCtXnApQ7WW9xGFJ7WuSAbx8zBb9mnusg',

    // dexAgentPubKey: '6hGgQJ6TpCLmgsfeYSAPHNK8BL791bn3SRHTsSbnsWfy',
    // dexAgentAddress: '3P69jzek6S2q7kGWScEEZaNxKL5TiSF7wGm',
  },

  // matcherPublicKey: '7kPFrHDiGw1rCm7LPszuECwWYL3dMf6iMifLRDJQZMzy',

  trustedGenerator: '0x83bed8Ca671b4B1F11ea2b25C447C30a6c8eA56C',

  betAssetId: assetIds.BTXC,

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
    // {name: 'Rates', adapter: 'dex', betAsset: 'WAVES'},
    {name: 'Soccer', adapter: 'sportr', betAsset: 'USD'},
    {name: 'Basketball', adapter: 'sportr', betAsset: 'USD'},
    {name: 'Ice Hockey', adapter: 'sportr', betAsset: 'USD'},
    {name: 'Tennis', adapter: 'sportr', betAsset: 'USD'},
  ],

  dexTree: {
    // WAVES: [
    //   'WAVES/USD',
    //   'WAVES/BTC',
    //   'VST/WAVES',
    // ],
  },

  countryWhitelist: [
    'England',
    'France',
    'Germany',
    'International',
    'International Clubs',
    'Italy',
    'Netherlands',
    'Portugal',
    'Russia',
    'Spain',
    'Ukraine',
    'USA',
    'ATP',
    'WTA',
  ],

  assetIds,

  assetsPairs: {
    'WAVES/USD': {
      amountAsset: null,
      priceAsset: assetIds['USD'],
    },
    'WAVES/BTC': {
      amountAsset: null,
      priceAsset: assetIds['BTC'],
    },
    'VST/WAVES': {
      amountAsset: assetIds['VST'],
      priceAsset: null,
    },
  },

  dexJudgeGraceTs: 1000 * 60 * 5,
  maxDexPast: 1000 * 60 * 60 * 24 * 30,

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

  minMatchCoins: 0.1,
  betAssetDecimals: 8,
  // betAssetDecimalsMul: Math.pow(10, 8),

  btxcexplorer: 'http://explorer.bettex.bet',

  minWithdrawAmount: 1,

  dummySeed: 'viable filter exchange increase deputy reopen copy pencil people joy enter hero',
};
