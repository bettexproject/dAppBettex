import api from './api';
import config from '../config/config';
import Vue from 'vue';

const NIGHT_MODE_KEY = 'nightmode';

export default {
    state: {
        balance: 0,
        balanceChanges: [],
        auth: null,
        nightMode: localStorage.getItem(NIGHT_MODE_KEY) === 'true',
    },
    mutations: {
        setAuth: (state, val) => state.auth = val,
        setBalance: (state, val) => state.balance = val,
        setBalanceChanges: (state, val) => state.balanceChanges = val,
        setNightMode: (state, val) => {
            state.nightMode = val;
            localStorage.setItem(NIGHT_MODE_KEY, val);
        }
    },
    actions: {
        loginLS({ commit, dispatch }) {
            api.loginLS()
                .then(auth => {
                    commit('setAuth', auth);
                    dispatch('onLogin');
                });
        },
        loginMetamask({ commit, dispatch }) {
            api.loginMetamask()
                .then(auth => {
                    commit('setAuth', auth);
                    dispatch('onLogin');
                })
                .catch(err => {
                    Vue.notify({
                        group: 'notifications',
                        title: 'Login',
                        text: err,
                    });
                });
        },
        logout({ commit }) {
            commit('setAuth', null);
        },

        makeDeposit({ getters }, amount) {
            api.makeDeposit(getters.getAuth, amount);
        },

        onLogin({ dispatch, getters, commit }) {
            const account = getters.getUserAddress;
            dispatch('addSocketListener', {
                event: `balance-${account}`,
                listener: (balance) => commit('setBalance', balance),
            });
            dispatch('addSocketListener', {
                event: `balancechanges-${account}`,
                listener: (changes) => commit('setBalanceChanges', changes),
            });
            dispatch('emitSocketLoad', {
                event: 'balance',
                params: account,
            });

            dispatch('addSocketListener', {
                event: `bets-${account}`,
                listener: (bets) => commit('onBets', bets),
            });
            dispatch('emitSocketLoad', {
                event: 'bets',
                params: account,
            });


        },
    },
    getters: {
        getAuth: state => state.auth,
        getAuthName: (state, getters) => getters.getAuth && getters.getAuth.name,
        getUserAddress: (state, getters) => getters.getAuth && getters.getAuth.address,
        isLoggedIn: (state, getters) => !!getters.getAuth,
        getBalance: (state) => state.balance / config.decimalMultiplicator,
        getBalanceChanges: (state) => _.reverse(_.map(state.balanceChanges, c => ({ ...c, amount: c.amount / config.decimalMultiplicator }))),
    },
}