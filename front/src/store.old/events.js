import _ from 'lodash';
import moment from 'moment';
import Vue from 'vue';
import API from './api';
import config from '../config/config';

const topCategoryByName = {};
_.forEach(config.topCategories, c => topCategoryByName[c.name] = c);

const uniqEvents = (merged) => {
  const uniqEvents = {};
  _.forEach(merged, event => {
    const prevEvent = uniqEvents[event.external_id];
    if (!prevEvent || !prevEvent.updated_at || (prevEvent.updated_at < event.updated_at)) {
      uniqEvents[event.external_id] = event;
    }
  });
  return uniqEvents;
};

const extendEvents = (events) => {
  return _.mapValues(events, e => ({
    ...e,
    // teams: e.adapter.name === 'sportr'
    //   ? _.map([0, 1], idx => teamInfo(e, idx))
    //   : [],
    inPlay: eventDateFilters[e.adapter.name]['in play'] && eventDateFilters[e.adapter.name]['in play'].filter(e),
    matchTime: eventMatchTime(e),
    isFinished: e.adapter.isFinished(e),
    isRunning: e.adapter.isRunning(e),
    betAsset: topCategoryByName[e.sport].betAsset,
  }));
};

const checkIntervalFromNow = (event, from, fromunit, to, tounit) => {
  const eventMoment = moment.unix(event.timestamp);
  const start = moment().add(from, fromunit);
  const end = moment().add(to, tounit);
  return (eventMoment >= start) && (eventMoment <= end);
};

export const sportHasDraw = (sport) => ['Soccer'].indexOf(sport) >= 0;

export const getCategoryAdapter = (categoryName) => {
  const c = config.topCategories.find(c => c.name === categoryName);
  return c && c.adapter;
};

export const getCategoryAsset = (categoryName) => {
  const c = config.topCategories.find(c => c.name === categoryName);
  return c && c.betAsset;
};

const paginateCategories = (tree, maxItems) => {
  let count = 0;
  let nextCount = 0;
  let isComplete = true;
  const filteredTree = {};
  _.forEach(tree, (sportData, sport) => {
    _.forEach(sportData.countries, (countryData, country) => {
      _.forEach(countryData.leagues, (leagueData, league) => {
        if (count <= maxItems) {
          count += leagueData.events.length;
          filteredTree[sport] = filteredTree[sport] || {sport, countries: {}};
          filteredTree[sport].countries[country] = filteredTree[sport].countries[country] || {country, leagues: {}};
          filteredTree[sport].countries[country].leagues[league] = filteredTree[sport].countries[country].leagues[league] || {
            league,
            events: leagueData.events
          };
        } else {
          if (isComplete) {
            nextCount = count;
          }
          isComplete = false;
        }
      });
    })
  });
  return {tree: filteredTree, isComplete, nextCount};
};

const groupByCategory = (events, filter) => {
  const tree = {};
  _.forEach(events, event => {
    if (event.sport && event.country && event.league) {
      tree[event.sport] = tree[event.sport] || {sport: event.sport, countries: {}};
      tree[event.sport].countries[event.country] = tree[event.sport].countries[event.country] || {
        country: event.country,
        leagues: {}
      };
      tree[event.sport].countries[event.country].leagues[event.league] =
          tree[event.sport].countries[event.country].leagues[event.league] || {league: event.league, events: []};
      tree[event.sport].countries[event.country].leagues[event.league].events.push(event);
    }
  });
  _.forEach(config.dexTree, (pairs, key) =>
      _.forEach(pairs, pair => {
        tree.Rates = tree.Rates || {sport: 'Rates', countries: {}};
        tree.Rates.countries[key] = tree.Rates.countries[key] || {country: key, leagues: {}};
        tree.Rates.countries[key].leagues[pair] = tree.Rates.countries[key].leagues[pair] || {league: pair, events: []};
      }));

  if (!filter) {
    return tree;
  }

  const treeFiltered = {};
  const { sport, country, league } = filter;
  _.forEach(tree, (sportData, sportK) => {
    if (!sport || (sportK === sport)) {
      treeFiltered[sportK] = treeFiltered[sportK] || {sport: sportK, countries: {}};
      _.forEach(sportData.countries, (countryData, countryK) => {
        if (!country || (country === countryK)) {
          treeFiltered[sportK].countries[countryK] = treeFiltered[sportK].countries[countryK] || {
            country: countryK,
            leagues: {}
          };
          _.forEach(countryData.leagues, (leagueData, leagueK) => {
            if (!league || (league === leagueK)) {
              treeFiltered[sportK].countries[countryK].leagues[leagueK] = treeFiltered[sportK].countries[countryK].leagues[leagueK] || {
                league: leagueK,
                events: leagueData.events,
              }
            }
          });
        }
      })
    }
  });
  return treeFiltered;
};

export const eventDateFilters = {
  sportr: {
    'in play': {
      filter: event => event.adapter.isRunning(event),
    },
    'next 24 hours': {
      filter: event => checkIntervalFromNow(event, '0', 'h', '24', 'h'),
      default: true,
    },
    'next 7 days': {
      filter: event => checkIntervalFromNow(event, '24', 'h', '7', 'd'),
    },
    'previous 24 hours': {
      filter: event => checkIntervalFromNow(event, '-24', 'h', '0', 'h'),
    },
    'previous 7 days': {
      filter: event => checkIntervalFromNow(event, '-7', 'd', '-24', 'h'),
    },
  },
  dex: {
    'pending': {
      filter: event => checkIntervalFromNow(event, '0', 'h', '365', 'd'),
      default: true,
    },
    'past': {
      filter: event => checkIntervalFromNow(event, '-365', 'd', '0', 'h'),
    },
  },
};

const teamInfo = (e, teamId) => {
  const raw = e.teams[teamId];
  return {
    name: raw.name,
    score: calcTotal(e, periodsBySport(event), [teamId]),
    p1: raw.p1,
    ft: raw.ft,
    ap: raw.ap,
  }
};

const eventMatchTime = (e) => {
  if (e.sport === 'Soccer') {
    if (e.adapter.isFinished(e)) {
      return `${moment.unix(e.ended).format('HH:mm')}`;
    }
    if (e.status === 6) {
      const minutesFromStart = Math.floor((moment().unix() - e.ptime) / 60);
      return `${minutesFromStart}'`;
    }
    if (e.status === 7) {
      const minutesFromStart = Math.floor((moment().unix() - e.ptime) / 60);
      return `${45 + minutesFromStart}'`;
    }
    if (e.status === 31) {
      return 'Half-time';
    }
  }
};

const periodsBySport = (event) => {
  let periods = ['ft'];

  if (event.sport === 'Ice Hockey') {
    periods = ['p1', 'p2', 'p3'];
  }
  return periods;
};

const calcTotal = (event, periods, teams = [0, 1]) => {
  let total = 0;
  _.forEach(periods, p => {
    _.forEach(teams, t => {
      total += event.teams[t][p]
    });
  });
  return total;
};

const addTotal = (betTypes, event, from, to, periods) => {
  for (let i = from; i <= to; i++) {
    betTypes[`total-${i}`] = {
      name: `Total ${i}`,
      value: calcTotal(event, periods),
    };
  }
};

const addHandicap = (betTypes, event, margin, periods) => {
  const t1 = calcTotal(event, periods, [0]);
  const t2 = calcTotal(event, periods, [1]);
  for (let i = -margin; i <= +margin; i++) {
    betTypes[`handicap-home-${i}`] = {
      name: `Handicap home ${i}`,
      value: t1 + i > t2,
    };
    betTypes[`handicap-away-${i}`] = {
      name: `Handicap away ${i}`,
      value: t2 + i > t1
    };
  }
};

export const getBetTypes = (event) => {
  if (event.adapter.name === 'dex') {
    return {
      rate: { name: 'rate is above' },
    };
  }

  const mainEvents = ['t1', 'draw', 't2'];
  const betTypes = {};
  const periods = periodsBySport(event);

  const t1 = calcTotal(event, periods, [0]);
  const t2 = calcTotal(event, periods, [1]);

  _.forEach(mainEvents, i => betTypes[i] = {
    t1: {name: event.teams[0].name, value: (t1 > t2)},
    draw: {name: 'draw', value: (t1 === t2)},
    t2: {name: event.teams[1].name, value: (t2 > t1)},
  }[i]);

  if (event.sport === 'Ice Hockey') {
    addHandicap(betTypes, event, 3.5);
    addTotal(betTypes, event, 3.5, 7.5, periods);
    _.forEach(['even', 'odd'], i => {
      let total = 0;
      _.forEach(periods, p => total += event.teams[0][p] + event.teams[1][p]);
      betTypes[`total${i}`] = {
        name: `Total ${i}`,
        value: (i === 'even') ? (total % 2 === 0) : (total % 2 !== 0),
      };
    });
    _.forEach(periods, i => {
      betTypes[`perioddraw-${i}`] = {
        name: `Draw period ${i}`,
        value: event.teams[0][i] === event.teams[1][i],
      };
    });
  }

  if (event.sport === 'Soccer') {
    addHandicap(betTypes, event, 2.5, periods);

    for (let i = 0; i <= 3; i++) {
      for (let j = 0; j <= 3; j++) {
        betTypes[`exact-${i}:${j}`] = {
          name: `Exact score ${i}:${j}`,
          value: (event.teams[0].ft === i) && (event.teams[1].ft === j)
        };
      }
    }

    const exactOther = (event.teams[0].ft > 3) && (event.teams[1].ft > 3);
    mainEvents.forEach(i => betTypes[`exact-other-${i}`] = {
      name: `${betTypes[i].name} and greater than 3`,
      value: exactOther && betTypes[i]
    });

    betTypes['both'] = {
      name: 'Both resultative',
      value: !!event.teams[0].ft && !!event.teams[1].ft,
    };

    addTotal(betTypes, event, 1.5, 3.5, periods);
  }
  return betTypes;
};

export default {
  state: {
    events: {},
    categoryEvents: {},
    eventsUpdated: {},
    eventFilter: {
      sport: null,
      country: null,
      league: null,
    },
    eventDateFilter: _.mapValues(eventDateFilters, f =>
      _.findKey(f, ff => ff.default)),
    maxPage: 1,
    perPage: 10,
  },
  mutations: {
    updateEvents: (state, val) => {
      _.forEach(val, event => Vue.set(state.events, event.external_id, event));
    },
    updateCategoryEvents: (state, val) => {
      state.categoryEvents = val;
    },
    updateUpdatedEvents: (state, val) => {
      _.forEach(val, id => Vue.set(state.eventsUpdated, id, Date.now()));
    },
    setMaxPage: (state, val) => state.maxPage = Math.ceil(val / state.perPage),
    // eslint-disable-next-line
    apiError: (state, val) => console.log(val),
    setEventFilter: (state, val) => state.eventFilter = val,
    setDateFilter: (state, { adapter, value }) => Vue.set(state.eventDateFilter, adapter, value),
  },
  actions: {
    fetchEvents({commit}, category) {
      commit('updateLoading', {key: 'fetchingAllEvents', val: true});
      return API.fetchEvents(category)
          .then(res => {
            commit('updateCategoryEvents', res);
            commit('updateLoading', {key: 'fetchingAllEvents', val: false});
          })
          .catch(err => {
            commit('apiError', err);
            commit('updateLoading', {key: 'fetchingAllEvents', val: false});
          });
    },
    fetchEventsById({getters, commit}, ids) {
      const needToUpdate = _.filter(ids, id => {
        const u = getters.getUpdatedEvents[id];
        return !u || Date.now() - u > config.eventsUpdateInterval;
      });
      if (needToUpdate.length) {
        commit('updateUpdatedEvents', needToUpdate);
        return API.fetchEventsById(needToUpdate)
            .then(res => commit('updateEvents', res))
            .catch(err => commit('apiError', err));
      }
    },
  },
  getters: {
    getEvents: state => extendEvents(uniqEvents(state.events)),
    getCategoryEvents: state => extendEvents(uniqEvents(state.categoryEvents)),
    getEventFilter: state => state.eventFilter,
    getEventDateFilter: state => state.eventDateFilter,
    getFilteredEvents: (state, getters) => {
      const events = getters.getCategoryEvents;
      const filters = getters.getEventFilter;
      const eventDateFilter = _.mapValues(getters.getEventDateFilter, (v, k) => eventDateFilters[k][v]);

      // TODO: use getters with cache to improve perfomance
      return _.filter(events, event => {
        return (!filters.sport || filters.sport === event.sport)
            && (!filters.country || filters.country === event.country)
            && (!filters.league || filters.league === event.league)
            && (!eventDateFilter[event.adapter.name] || eventDateFilter[event.adapter.name].filter(event))
      });
    },
    getUpdatedEvents: state => state.eventsUpdated,
    getMaxPage: state => state.maxPage,
    getEventTree: (state, getters) => groupByCategory(getters.getCategoryEvents),
    getEventTreeFiltered: (state, getters) => groupByCategory(getters.getFilteredEvents, getters.getEventFilter),
    getEventTreePaginated: (state, getters) => paginateCategories(getters.getEventTreeFiltered, state.maxPage * state.perPage),
  },
};

