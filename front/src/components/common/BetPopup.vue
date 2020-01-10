<template>
    <div v-if="getHasUnapprovedBets">you have
        <router-link :to="{ name: ROUTE.account, params: {sub: 'bets'}}">unapproved bets</router-link>
        , betting disabled
    </div>
    <div v-else :class="stateClass" class="bet-popup">
        <div class="bet-popup-info">
            <div class="bet-popup-title">
                {{title}}
            </div>
            <div class="bet-popup-bet">
                {{ value.side }} {{ betType }}
            </div>
        </div>
        <div class="bet-popup-form">
            <div class="bet-popup-form-group" :class="isOddsValid ? 'valid' : 'invalid'">
                <label for="odds" class="bet-popup-label">Odd</label>
                <input class='bet-popup-input' type="text" id="odds" style="width: 50px;" v-model="odds">
            </div>
            <div class="bet-popup-form-group" :class="isAmountValid ? 'valid' : 'invalid'">
                <label for="amount" class="bet-popup-label">Amount <span class="asset-name">{{asset}}</span></label>
                <input class='bet-popup-input' type="text" id="amount" style="width: 80px;" v-model="amount">
            </div>
        </div>
        <div class="bet-popup-makebet">
            <button @click.prevent="doBet" class="bet-popup-button"
                    :disabled="this.lock || !isValid" :class="{'bet-popup-button-for': value.side==='for'}">Place
                bet
            </button>
            <span class="bet-popup-profit">Profit {{ profit }} <span
                    class="asset-name">{{asset}}</span></span>
        </div>
        <div class="bet-popup-close close-cross" @click.prevent="toggleHide"></div>
    </div>
</template>

<script>
  import {mapActions, mapGetters} from "vuex";
  import {ROUTE} from '../../router';
  import {getBetTypes, getCategoryAsset} from "../../store/events";
  import config from '../../config/config';

  export default {
    props: {
      event: {
        type: Object,
        required: true,
      },
      title: {
        default: "Match Odds",
        type: String,
      },
      value: {
        type: Object,
        default: () => {
        },
      },
    },
    computed: {
      ...mapGetters(['getHasUnapprovedBets']),
      ROUTE() { return ROUTE },
      asset() {
        return getCategoryAsset(this.event.sport);
      },
      profit() {
        const p = (this.odds * this.amount).toFixed(2);
        return isNaN(p) ? '-' : p;
      },
      stateClass() {
        if (!this.value.showPopup) {
          return 'hidden';
        }
        if (this.getHasUnapprovedBets) {
          return 'locked';
        }
        return this.lock ? 'locked' : 'active';
      },
      betType() {
        return (this.event && this.value && this.value.subevent && getBetTypes(this.event)[this.value.subevent].name);
      },
      isOddsValid() {
        return (this.odds.toString() === parseFloat(this.odds).toString())
          && (this.odds > 1);
      },
      isAmountValid() {
        return (this.amount.toString() === parseFloat(this.amount).toString())
          && (this.amount >= config.minCreateMarketBet);
      },
      isValid() {
        return this.isOddsValid && this.isAmountValid;
      },
    },
    methods: {
      ...mapActions(['bet']),
      doBet() {
        if (!this.isValid) {
          return false;
        }
        this.lock = true;
        this.bet({
          side: this.value.side,
          subevent: this.value.subevent,
          event: this.event.external_id,
          amount: this.amount,
          odds: this.odds,
          asset: this.asset,
        })
          .then(() => {
            this.$emit('input', {...this.value, showPopup: false});
            this.lock = false;
          })
          .catch(() => {
            this.lock = false
          });
      },
      toggleHide() {
        this.value.showPopup = !this.value.showPopup
      }
    },
    data() {
      return {
        amount: '5',
        odds: this.value.startOdds,
        lock: false,
      };
    },
    watch: {
      value: {
        handler(val) {
          this.odds = val.startOdds;
        },
        immediate: true,
      },
    },
  };
</script>

<style>
    .bet-popup {
        width: 100%;
        transition: height 200ms linear, transform 200ms;
        overflow: hidden;
        height: 60px;
        /*min-height: 60px;*/
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }

    .bet-popup.hidden {
        min-height: 0;
        height: 0;
        transition: height 200ms linear;
        width: 0;
    }

    .bet-popup.active {
        height: 60px;
    }


    .bet-popup.locked {
        opacity: 0.5;
        transition: opacity 400ms;
    }

    .bet-popup-title {
        font-weight: 700;
        text-transform: uppercase;
        font-size: 14px;
        color: var(--btx-black);
        letter-spacing: 0.3px;
        text-align: right;
    }

    .bet-popup-button {
        font-weight: 600;
        font-size: 13px;
        color: var(--btx-white);
        letter-spacing: 0.28px;
        padding: 8px 16px;
        background: #CC3C3C;
        border-radius: 4px;
        border: none;
        transition: background-color 200ms linear;
    }

    .bet-popup-button:disabled {
        background: #aaa;
    }

    .bet-popup-button-for {
        background: var(--btx-lay);
    }

    .bet-popup-makebet {
        position: relative;
    }

    .bet-popup-profit {
        display: block;
        font-weight: 500;
        font-size: 10px;
        color: var(--btx-black);
        letter-spacing: 0.45px;
        text-align: center;
        bottom: 0;
        left: 0;
        margin-top: 4px;
    }

    .bet-popup-label {
        font-weight: 700;
        font-size: 12px;
        color: #90A3AE;
        text-transform: uppercase;
        display: block;

    }

    .bet-popup-info {
        text-align: right;
        margin-right: 24px;
    }

    .bet-popup-form {
        display: flex;
        margin-right: 16px;
        align-items: center;
        position: relative;
    }

    .bet-popup-form-group {

        position: relative;
        margin-right: 8px;
    }

    .bet-popup-input {
        background: none;
        color: var(--btx-black);
        font-size: 13px;
        display: block;
        border: none;
        border-radius: 0;
        border-bottom: 1px solid var(--btx-green);
    }
    .bet-popup-input-m {
        font-size: 16px;
    }

    .bet-popup-close {
        cursor: pointer;
        width: 16px;
        height: 16px;
        margin-left: 8px;
    }
</style>
