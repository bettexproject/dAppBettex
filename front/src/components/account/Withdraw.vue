<template>
  <div>
    <div class="withdraw">
      Available withdraw only for BTXC to old blockchain of bettex coin
    </div>

    <div class="bet-popup-form withdraw-form">
      <div class="bet-popup-form-group">
        <label for="odds" class="bet-popup-label">Withdraw bettex coin address</label>
        <input class='bet-popup-input' type="text" id="odds" style="width: 250px;" v-model="withdrawAddress"
               placeholder="Paste address here">
      </div>
      <div class="bet-popup-form-group">
        <label for="amount" class="bet-popup-label">Withdraw Amount</label>
        <input class='bet-popup-input' type="text" id="amount" style="width: 150px;" v-model="withdrawAmount"
               placeholder="0.00">
      </div>
      <button @click.prevent="allAmount" class='button'>All</button>
      <button @click.prevent="doWithdraw" class='button' :disabled="!isValid">withdraw</button>
    </div>
    <div class="title-3">Withdraw history</div>
    <Paginate :items="itemsSorted">
      <div slot-scope="{ items }">
        <table class="bet-history-table">
          <thead>
          <th>In</th>
          <th>Out</th>
          <th>Destination</th>
          <th>Amount</th>
          <th>Timestamp</th>
          </thead>
          <tr v-for="(item, idx) in items" :key="idx">
            <td>
              <div :inner-html.prop="item.in | wavesExporer('in')"></div>
            </td>
            <td>
              <div v-if="item.out" :inner-html.prop="item.out | btxcExporer('out')"></div>
              <div v-else>pending</div>
            </td>
            <td>{{ item.destination }}</td>
            <td>{{ item.amount }}
            </td>
            <td>{{ item.time | moment('DD/MM/YYYY HH:mm')}}</td>
          </tr>
        </table>
      </div>
    </Paginate>
  </div>
</template>

<style>
  .withdraw {
    margin-bottom: 16px;
  }

  .withdraw-form {
    margin-bottom: 24px;
  }
</style>

<script>
  import Paginate from '../common/Paginate';
  import {mapActions, mapGetters} from "vuex";
  import config from '../../config/config';

  let fetcher = null;

  export default {
    components: {Paginate},
    computed: {
      ...mapGetters(['getWithdrawTransactions', 'getBalance']),
      itemsSorted() {
        return this.extend(_.sortBy(this.getWithdrawTransactions, item => -item.time));
      },
      isValid() {
        return this.withdrawAmount
            && !isNaN(this.withdrawAmount)
            && (this.withdrawAmount >= config.minWithdrawAmount)
            && this.withdrawAddress
            && this.withdrawAddress.length > 5;
      },
    },
    methods: {
      ...mapActions(['fetchWithdrawTransactions', 'withdraw']),
      extend(items) {
        return _.map(items, item => ({
          ...item,
          in: item.txid,
        }));
      },
      allAmount() {
        this.withdrawAmount = this.getBalance[config.betAssetId];
      },
      doWithdraw() {
        this.withdraw({address: this.withdrawAddress, amount: this.withdrawAmount});
      },
    },
    data() {
      return {
        withdrawAddress: '',
        withdrawAmount: '',
      };
    },
  };
</script>
