import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'lodash';
// import events from './events';
// import bets from './bets';
import SocketClient from 'socket.io-client';
import user from './user';
import api from './api';

const socket = SocketClient('http://localhost:8090');

Vue.use(Vuex);

const waitForWS = async () => {
  if (!socket.connected) {
    await new Promise(r => {
      socket.once('connect', r);
    });
  }
};

export default new Vuex.Store({
  state: {
    subsriptions: {},
  },
  mutations: {
    ADD_SUBSCRIPTION: (state, val) => Vue.set(state.subsriptions, val, true),
  },
  actions: {
    addSubscription({ getters, commit }, event) {
      commit('ADD_SUBSCRIPTION', event);
      socket.emit('subscribe', event);
    },
    onLogin({ dispatch, getters, commit }) {
      dispatch('addSubscription', `balance-${getters.getUserAddress}`);
      socket.emit('load', 'balance', getters.getUserAddress);

      socket.on(`balance-${getters.getUserAddress}`, balance => commit('setBalance', balance));
    },
  },
  getters: {
    getSubscription: (state) => state.subsriptions,
  },
  modules: {
    // events,
    // bets,
    user,
  },
})
