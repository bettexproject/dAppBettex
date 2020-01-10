<template>
  <div>
    <div class="input-group-wrapper">
      <h2>Add bet</h2>
      <div class="input-group">
        <div class="input-group-place">
          <label for="pair">Сurrency pair </label>
          <select id="pair" v-model="pair">
            <option v-for="option in options" v-bind:value="option.value">
              {{ option.text }}
            </option>
          </select>
        </div>
      </div>
      <div class="input-group">
        <div class="input-group-place" :class="isRateValid ? 'valid' : 'invalid'">
          <label for="targetRate">Rate</label>
          <input type="text" id="targetRate" v-model="targetRate">
        </div>
        <span class="input-group-description"></span>
        <input type="radio" v-model="side" value="for" id="for"/>
        <label for="for">Higher</label>
        <input type="radio" v-model="side" value="against" id="against"/>
        <label for="against">Lower or equals</label>
      </div>
      <div class="input-group">
        <div class="input-group-place" :class="isDateValid ? 'valid' : 'invalid'">
          <label for="targetRate">Date and time</label>
          <date-time-picker v-model="targetDate"></date-time-picker>
        </div>
      </div>
      <div class="input-group">
        <div class="input-group-place" :class="isOddsValid ? 'valid' : 'invalid'">
          <label for="odds">Odds</label>
          <input type="text" id="odds" v-model="odds">
        </div>
      </div>
      <div class="input-group">
        <div class="input-group-place" :class="isAmountValid ? 'valid' : 'invalid'">
          <label for="amount">Amount {{ asset }}</label>
          <input type="text" id="amount" v-model="amount">
        </div>
      </div>

      <!--{{ category3 }}-->
    </div>
    <div class="input-group-out">
      <span>{{pair}}</span>
      <span>{{side}} Higher</span>
      <span>{{targetRate}}</span>
      <span>{{targetDate | moment('DD/MM/YY HH:mm')}}</span>
      <div @click.prevent="doBet()" class="input-group-button create-bet" :class="isValid ? '' : 'disabled'">Add bet</div>
    </div>
  </div>
</template>

<script>
  import _ from 'lodash';
  import moment from 'moment';
  import config from '../../config/config';
  import {getCategoryAdapter, getCategoryAsset} from "../../store/events";
  import {mapActions} from "vuex";
  import {dexEventId} from "../../store/api";

  export default {
    props: {
      category1: {
        type: String,
        required: true,
      },
      category2: {
        type: String,
        required: true,
      },
      category3: {
        type: String,
        required: true,
      },
      onSigned: {
        type: Function,
        default: () => null,
      },
      onRejected: {
        type: Function,
        default: () => null,
      },
      onBetComplete: {
        type: Function,
        default: () => null,
      },
    },
    computed: {
      adapter() {
        return this.getCategoryAdapter(this.category1);
      },
      asset() {
        return getCategoryAsset(this.category1);
      },
      isDateValid() {
        const m = moment(this.targetDate);
        return m.isValid() && (m.unix() * 1000 > Date.now());
      },
      isRateValid() {
        return (this.targetRate.toString() === parseFloat(this.targetRate).toString());
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
        return this.pair && this.isOddsValid && this.isAmountValid && this.isDateValid && this.isRateValid;
      },
    },
    methods: {
      ...mapActions(['bet']),
      doBet() {
        if (!this.isValid) {
          return false;
        }
        this.bet({
          onSigned: this.onSigned,
          onRejected: this.onRejected,
          side: this.side,
          subevent: 'rate',
          event: dexEventId({
            pair: this.pair,
            rate: this.targetRate,
            time: this.targetDate,
          }),
          amount: this.amount,
          odds: this.odds,
          asset: this.asset,
        }).then(() => {
          this.onBetComplete && this.onBetComplete();
        });
      },
      getCategoryAdapter: (categoryName) => getCategoryAdapter(categoryName),
    },
    data() {
      return {
        targetRate: 1.245,
        targetDate: 0,
        amount: 1,
        odds: 2,
        side: 'for',
        pair: this.category3,
        options: _.map(config.dexTree.WAVES, i => ({
          text: i,
          value: i,
        })),
      }
    },
  }
</script>

<style lang="sass">
  @import "node_modules/vue-vanilla-datetime-picker/dist/DateTimePicker"
</style>
<style>
body {
  --blue: #4f5973;
}
.n-m {
  --blue: #dbdee6;

}
  .input-group-place.invalid {
    box-shadow: 0 0 2px #f00;
  }
  .create-bet {
    cursor: pointer;
  }

  .create-bet.disabled {
    background: #aaa;
  }

  input[type="radio"] {
    visibility: hidden;
    height: 0;
    width: 0;
  }

  input[type="radio"] + label {
    display: inline-block;
    vertical-align: middle;
    text-align: center;
    cursor: pointer;
    font-size: 16px;
    color: #343B4C;
    letter-spacing: 0;
    text-align: center;
    padding: 5px 10px;
    border-radius: 4px;
    background: #FFFFFF;
    border: 1px solid #90A3AE;
  &:not(:last-of-type) {
     margin-right: 8px;
   }
.n-m & {
  background: var(--btx-white);
color: var(--btx-black);
}
  }

  input[type="radio"]:checked + label {
    background: var(--blue);
    font-size: 16px;
    color: #F4F7FB;
    letter-spacing: 0;
    text-align: center;
    .n-m & {
      background: #4f5973;
    }
  }



  .input-group-button {
    background: #9A3A46;
    border-radius: 4px;
    font-weight: 600;
    font-size: 14px;
    color: #FBFBFD;
    letter-spacing: 0;
    align-self: center;
    padding: 8px 16px;
  }

  .input-group-wrapper {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    width: 50%;
    margin: auto;

  h2 {
    flex: none;
    width: 100%;
    margin-bottom: 16px;
  }

  .input-group {
    flex-basis: calc(50% - 8px);
  }

  }

  .input-group-out {
    display: flex;
    justify-content: center;

  span {
    padding: 4px 8px;
    font-size: 16px;
    color: var(--blue);
    letter-spacing: 0;
    text-align: center;
    background: #F4F7FB;
    border: 1px solid #90A3AE;
    border-radius: 4px;


  &:not(:last-child) {
     margin-right: 16px;
   }
.n-m & {
  background: var(--btx-white);
}
  }
  }
  .input-group-place {
    background: var(--btx-white);
    border: 1px solid #90A3AE;
    border-radius: 4px;
    padding: 4px 8px;

  label {
    font-size: 14px;
    color: var(--blue);
    letter-spacing: 0;
  }

  input {
    width: 100%;
    border: none;
    font-weight: 600;
    font-size: 16px;
    color: var(--blue);
    letter-spacing: 0;
    background: var(--btx-white);
    cursor: pointer;
  }

  select {
    display: block;
    border: none;
    background: var(--btx-white);
    width: 100%;
    font-weight: 600;
    text-indent: 0;
    text-overflow: '';
    font-size: 16px;
    color: var(--blue);
    letter-spacing: 0;
    /*appearance: none;*/
    padding: 0;
  }

  }
  .input-group {
    margin-bottom: 16px;
    position: relative;
  }

  .input-group-description {
    font-size: 12px;
    color: var(--blue);
    letter-spacing: 0;
    text-align: left;
    display: block;
    margin-bottom: 4px;
  }



  .datetime-picker__button {
    background: none;
    font-weight: 600;
    font-weight: 600;
    font-size: 16px;
    color: var(--blue);
    border: none;
    padding: 0;
  }
  .datetime-picker-main {
    border-color: #90a3ae;
    border-radius: 8px;
    top: 27px;
    font-variant-numeric: tabular-nums;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: space-around;
    min-width: 320px;
    width: auto;
    background: var(--btx-white);
  }

  .date-picker__day--today {
    color: var(--fin-back);
    font-weight: 700;
  }
  .date-picker__cell--selected {
    font-weight: 700;
    color: var(--btx-white);
    background: var(--blue);
    border-radius: 4px;
  }
  .weekday__cell {
    font-size: 12px;
  }

  .date-picker__header button, .date-picker__month-button ,.date-picker__year-button {
    background: none;
    border-radius: 4px;
    border-color: #90a3ae;
    margin: 0 4px;
    color: var(--blue);
    font-weight: 700;

    &:hover {
      background: var(--btx-gray);
     }
  }

  .time-picker {
    display: flex !important;
    margin-left: 30px;
    position:relative;
      &:before {
        content: 'Time';
        position: absolute;
         font-weight: 600;
         font-size: 14px;
         top: -30px;
     }
  }

  .time-picker__button {
    display: none!important;
  }
  .text-slider__value {
    font-weight: 700;
  }
  .text-slider__button-next, .text-slider__button-previous {
    background: none;
    border-radius: 4px;
    margin: 0 4px;
  color: var(--btx-black);
  
    &:hover {
       background: var(--btx-gray);
     }
  }
</style>
