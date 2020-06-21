import _ from 'lodash';
import moment from 'moment';
import Vue from 'vue';
import config from '../config/config';

export const subeventName = (subevent) => config.subevents[subevent];

export const eventFromFilter = (filter) => {
  if (filter.sport && filter.country && filter.league) {
    return `onChange league ${filter.sport}-${filter.country}-${filter.league}`;
  }
  if (filter.sport && filter.country) {
    return `onChange country ${filter.sport}-${filter.country}`;
  }
  if (filter.sport) {
    return `onChange sport ${filter.sport}`;
  }
  return 'onChange event';
};

const isRunning = (event) => ([6, 7, 31].indexOf(event.status) >= 0);
const isFinished = (event) => ([100, 110, 120, 125].indexOf(event.status) >= 0);

export const eventDateFilters = {
  'in play': {
    filter: event => event.isRunning,
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
};

const extendEvents = (events) => {
  console.log(events);
  return _.mapValues(events, event => {
    let total_count = 0;
    let matched_count = 0;
    let matched_amount = 0;
    _.forEach(event.stacks, subeventData =>
      ['stackFor', 'stackAgainst'].forEach(k => {
        total_count += subeventData[k].total_count;
        matched_amount += subeventData[k].matched_amount;
        matched_count += subeventData[k].matched_count;
      }));

    return {
      ...event,
      isRunning: isRunning(event),
      isFinished: false && isFinished(event),
      total_count,
      matched_amount,
      matched_count,
    };
  });
};

const groupByCategory = (events, filter) => {
  const tree = {};
  _.forEach(events, event => {
    if (event.sport && event.country && event.league) {
      tree[event.sport] = tree[event.sport] || { sport: event.sport, countries: {} };
      tree[event.sport].countries[event.country] = tree[event.sport].countries[event.country] || {
        country: event.country,
        leagues: {}
      };
      tree[event.sport].countries[event.country].leagues[event.league] =
        tree[event.sport].countries[event.country].leagues[event.league] || { league: event.league, events: [] };
      tree[event.sport].countries[event.country].leagues[event.league].events.push(event);
    }
  });

  if (!filter) {
    return tree;
  }

  const treeFiltered = {};
  const { sport, country, league } = filter;
  _.forEach(tree, (sportData, sportK) => {
    if (!sport || (sportK === sport)) {
      treeFiltered[sportK] = treeFiltered[sportK] || { sport: sportK, countries: {} };
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
          filteredTree[sport] = filteredTree[sport] || { sport, countries: {} };
          filteredTree[sport].countries[country] = filteredTree[sport].countries[country] || { country, leagues: {} };
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
  return { tree: filteredTree, isComplete, nextCount };
};

const checkIntervalFromNow = (event, from, fromunit, to, tounit) => {
  const eventMoment = moment.unix(event.timestamp);
  const start = moment().add(from, fromunit);
  const end = moment().add(to, tounit);
  return (eventMoment >= start) && (eventMoment <= end);
};

const convertEvents = (rawEvents) => {
  const ret = {};
  _.forEach(rawEvents, event => {
    ret[event.external_id] = event;
  });
  return ret;
};

export default {
  state: {
    events: {},
    eventFilter: {},
    maxPage: 1,
    perPage: 10,
    eventDateFilter: 'next 24 hours',
    // eventDateFilter: _.findKey(eventDateFilters, i => i.default),
  },
  mutations: {
    setEventFilter: (state, val) => state.eventFilter = val,
    setDateFilter: (state, val) => state.eventDateFilter = val,
    onEvents: (state, val) => {
      const newEvents = convertEvents(val);
      _.forEach(newEvents, event => {
        Vue.set(state.events, event.external_id, event);
      });
    },
    onEventItem: (state, val) => Vue.set(state.events, val.data.external_id, convertEvents([val.data])[val.data.external_id]),
  },
  actions: {
    loadEventsForFilter({ commit, dispatch }, filter) {
      commit('setEventFilter', filter);
      dispatch('addSocketListener', {
        event: eventFromFilter(filter),
        listener: (event) => commit('onEventItem', event),
      });
      dispatch('addSocketListener', {
        event: 'events',
        listener: (events) => commit('onEvents', events),
      });
      dispatch('emitSocketLoad', {
        event: 'events',
        params: filter,
      });
    },
  },
  getters: {
    getEvents: (state) => extendEvents(state.events),
    getEventFilter: (state) => state.eventFilter,
    getEventDateFilter: state => state.eventDateFilter,
    getFilteredEvents: (state, getters) => {
      const events = getters.getEvents;
      const filters = getters.getEventFilter;
      const eventDateFilter = eventDateFilters[getters.getEventDateFilter];

      // TODO: use getters with cache to improve perfomance
      return _.filter(events, event => {
        return (!filters.sport || filters.sport === event.sport)
          && (!filters.country || filters.country === event.country)
          && (!filters.league || filters.league === event.league)
          && (eventDateFilter.filter(event))
      });
    },
    getMaxPage: state => state.maxPage,
    getEventTreeFiltered: (state, getters) => groupByCategory(getters.getFilteredEvents, getters.getEventFilter),
    getEventTreePaginated: (state, getters) => paginateCategories(getters.getEventTreeFiltered, state.maxPage * state.perPage),
  },
};