<template>
  <div>
      <div class="deposit-address">
        <label for="deposit_amount">Deposit amount</label>
        <input type="text" id="deposit_amount" v-model="amount">
        <button @click="doMakeDeposit">Deposit</button>
        <button @click="unlockDeposit" v-if="!fakeDeposit">Unlock</button>
      </div>
      <Paginate :items="itemsSorted">
        <div slot-scope="{ items }">
          <table class="bet-history-table">
            <thead>
            <th>In</th>
            <th>Out</th>
            <th>Amount</th>
            <th>Timestamp</th>
            </thead>
            <tr v-for="(item, idx) in items" :key="idx">
              <td>
                <div :inner-html.prop="item.in | btxcExporer('in')"></div>
              </td>
              <td>
                <div v-if="item.out" :inner-html.prop="item.out | wavesExporer('out')"></div>
                <div v-else>pending</div>
              </td>
              <td>{{ item.amount }}</td>
              <td>{{ item.time | moment('DD/MM/YYYY HH:mm')}}</td>
            </tr>
          </table>
        </div>
      </Paginate>
    </div>
</template>
<style>
  .deposit-address {
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
      ...mapGetters(['getDepositTransactions']),
      itemsSorted() {
        return _.sortBy(this.getDepositTransactions, item => -item.time);
      },
    },
    methods: {
      ...mapActions(['makeDeposit', 'unlockDeposit']),
      doMakeDeposit() {
        this.makeDeposit(this.amount * config.decimalMultiplicator);
      },
    },
    data() {
      return { amount: config.fakeDeposit ? 1000 : 0, fakeDeposit: config.fakeDeposit };
    },
  };
</script>
