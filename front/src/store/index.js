import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'lodash';
import events from './events';
// import bets from './bets';
import categories from './categories';
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

const store = new Vuex.Store({
  state: {
    subsriptions: {},
  },
  mutations: {
    ADD_SUBSCRIPTION: (state, { event, listener }) => Vue.set(state.subsriptions, event, listener),
  },
  actions: {
    addSocketListener({ commit }, { event, listener }) {
      console.log('listener', event);
      socket.on(event, listener);
      socket.emit('subscribe', event);
      commit('ADD_SUBSCRIPTION', { event, listener });
    },
    emitSocketLoad(d, { event, params }) {
      params ? socket.emit('load', event, params) : socket.emit('load', event);
    },
    onFirstConnect({ dispatch, commit }) {
      dispatch('addSocketListener', {
        event: 'categories',
        listener: (categories) => commit('onCategories', categories),
      });
      dispatch('emitSocketLoad', {
        event: 'categories',
      });
    },
  },
  modules: {
    events,
    // bets,
    user,
    categories,
  },
});

waitForWS().then(() => store.dispatch('onFirstConnect'));

export default store;
