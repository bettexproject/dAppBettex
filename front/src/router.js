import Vue from 'vue'
import Router from 'vue-router'
import Account from './components/routes/Account'
import Category from './components/routes/Category'
import Dispute from './components/routes/Dispute'
import SingleEvent from './components/routes/SingleEvent'

Vue.use(Router);

export const ROUTE = {
  account: 'account',
  dispute: 'dispute',
  singleEvent: 'event',
  categoryTop: 'categoryTop',
  categorySport: 'categorySport',
  categorySportCountry: 'categorySportCountry',
  categorySportCountryLeague: 'categorySportCountryLeague',
};

export default new Router({
  mode: 'history',
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: ROUTE.categoryTop,
      component: Category,
    },
    {
      path: '/account/:sub',
      name: ROUTE.account,
      component: Account,
    },
    {
      path: '/event/:event',
      name: ROUTE.singleEvent,
      component: SingleEvent,
    },
    {
      path: '/dispute/:event/:bet',
      name: ROUTE.dispute,
      component: Dispute,
    },
    {
      path: '/events/:sport',
      name: ROUTE.categorySport,
      component: Category,
    },
    {
      path: '/events/:sport/:country',
      name: ROUTE.categorySportCountry,
      component: Category,
    },
    {
      path: '/events/:sport/:country/:league',
      name: ROUTE.categorySportCountryLeague,
      component: Category,
    },
  ]
})
