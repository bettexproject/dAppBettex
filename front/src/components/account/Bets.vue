<template>
  <div class="">
<!--    <div v-if="getAuthName === 'keeper'" class="switch-inline">-->
<!--      <Switcher v-if="autoApprove !== null" v-model="autoApprove" color="#F5BF21">Auto approve</Switcher>-->
<!--      <div v-if="autoApprove === null">fetching autoapprove state</div>-->
<!--      <Switcher v-if="autoCancel !== null" v-model="autoCancel" color="#F5BF21" size="medium">Auto refund bets-->
<!--      </Switcher>-->
<!--    </div>-->
    <div class="bet-history-actions" v-if="getMyBetsExtended.length">
      <div class="title-2">Bet history</div>
      <Paginate :items="getMyBetsExtended" :pageSize="config.betPageSize">
        <div slot-scope="{ items }">
          <table class="bet-history-table">
            <thead>
            <th>Event date</th>
            <th>Event</th>
            <th>Bet</th>
            <th>Reserved</th>
            <th>Odds</th>
            <th>Payout</th>
            <th>Paid</th>
            </thead>
            <tr v-for="item in items" :key="item.betid">
              <td class="text-nowrap">{{ item.event.eventTime | moment('DD/MM/YYYY HH:mm') }}</td>
              <td>{{ item.event.eventName }}</td>
              <td>{{ item.side }} {{ item.typeMnemonic }}</td>
              <td>{{ item.amountNominal | round2 }}</td>
              <td>{{ item.odds / 100 }}</td>
              <td>{{ item.matchedNominal | round2 }}</td>
              <td>{{ item.paid ? '+' : '-' }}</td>
            </tr>
          </table>
        </div>
      </Paginate>
    </div>
  </div>
</template>

<script>
  import {mapActions, mapGetters} from "vuex";
  import _ from 'lodash';
  import Paginate from '../common/Paginate';
  import Switcher from "../common/Switcher";
  import config from '../../config/config';
  import {ROUTE} from '../../router';

  export default {
    name: 'bets',
    components: {
      Paginate,
      Switcher,
    },
    computed: {
      ...mapGetters(['getMyBetsExtended', 'getHasUnapprovedBets', 'getMyBets', 'getEvents', 'getMatches', 'getAutoApprove', 'getAutoCancel', 'getAuthName']),
      autoApprove: {
        get() {
          return this.getAutoApprove;
        },
        set(val) {
          this.setDelegateStatus({autoApprove: val});
        },
      },
      autoCancel: {
        get() {
          return this.getAutoCancel;
        },
        set(val) {
          this.setDelegateStatus({autoCancel: val});
        },
      },
      config() {
        return config
      },
      ROUTE() {
        return ROUTE
      },
      others() {
        return _.filter(this.getMyBetsExtended, bet => !bet.canApprove && (!bet.cancellable || bet.isWinner === null));
      },
      onlyUnapproved() {
        return _.filter(this.getMyBetsExtended, bet => bet.canApprove);
      },
      onlyRefund() {
        return _.filter(this.getMyBetsExtended, bet => bet.cancellable && (bet.isWinner !== null));
      }
    },
    methods: {
      ...mapActions(['approveDefeat', 'cancelBet', 'makePayouts', 'massApproveDefeat', 'massCancel', 'setDelegateStatus']),
      doApprove(bet, code) {
        this.approveDefeat({betid: bet.betid, code});
      },
      doCancel(bet) {
        this.cancelBet(bet.betid);
      },
      massApprove(bets) {
        this.massApproveDefeat(_.map(bets, 'betid'));
      },
      massRefund(bets) {
        this.massCancel(_.map(bets, 'betid'));
      },
    },
    mounted() {
    },
  };
</script>

<style>
  .bet-history-table-actions.locked {
    opacity: 0.5;
  }

  .bet-history-actions {
    margin-bottom: 24px;
  }
</style>
