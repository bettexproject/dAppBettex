<template>
  <div class="">
<!--    <div v-if="getAuthName === 'keeper'" class="switch-inline">-->
<!--      <Switcher v-if="autoApprove !== null" v-model="autoApprove" color="#F5BF21">Auto approve</Switcher>-->
<!--      <div v-if="autoApprove === null">fetching autoapprove state</div>-->
<!--      <Switcher v-if="autoCancel !== null" v-model="autoCancel" color="#F5BF21" size="medium">Auto refund bets-->
<!--      </Switcher>-->
<!--    </div>-->
    <div class="bet-history-actions" v-if="onlyUnapproved.length">
      <div class="title-2">Need approve</div>
      <Paginate :items="onlyUnapproved" :pageSize="config.betPageSize">
        <div slot-scope="{ items }">
          <table class="bet-history-table">
            <thead>
            <th>Event date</th>
            <th>Event</th>
            <th>Bet</th>
            <th>Reserved</th>
            <th>Odds</th>
            <th>Payout</th>
            <th></th>
            </thead>
            <tr v-for="item in items" :key="item.betid">
              <td class="text-nowrap">{{ item.eventTime | moment('DD/MM/YYYY HH:mm') }}</td>
              <td>{{ item.eventName }}</td>
              <td>{{ item.side }} {{ item.typeMnemonic }}</td>
              <td>{{ item.amountNominal | round2 }}</td>
              <td>{{ item.odds / 100 }}</td>
              <td>{{ item.matchedNominal | round2 }}</td>
              <td class="text-nowrap bet-history-table-actions" :class="item.lock ? 'locked' : ''">
                <div v-if="item.canApprove" @click.prevent="doApprove(item, 1)"
                     class="bethistory-button approve-button">approve
                </div>
                <div v-if="item.canDispute" @click.prevent="doApprove(item, 2)"
                     class="bethistory-button approve-button">dispute
                </div>
                <div v-if="item.cancellable" @click.prevent="doCancel(item)"
                     class="bethistory-button approve-button">refund
                </div>
                <div v-if="item.isDefeated">approved defeat</div>
                <div v-if="item.hasUnconfirmedPeers">waiting for peer</div>
                <div v-if="item.hasAdmittedPeers">approved by peer</div>
                <div v-if="item.isDisputed">
                  <RouterLink
                      :to="{ name: ROUTE.dispute, params: { event: item.event, bet: item.betid }}">
                    dispute
                  </RouterLink>
                </div>
              </td>
            </tr>
          </table>
        </div>
      </Paginate>
      <button @click="massApprove(onlyUnapproved)" class="button">Approve all</button>
      <div class="warning">Warning! This action can be undone. All yours bets will be approved</div>
    </div>
    <div class="bet-history-actions" v-if="onlyRefund.length">
      <div class="title-2">Need refund</div>
      <div class="notice"> This bets will not be matched</div>
      <Paginate :items="onlyRefund" :pageSize="config.betPageSize">
        <div slot-scope="{ items }">
          <table class="bet-history-table">
            <thead>
            <th>Event date</th>
            <th>Event</th>
            <th>Bet</th>
            <th>Reserved</th>
            <th>Odds</th>
            <th></th>
            </thead>
            <tr v-for="item in items" :key="item.betid" :class="item.lock ? 'locked shine-slide' : ''">
              <td class="text-nowrap">{{ item.eventTime | moment('DD/MM/YYYY HH:mm') }}</td>
              <td>{{ item.eventName }}</td>
              <td>{{ item.side }} {{ item.typeMnemonic }}</td>
              <td>{{ item.amountNominal | round2 }}</td>
              <td>{{ item.odds / 100 }}</td>
              <td class="text-nowrap bet-history-table-actions">
                <div v-if="item.cancellable" @click.prevent="doCancel(item)"
                     class="bethistory-button approve-button">refund
                </div>

              </td>
            </tr>
          </table>
        </div>
      </Paginate>
      <button @click.prevent="massRefund(onlyRefund)" class="button">Refund all</button>
    </div>

    <Paginate :items="others" :pageSize="config.betPageSize">
      <div slot-scope="{ items }">
        <table class="bet-history-table">
          <thead>
          <th>Event date</th>
          <th>Event</th>
          <th>Bet</th>
          <th>Reserved</th>
          <th>Odds</th>
          <th>Payout</th>
          <th>Approve</th>
          <th>WAVES Explorer</th>
          </thead>
          <tr v-for="item in items" :key="item.betid">
            <td class="text-nowrap">{{ item.eventTime | moment('DD/MM/YYYY HH:mm') }}</td>
            <td>{{ item.eventName }}</td>
            <td>{{ item.side }} {{ item.typeMnemonic }}</td>
            <td>{{ item.amountNominal | round2 }}</td>
            <td>{{ item.odds / 100 }}</td>
            <td>{{ item.matchedNominal | round2 }}</td>
            <td class="text-nowrap bet-history-table-actions" :class="item.lock ? 'locked' : ''">
              <div v-if="item.canApprove" @click.prevent="doApprove(item, 1)"
                   class="bethistory-button approve-button">approve
              </div>
              <div v-if="item.canDispute" @click.prevent="doApprove(item, 2)"
                   class="bethistory-button dispute-button">dispute
              </div>
              <div v-if="item.cancellable" @click.prevent="doCancel(item)"
                   class="bethistory-button refund-button">refund
              </div>
              <div v-if="item.isDefeated">approved defeat</div>
              <div v-if="item.hasUnconfirmedPeers">waiting for peer</div>
              <div v-if="item.hasAdmittedPeers">approved by peer</div>
              <div v-if="item.isDisputed">
                <RouterLink
                    :to="{ name: ROUTE.dispute, params: { event: item.event, bet: item.betid }}">
                  dispute
                </RouterLink>
              </div>
            </td>
            <td>
              <div :inner-html.prop="item.cancel_tx | wavesExporer('refund')"></div>
              <div>
                <div v-for="payout in item.madePayouts"
                     :inner-html.prop="payout | wavesExporer('winner tx')"></div>
              </div>
            </td>
          </tr>
        </table>
      </div>
    </Paginate>
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
      ...mapActions(['fetchMyBetsExtended', 'approveDefeat', 'cancelBet', 'makePayouts', 'massApproveDefeat', 'massCancel', 'setDelegateStatus']),
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
