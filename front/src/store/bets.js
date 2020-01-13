import Vue from 'vue';
import _ from 'lodash';

export default {
    state: {
        bets: {},
    },
    mutations: {
        onBets: (state, val) => _.forEach(val, bet => Vue.set(state.bets, bet.hash, bet)),
    },
    getters: {
        getMyBetsExtended: state => state.bets,
    },
};