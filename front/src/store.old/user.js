import API from './api';
import authLS from './auth-ls';
import authMetamask from './auth-metamask';
import Vue from "vue";
import config from '../config/config';

const NIGHT_MODE_KEY = 'nightMode';
const SEED_ACCEPTED = 'seed_accepted';

export default {
  state: {
    balance: {},
    noMetamask: null,
    depositAddress: null,
    generatingAddress: false,
    depositTransactions: null,
    withdrawTransactions: null,
    delegateStatus: null,
    seedAccepted: localStorage.getItem(SEED_ACCEPTED) === 'true',
    auth: null,
    nightMode: localStorage.getItem(NIGHT_MODE_KEY) === 'true',
  },
  mutations: {
    acceptSeedResponsibility: (state) => {
      state.seedAccepted = true;
      localStorage.setItem(SEED_ACCEPTED, 'true');
    },
    setAuth: (state, val) => state.auth = val,
    updateDepositAddress: (state, val) => state.depositAddress = val,
    updateDelegateStatus: (state, val) => state.delegateStatus = val,
    updateGeneratingAddress: (state, val) => state.generatingAddress = val,
    updateBalance: (state, val) => state.balance = val,
    updateNoMetamask: (state, val) => {
      state.noMetamask = val;
      if (val) {
        Vue.notify({
          group: 'notifications',
          title: 'Metamask',
          text: 'Please install Metamask to login',
        });
      }
    },
    updateDepositTransactions: (state, val) => state.depositTransactions = val,
    updateWithdrawTransactions: (state, val) => state.withdrawTransactions = val,
    setNightMode: (state, val) => {
      state.nightMode = val;
      localStorage.setItem(NIGHT_MODE_KEY, val);
    }
  },
  actions: {
    loadInitialData({dispatch}) {
      // dispatch('fetchDelegate');
      // dispatch('fetchBalance');
      // dispatch('fetchMyBetsExtended');
    },
    fetchDelegate({commit, getters, dispatch}) {
      return API.fetchDelegateStatus(getters.getAddress)
        .then(res => commit('updateDelegateStatus', res))
        .catch(res => {
          console.log(res)
        });
    },
    setDelegateStatus({commit, getters, dispatch}, val) { // val = { autoApprove, autoCancel }
      const newStatus = {autoApprove: getters.getAutoApprove, autoCancel: getters.getAutoCancel, ...val};
      commit('updateDelegateStatus', null);
      return API.setDelegate({address: getters.getAddress, auth: getters.getAuth}, newStatus)
        .then(res => {
          commit('updateDelegateStatus', res);
          dispatch('fetchDelegate');
        })
        .catch((res) => {
          console.log(res);
          dispatch('fetchDelegate');
        });
    },
    makeDeposit({commit, getters}, amount) {
      return API.makeDeposit(getters.getAuth, amount);
    },
    unlockDeposit({getters}) {
      return API.unlockDeposit(getters.getAuth);
    },
    withdraw({commit, getters, dispatch}, {address, amount}) {
      return API.fetchWithdrawTransactionsList(getters.getPubKey)
        .then(res => API.withdraw({prevList: res, address, amount, pubKey: getters.getPubKey}))
        .catch(() => {
        });
    },
    fetchDepositTransactions({commit, getters, dispatch}) {
      return API.fetchDepositTransactionsList(getters.getPubKey)
        .then(res => API.fetchGatewayTxById(res))
        .then(res => commit('updateDepositTransactions', res))
        .catch(() => {
        });
    },
    fetchWithdrawTransactions({commit, getters, dispatch}) {
      return API.fetchWithdrawTransactionsList(getters.getPubKey)
        .then(res => API.fetchGatewayTxById(res))
        .then(res => commit('updateWithdrawTransactions', res))
        .catch(() => {
        });
    },
    fetchDepositAddress({commit, getters, dispatch}) {
      return API.fetchDepositAddress(getters.getPubKey)
        .then(res => commit('updateDepositAddress', res))
        .catch(() => {
        });
    },
    generateDepositAddress({commit, getters, dispatch}) {
      return API.generateDepositAddress(getters.getPubKey)
        .then(() => commit('updateGeneratingAddress', true))
        .then(() => dispatch('fetchDepositAddress'))
        .catch(() => commit('updateGeneratingAddress', false));
    },
    fetchBalance({commit, getters, dispatch}) {
      if (getters.isLoggedIn) {
        return API.fetchBalance(getters.getAddress, getters.trustedGenerator)
          .then(res => commit('updateBalance', res))
          .catch(err => {
          });
      }
    },
    logout({ commit }) {
      commit('setAuth', null);
    },
    loginLS({ commit, dispatch }) {
      return authLS()
        .then(auth => {
          commit('setAuth', auth);
          dispatch('loadInitialData');
        });
    },
    loginMetamask({ commit, dispatch }) {
      return authMetamask()
        .then(auth => {
          commit('setAuth', auth);
          dispatch('loadInitialData');
        })
        .catch(() => commit('updateNoMetamask', true));
    },
  },
  getters: {
    isLoggedIn: state => !!state.auth,
    getAuth: state => state.auth,
    getAuthName: state => state.auth && state.auth.name,
    getSeed: state => state.auth && state.auth.seed,
    getAddress: state => state.auth && state.auth.address,
    getPubKey: state => state.auth && state.auth.publicKey,
    getBalance: state => state.balance,
    getNoMetamask: state => state.noMetamask,
    getDepositAddress: state => state.depositAddress,
    getDepositTransactions: state => state.depositTransactions,
    getWithdrawTransactions: state => state.withdrawTransactions,
    getNightMode: state => state.nightMode,
    getAutoApprove: state => state.delegateStatus && state.delegateStatus.autoapprove,
    getAutoCancel: state => state.delegateStatus && state.delegateStatus.autocancel,
    getSeedResponsibilityAccepted: state => state.seedAccepted,
    trustedGenerator: () => config.trustedGenerator,
    getGeneratingAddress: (state, getters) => {
      if (getters.getDepositAddress === null) {
        return null;
      }
      return state.generatingAddress || (getters.getDepositAddress === "");
    },
  },
};
