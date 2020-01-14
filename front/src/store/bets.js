import Vue from 'vue';
import _ from 'lodash';
import config from '../config/config';
import { isArray } from '@waves/waves-transactions/dist/validators';

const extendBets = (bets, events) => {
    return(_.map(bets, bet => {
        return {
            ...bet,
            isOpen: (bet.amount - bet.matched) >= 1,
            isPlaced: (bet.amount - bet.matched) < 1,
            side: bet.side ? 'for' : 'against',
            odds: bet.odds / 10,
            asset: 'USD',
            eventName: 'TODO event name',
            subevent: 'todo',
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
    getters: {
        getMyBetsExtended: (state, getters) => extendBets(state.bets, getters.getEvents),
    },
};