<template>
  <div>
    <div class="deposit-address">
      <label for="deposit_amount">Withdraw amount</label>
      <input type="text" id="deposit_amount" v-model="amount" />
      <button @click="doMakeWithdraw">Withdraw</button>
    </div>
    <Paginate :items="getBalanceChanges">
      <div slot-scope="{ items }">
        <table class="bet-history-table">
          <thead>
            <th>amount</th>
            <th>tx hash</th>
          </thead>
          <tr v-for="(item, idx) in items" :key="idx">
            <td>{{ item.amount }}</td>
            <td>
              <div :inner-html.prop="item.hash | ethExplorer(item.hash)"></div>
            </td>
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
import Paginate from "../common/Paginate";
import { mapActions, mapGetters } from "vuex";
import config from "../../config/config";

let fetcher = null;

export default {
  components: { Paginate },
  computed: {
    ...mapGetters(["getBalanceChanges"])
  },
  methods: {
    ...mapActions(["makeWithdraw"]),
    doMakeWithdraw() {
      this.makeWithdraw(this.amount * config.decimalMultiplicator);
    }
  },
  data() {
    return {
      amount: config.fakeDeposit ? 1000 : 0,
      fakeDeposit: config.fakeDeposit
    };
  }
};
</script>
