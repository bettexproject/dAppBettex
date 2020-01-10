import Vue from 'vue'
import App from './App.vue'
import store from './store'
import router from './router'
import moment from 'vue-moment';
import config from './config/config';
import VueDisqus from 'vue-disqus'
import Notifications from 'vue-notification'
import DateTimePicker from 'vue-vanilla-datetime-picker';

Vue.config.productionTip = false;

Vue.use(moment);
Vue.use(VueDisqus);
Vue.use(Notifications);

Vue.component('date-time-picker', DateTimePicker);

new Vue({
  store,
  router,
  render: h => h(App)
}).$mount('#app');

Vue.filter('round2', data => {
  return isNaN(data) ? data : parseFloat(data.toFixed(2));
});

Vue.filter('wavesExporer', (data, params) => {
  return data && `<a target="_blank" href="${config.explorer}/tx/${data}">${params}</a>`;
});

Vue.filter('btxcExporer', (data, params) => {
  return data && `<a target="_blank" href="${config.btxcexplorer}/tx/${data}">${params}</a>`;
});

store.dispatch('fetchPayouts');

setInterval(() => {
  store.dispatch('fetchMyBetsExtended');
}, config.fetchMyBetsInterval);

const dexJudgeTrigger = () => {
  store.dispatch('sendDexJudge')
    .then(changes => changes && store.dispatch('fetchMyBetsExtended'))
    .then(() => {
      setTimeout(() => dexJudgeTrigger(), config.eventsUpdateInterval);
    })
    .catch(() => {
      setTimeout(() => dexJudgeTrigger(), config.eventsUpdateInterval);
    });
};

dexJudgeTrigger();


