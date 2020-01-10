import _ from 'lodash';
import Vue from 'vue';
import moment from 'moment';
import API, {adapters, dexEventIdSplit} from './api';
import config from '../config/config';
import {getBetTypes} from "./events";

const isBetDefeated = (bet) => (bet.defeat === 1) || (bet.defeat === 3);

const extendByEventsAndMatches = (bets, events, matches) => {
  return _.map(bets, bet => {
    const eventExtended = events[bet.event];
    const eventName = eventExtended ? eventExtended.adapter.getEventName(eventExtended) : null;
    const eventTime = eventExtended ? eventExtended.timestamp : null;
    const betMatches = [];
    const needPayouts = [];
    const madePayouts = [];
    let matchedAmount = 0;
    let hasUnconfirmedPeers = false;
    let hasUnpaid = false;
    let hasAdmittedPeers = false;
    let isDisputed = false;

    let isWinner = null;
    let typeMnemonic = bet.subevent;
    if (eventExtended && eventExtended.adapter === adapters.sportr) {
      const subevent = bet.subevent;
      const betTypes = getBetTypes(eventExtended);
      typeMnemonic = (betTypes[subevent] && betTypes[subevent].name) || typeMnemonic;
      if (eventExtended.adapter.isFinished(eventExtended)) {
        isWinner = bet.side === 'for'
            ? betTypes[subevent] && betTypes[subevent].value
            : betTypes[subevent] && !betTypes[subevent].value;
      }
    }
    if (eventExtended && eventExtended.adapter === adapters.dex) {
      if (eventExtended.isFinished) {
        isWinner = ' '; // TODO
      }
    }

    _.forEach(matches, m => {
      if (m.for === bet.betid || m.against === bet.betid) {
        const peerBet = (bet.betid === m.for) ? bets[m.against] : bets[m.for];
        betMatches.push({...m, peerBet});
        matchedAmount += m.amount;
        if (!m.paid) {
          hasUnpaid = true;
          isDisputed = isDisputed || (bet.defeat === 2);
          isDisputed = isDisputed || (peerBet && (peerBet.defeat === 2));
          hasUnconfirmedPeers = hasUnconfirmedPeers || ((isWinner === true) && !!peerBet && !peerBet.defeat);
        }
        const peerAdmitted = (peerBet && isBetDefeated(peerBet))
        hasAdmittedPeers = hasAdmittedPeers || peerAdmitted;

        if (!m.paid && (peerAdmitted || isBetDefeated(bet))) {
          needPayouts.push(m);
        }
        if (m.paid) {
          madePayouts.push(m.paid)
        }
      }
    });

    isDisputed = isDisputed && !isBetDefeated(bet);
    const isDefeated = isBetDefeated(bet);


    const multiplier = bet.side === 'for' ? 1 : 100 / (bet.odds - 100);
    const decimalsMul = Math.pow(10, (eventExtended && eventExtended.adapter.decimals) || 8);

    return {
      ...bet,
      isWinner,
      eventName,
      eventTime,
      eventExtended,
      matchedAmount,
      hasUnconfirmedPeers,
      hasAdmittedPeers,
      typeMnemonic,
      isDefeated,
      matchedNominal: matchedAmount / decimalsMul,
      amountNominal: (bet.amount - bet.cancel_amount) * multiplier / decimalsMul,
      spentNominal: (bet.spent - bet.cancel_amount) * multiplier / decimalsMul,
      asset: eventExtended && eventExtended.betAsset,
      cancellable: bet.amount > bet.spent,
      isOpen: (bet.amount > bet.spent),
      isPlaced: (matchedAmount > 0) && (bet.amount === bet.spent) && !isDefeated && !hasAdmittedPeers,
      // isPlaced: (matchedAmount > 0) && (bet.amount === bet.spent),
      matches: betMatches,
      isDisputed: isDisputed && hasUnpaid,
      canApprove: (isWinner === false) && (matchedAmount > 0) && (bet.defeat !== 1) && hasUnpaid,
      canDispute: (isWinner === false) && (matchedAmount > 0) && !bet.defeat && hasUnpaid,
      needPayouts,
      madePayouts,
    }
  });
};

export default {
  state: {
    bets: {},
    betLocks: {},
    betsUpdated: {},
    betsByEventsUpdated: {},
    stacksByEvents: {},
    matches: {},
    payouts: [],
  },
  mutations: {
    updatePayouts: (state, val) => state.payouts = val,
    lockBet(state, {betId, lock}) {
      Vue.set(state.betLocks, betId, lock);
    },
    updateBets(state, bets) {
      const betsByEvents = {};
      _.forEach(bets, bet => {
        Vue.set(state.bets, bet.betid, bet);
      });
      _.forEach(state.bets, bet => {
        betsByEvents[bet.event] = betsByEvents[bet.event] || [];
        betsByEvents[bet.event].push(bet);
      });
      _.forEach(betsByEvents, (bets, event) => Vue.set(state.stacksByEvents, event, API.getStacks(bets)));
    },
    updateUpdatedBetsByEvents(state, val) {
      _.forEach(val, (event) => Vue.set(state.betsByEventsUpdated, event, Date.now()));
    },
    updateUpdatedBets(state, val) {
      _.forEach(val, (event) => Vue.set(state.betsUpdated, event, Date.now()));
    },
    updateMatches(state, matches) {
      _.forEach(matches, match => Vue.set(state.matches, match.matchid, match));
    },
    betSuccess(state, val) {
      Vue.notify({
        group: 'notifications',
        title: 'Bet',
        text: 'Bet placed',
      });
    },
    betError(state, val) {
      Vue.notify({
        group: 'notifications',
        title: 'Error',
        type: 'warn',
        duration: 10000,
        text: (val && val.message) || 'Unknown error',
      });
    },
    cancelBetSuccess(state, val) {
      Vue.notify({
        group: 'notifications',
        title: 'Bet',
        text: 'Bet cancelled',
      });
    },
    cancelBetFail(state, val) {
      Vue.notify({
        group: 'notifications',
        title: 'Error',
        type: 'warn',
        text: (val && val.message) || 'Unknown error',
      });
    },
    approveSuccess(state, val) {
      Vue.notify({
        group: 'notifications',
        title: 'Bet',
        text: 'Defeat approved',
      });
    },
    approveFail(state, val) {
      Vue.notify({
        group: 'notifications',
        title: 'Error',
        type: 'warn',
        text: (val && val.message) || 'Unknown error',
      });
    },
  },
  actions: {
    fetchPayouts({ commit }) {
      return API.fetchPayouts()
        .then(res => commit('updatePayouts', res))
        .catch(() => {});
    },
    makePayouts({commit}, matches) {
      return API.sendPayouts(matches);
    },
    cancelBet({commit, dispatch, getters}, betid) {
      commit('lockBet', {betId: betid, lock: true});
      return API.cancelBet({betid, auth: getters.getAuth})
          .then(res => {
            commit('cancelBetSuccess', res);
            return dispatch('fetchBetsById', [betid]);
          })
          .then(() => commit('lockBet', {betId: betid, lock: false}))
          .catch(res => {
            commit('cancelBetFail', res);
            commit('lockBet', {betId: betid, lock: false});
          });
    },
    massApproveDefeat({commit, dispatch, getters}, betidsAll) {
      const betids = betidsAll.slice(0, 7);
      _.forEach(betids, betid => commit('lockBet', {betId: betid, lock: true}));
      return API.massApproveDefeat({ bets: betids, auth: getters.getAuth })
          .then(res => {
            commit('approveSuccess', res);
            return dispatch('fetchBetsById', betids)
          })
          .then(() => {
            _.forEach(betids, betid => commit('lockBet', {betId: betid, lock: false}));
          })
          .catch(res => {
            commit('approveFail', res);
            _.forEach(betids, betid => commit('lockBet', {betId: betid, lock: false}));
          });
    },
    massCancel({commit, dispatch, getters}, betidsAll) {
      const betids = betidsAll.slice(0, 7);
      _.forEach(betids, betid => commit('lockBet', {betId: betid, lock: true}));
      return API.massCancelBet({bets: betids, auth: getters.getAuth})
          .then(res => {
            commit('cancelBetSuccess', res);
            return dispatch('fetchBetsById', betids)
          })
          .then(() => {
            _.forEach(betids, betid => commit('lockBet', {betId: betid, lock: false}));
          })
          .catch(res => {
            commit('cancelBetFail', res);
            _.forEach(betids, betid => commit('lockBet', {betId: betid, lock: false}));
          });
    },
    approveDefeat({commit, dispatch, getters}, {betid, code}) {
      commit('lockBet', {betId: betid, lock: true});
      API.approveDefeat({betid, code, auth: getters.getAuth})
          .then(res => {
            commit('approveSuccess', res);
            return dispatch('fetchBetsById', [betid])
          })
          .then(() => commit('lockBet', {betId: betid, lock: false}))
          .catch(res => {
            commit('approveFail', res);
            commit('lockBet', {betId: betid, lock: false});
          });
    },
    fetchMyBets({getters, dispatch, commit}, params) {
      if (getters.isLoggedIn) {
        const joinEvents = params && params.joinEvents;
        return dispatch('fetchMyMatches')
          .then(() => API.fetchBetsByOwner(getters.getAddress))
          .then(bets => {
            commit('updateBets', bets);
            if (joinEvents) {
              return dispatch('fetchEventsById', _.map(bets, 'event'))
            }
          })
          .catch(() => {
          });
      }
    },
    fetchBetsById({commit}, ids) {
      return API.fetchBetsById(ids)
          .then(res => commit('updateBets', res))
          .catch(() => {
          });
    },
    sendDexJudge({ getters }) {
      const dexToJudge = _.filter(getters.getMatches, m => {
        if ((m.adapter === 'dex') && !m.judged) {
          const { ts } = dexEventIdSplit(m.event);
          if (ts * 1000 + config.dexJudgeGraceTs < Date.now()) {
            return true;
          }
        }
        return false;
      });
      return API.sendDexJudge(dexToJudge);
    },
    fetchMyBetsExtended({getters, dispatch}) {
      dispatch('fetchMyBets', {joinEvents: true})
          .then(() => dispatch('fetchBets', _.map(getters.getMyBets, i => i.event)))
          .then(() => {
            const needPayouts = [];
            const bets = getters.getBetsExtended;
            _.forEach(bets, bet =>
                _.forEach(bet.needPayouts, match => {
                  needPayouts.push(match.matchid);
                })
            );
            dispatch('makePayouts', needPayouts);
            const matches = [];

            const stacks = getters.getStacksByEvents;
            _.forEach(stacks, i => {
              _.forEach(i.matches, match => matches.push(match));
            });

            API.sendMatches(matches);
            if (getters.getAutoApprove) {
              const defeated = _.map(_.filter(getters.getMyBetsExtended, bet => bet.canApprove), 'betid');
              defeated.length && API.autoApproveDefeat({betids: defeated, address: getters.getAddress});
            }
            if (getters.getAutoCancel) {
              const refund = _.map(_.filter(getters.getMyBetsExtended, bet => bet.cancellable && (bet.isWinner !== null)), 'betid');
              refund.length && API.autoRefund({betids: refund, address: getters.getAddress});
            }
          })

      ;
    },
    fetchBets({getters, commit, dispatch}, ids) {
      const needToFetch = _.filter(ids, eventId => {
        const updated = getters.getBetsByEventsUpdated[eventId];
        return (!updated || (updated < Date.now() - config.betUpdateInterval));
      });
      if (needToFetch.length) {
        commit('updateUpdatedBets', needToFetch);
        return API.fetchBetsByEvent(needToFetch)
            .then(res => {
              commit('updateBets', res);
              return dispatch('fetchMatchesByEvents', needToFetch);
            })
            .catch(() => {
            });
      }
    },
    fetchMatchesByEvents({commit}, ids) {
      API.fetchMatchesByEvents(ids)
          .then(res => commit('updateMatches', res))
          .catch(() => {
          });
    },
    bet({commit, dispatch, getters}, params) {
      if (!getters.isLoggedIn) {
        commit('betError', {message:'please login'});
      } else return API.bet({...params, auth: getters.getAuth})
          .then(res => {
            commit('betSuccess', params);
            setTimeout(() => {
              dispatch('fetchMyBets');
              dispatch('fetchMyMatches');
            }, 1000);
          })
          .catch(err => commit('betError', err));
    },
    fetchMyMatches({dispatch, commit, getters}) {
      if (getters.isLoggedIn) {
        return API.fetchMatchesByOwner(getters.getAddress)
          .then(res => commit('updateMatches', res))
          .catch(() => {
          });
      }
    },
  },
  getters: {
    getBets: state => _.mapValues(state.bets, bet => ({...bet, lock: state.betLocks[bet.betid]})),
    getStacksByEvents: state => state.stacksByEvents,
    getBetsByEventsUpdated: state => state.betsByEventsUpdated,
    getMatches: state => state.matches,
    getMyBets: (state, getters) => {
      const myAddress = getters.getAddress;
      return _.filter(getters.getBets, bet => bet.owner === myAddress);
    },
    getTotalMatchedByEvents: (state, getters) => {
      const byEvents = {};
      _.forEach(getters.getMatches, match => {
        byEvents[match.event] = byEvents[match.event] || 0;
        byEvents[match.event] += match.amount / Math.pow(10, adapters[match.adapter].decimals);
      });
      return byEvents;
    },
    getBetsByEvents: (state, getters) => {
      const matchedByEvents = {};
      const unmatchedByEvents = {};
      _.forEach(getters.getBetsExtended, bet => {
        const stack = (bet.matchedAmount > 0) ? matchedByEvents : unmatchedByEvents;
        stack[bet.event] = stack[bet.event] || [];
        stack[bet.event].push(bet);
      });
      return {matchedByEvents, unmatchedByEvents};
    },
    getBetsExtended: (state, getters) => {
      return _.sortBy(
          _.filter(extendByEventsAndMatches(getters.getBets, getters.getEvents, getters.getMatches),
              f => !!f.eventTime),
          s => -moment(s.eventTime).unix());
    },
    getMyBetsExtended: (state, getters) => {
      const myAddress = getters.getAddress;
      return _.filter(getters.getBetsExtended, f => f.owner === myAddress);
    },
    getHasUnapprovedBets: (state, getters) => {
      let hasUnapproved = false;
      _.forEach(getters.getMyBetsExtended, bet => {
        hasUnapproved = hasUnapproved || !!bet.canApprove
      });
      return hasUnapproved;
    },
    getPayouts: (state) => state.payouts,
  },
}
