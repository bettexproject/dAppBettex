<template>
  <div class="header">
    <router-link :to="{ name: route.categoryTop }">
      <div :class="route.path === '/events/Rates' ? 'aaaa':'header-logo'"></div>
    </router-link>
    <div class="switch-list">
      <Switcher v-model="sounds" color="#F5BF21">sounds</Switcher>
      <Switcher v-model="nightMode" color="#F5BF21">dark mode</Switcher>
    </div>
    <div class="lang">
      <div class='lang-title'>language</div>
      <div class='lang-item active'> eng</div>
      <div class='lang-item disabled'> рус</div>
      <div class='lang-item disabled'> 简体</div>
    </div>
    <div class="menu" v-if="isLoggedIn">
      <div class="balance">
        <span v-for="(val, asset) in balances" class="balance-item" :key="asset">
          {{ val }}
          <div class="asset-name">{{asset}}</div>
        </span>
      </div>
      <router-link :to="{ name: route.account, params: { sub: 'bets' } }">Bet history</router-link>
      <router-link :to="{ name: route.account, params: { sub: 'account' } }">Account</router-link>
      <span v-if="isLoggedIn" @click.prevent="logout" class="menu-link">Logout</span>
    </div>
    <LoginBar></LoginBar>
  </div>
</template>

<script>
  import {ROUTE} from "../../router";
  import config from '../../config/config';
  import Switcher from "../common/Switcher";
  import LoginBar from "../common/LoginBar";
  import {mapActions, mapGetters, mapMutations} from "vuex";

  let interval = null;

  export default {
    data() {
      return {
        sounds: false,
      }
    },
    components: {Switcher, LoginBar},
    computed: {
      ...mapGetters(['getBalance', 'getNightMode', 'isLoggedIn', 'getAuthName']),
      route() {
        return ROUTE;
      },
      balances() {
        const betAssets = {};
        _.forEach(config.assetIds, (assetId, assetCode) => betAssets[assetCode] = (this.getBalance && this.getBalance[assetId]) || 0);
        return betAssets;
      },
      nightMode: {
        get() {
          return this.getNightMode;
        },
        set(val) {
          this.setNightMode(val);
        },
      },
    },
    methods: {
      ...mapActions(['fetchBalance', 'loginLS', 'logout']),
      ...mapMutations(['setNightMode']),
    },
    mounted() {
      interval = setInterval(() => {
        this.fetchBalance();
      }, config.balanceUpdateInterval);
      this.fetchBalance();
    },
  }
</script>

<style>
  .keeper-install {
    text-decoration: none;
    cursor: pointer;
    color: var(--gray);
    background: var(--btx-white);
    padding: 8px;
    border: 1px solid var(--btx-darkgrey);
    margin: 0 4px;
    border-radius: 4px;

    &:hover {
    background: var(--btx-gray);
     }
  }

  .menu a {
    font-size: 14px;
    color: #3C3C46;
    letter-spacing: 0;
  }

  .menu a:not(:last-child) {
    margin-right: 16px;
  }

  .balance {
    font-weight: 700;
    font-size: 12px;
    color: var(--btx-black);
    letter-spacing: 0;
    display: inline-block;
    margin-right: 16px;

  }
  .balance-item:not(:last-child) {
    margin-right: 8px;
  }

  .lang {
    padding-left: 8px;
    border-left: 1px solid var(--btx-darkgrey);
    margin-right: auto;
    line-height: 23px;
    font-size: 12px;
  }

  .lang-title {
    display: block;
  }

  .lang-item {
    display: inline-block;
  }

  .lang-item:not(:last-child) {
    margin-right: 8px;
  }

  .lang-item.active {
    color: var(--btx-green);
    font-weight: 700;
  }

  .lang-item.disabled {
    opacity: .5;
  }

  .menu-link {
    cursor: pointer;
  }

</style>
