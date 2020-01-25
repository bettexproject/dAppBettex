const { subevents } = require('./subevents');

module.exports = {
  defaultSport: 'Soccer',
  ODDS_PRECISION: 100,
  minCreateMarketBet: 5,
  subevents,
};
