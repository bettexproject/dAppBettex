import Vue from 'vue';
import _ from 'lodash';
import config from '../config/config';
import api from './api';

const extendBets = (bets, events) => {
    return(_.map(bets, bet => {
        const event = events[bet.eventid];
        const eventName = (event && event.teams) ? `${event.teams[0].name} - ${event.teams[1].name}` : '';
        return {
            ...bet,
            isOpen: (bet.amount - bet.matched) >= 1,
            isPlaced: (bet.amount - bet.matched) < 1,
            side: bet.side ? 'for' : 'against',
            odds: bet.odds,
            asset: 'USD',
            eventName,
            subevent: config.subevents[bet.subevent],
            cancellable: bet.amount > bet.matched,
            spentNominal: bet.matched / config.decimalMultiplicator,
            amountNominal: bet.amount / config.decimalMultiplicator,
        }
    }));
};

export default {
    state: {
        bets: {},
    },
    mutations: {
        onBets: (state, val) => _.forEach(Array.isArray(val) ? val : [val], bet => Vue.set(state.bets, bet.hash, bet)),
    },
    actions: {
        bet({ commit, getters}, params) {
            api.bet(getters.getAuth, params);
        },
    },
    getters: {
        getMyBetsExtended: (state, getters) => extendBets(state.bets, getters.getEvents),
    },
};