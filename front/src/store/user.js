import api from './api';

export default {
    state: {
        balance: 0,
        auth: null,
    },
    mutations: {
        setAuth: (state, val) => state.auth = val,
        setBalance: (state, val) => state.balance = val
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
            dispatch('emitSocketLoad', {
                event: 'balance',
                params: account,
            });
        },
    },
    getters: {
        getAuth: state => state.auth,
        getUserAddress: (state, getters) => getters.getAuth && getters.getAuth.address,
        isLoggedIn: (state, getters) => !!getters.getAuth,
        getBalance: (state) => state.balance,
    },
}