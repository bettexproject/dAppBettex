import Vue from 'vue';
import Vuex from 'vuex';
import _ from 'lodash';
import events from './events';
import bets from './bets';
import user from './user';

Vue.use(Vuex);

export default new Vuex.Store({
  state: {
    loading: {},
  },
  mutations: {
    updateLoading: (state, {key, val}) => Vue.set(state.loading, key, val),
  },
  actions: {},
  getters: {
    getLoading: state => _.filter(state.loading, i => i),
  },
  modules: {
    events,
    bets,
    user,
  },
})
