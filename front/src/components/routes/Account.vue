<template>
  <div class="">
    <h2>
      Account
    </h2>
    <div class="nav-tabs">
      <RouterLink
              :to="{ name: ROUTE.account, params: { sub: tab.link }}"
              v-for="(tab, idx) in tabsList" class="nav-tab-link" :key="idx">
        {{ tab.title }}
      </RouterLink>
    </div>
    <div class="tab-content" v-for="(tab, idx) in tabsList" :key="idx"
         :class="tab.link === currentTab ? 'active' : 'hidden'">
      <component v-bind:is="tab.component"></component>
    </div>
  </div>
</template>

<script>
  import Bets from '../account/Bets';
  import Deposit from '../account/Deposit';
  import Account from '../account/Account';
  import Withdraw from '../account/Withdraw';
  import {ROUTE} from '../../router';
  import {mapGetters} from "vuex";

  export default {
    computed: {
      ...mapGetters(['getAuthName']),
      tabsList() {
        const _tabs = [];
        this.getAuthName && _tabs.push({
          component: Bets,
          title: 'Bet history',
          link: 'bets',
        });
        _tabs.push({
          component: Deposit,
          title: 'Deposit USDT',
          link: 'deposit',
        });
        _tabs.push({
          component: Withdraw,
          title: 'Withdraw USDT',
          link: 'withdraw',
        });
        (this.getAuthName === 'local') && _tabs.push({
          component: Account,
          title: 'Account (local storage)',
          link: 'account',
        });
        return _tabs;
      },
    },
    data() {
      return {
        ROUTE,
        currentTab: null,
      }
    },
    watch: {
      '$route': {
        immediate: true,
        handler() {
          this.currentTab = this.$route.params.sub;
        },
      },
    },
  };
</script>

<style>
  .nav-tabs {
    display: flex;
    margin-bottom: 24px;
  }

  .nav-tabs a {
    text-decoration: none;
  }

  .nav-tab-link {
    padding: 4px 12px 8px;
    /*border: solid 1px #000;*/
    font-size: 18px;
    color: var(--btx-black);
    letter-spacing: 0;
    border-bottom: 4px solid var(--btx-gray);
  }

  .nav-tab-link.router-link-active {
    font-weight: 600;
    /*background: #aaa;*/
    border-bottom: 4px solid var(--btx-green);
  }

  .tab-content.hidden {
    display: none;
  }
</style>
