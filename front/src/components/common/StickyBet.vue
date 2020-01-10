<template>
  <div class="sticky-bet shine-slide" :class="bet.cancellable ? 'sticky-bet-cancellable' : ''">
    <div class="sticky-bet-title">{{ bet.eventName }}</div>
    <!--<div class="sticky-bet-status" v-if="bet.isOpen">OPEN</div>-->
    <!--<div>Match odds {{ bet.side }} {{ bet.subevent }} <b>x{{ bet.odds/100 }}</b></div>-->
    <!--<div>{{ bet.spentNominal | round2 }}/{{ bet.amountNominal | round2 }}</div>-->
    <div @click.prevent="doCancelBet(bet.betid)" class="close-corner-icon" v-if="bet.cancellable"></div>
    <table class="sticky-bet-table">
      <thead>
      <th>Bet</th>
      <th>Odd</th>
      <th>Amount
        <span class="asset-name">
        {{ bet.asset }}
      </span>
      </th>
      </thead>
      <tbody>

      <td>{{ bet.side }} {{ bet.subevent }}</td>
      <td>x{{ bet.odds/100 }}</td>
      <td v-if="bet.cancellable">
        <span class="c-green">{{ bet.spentNominal | round2 }}</span>/{{ bet.amountNominal | round2 }}
        <!--<span class="asset-name">-->
        <!--{{ bet.asset }}-->
      <!--</span>-->
      </td>
      <td v-if="!bet.cancellable">{{ bet.spentNominal | round2 }}
      </td>
      </tbody>
    </table>
    <div class="sticky-bet-line" v-if="bet.cancellable">
      <div class="sticky-bet-line sticky-bet-line-percent" :style="{width:percent + '%'}">
      </div>
    </div>
  </div>
</template>


<style>

  .sticky-bet-title {
    font-weight: 500;
    font-size: 14px;
    color: var(--btx-black);
    letter-spacing: 0;
    margin-bottom: 8px;
    width: 95%;
  }

  .sticky-bet-status {
    font-weight: 700;
    display: block;
    width: max-content;
    font-size: 10px;
    color: #696974;
    letter-spacing: 0;
    background: #F4F7FB;
    padding: 4px 16px;
    border: 1px solid #F4F7FB;
    border-radius: 4px;
    position: absolute;
    top: 16px;
    right: 32px;
  }

  .sticky-bet {
    /*padding: 16px;*/
    padding: 8px;
    font-size: 16px;
    position: relative;
    background: var(--btx-gray);
    /*border: 1px solid #DADDE0;*/
    margin-bottom: 8px;
    transition: all 300ms linear;

    /*background: #FFFFFF;*/
    /*box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.26);*/
    border-radius: 4px;
  }

  @media screen and (max-width: 1240px) {
    .sticky-bet {
      height: 100%;
      right: 0;
    }

  }

  .sticky-bet:hover {
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.24);
    background: var(--btx-white);

  }

  .sticky-bet:hover .sticky-bet-table th {
    color: var(--btx-black);
  }

  .sticky-bet-cancellable {
    /*background: #f4f7fb;*/
  }

  .close-corner-icon {
    position: absolute;
    right: 8px;
    top: 8px;
    width: 10px;
    height: 10px;
    font-size: 25px;
    cursor: pointer;
    background: url("data:image/svg+xml,%3Csvg width='11' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5.404 4.93L9.729.606a.6.6 0 0 1 .849.849L6.252 5.779l4.326 4.326a.6.6 0 0 1-.849.849L5.404 6.628l-4.326 4.326a.6.6 0 0 1-.849-.849l4.326-4.326L.23 1.454a.6.6 0 0 1 .849-.849l4.326 4.326z' fill='%234F5973' fill-rule='nonzero'/%3E%3C/svg%3E") no-repeat;
    background-size: contain;
  }

  .sticky-bet-line {
    width: 100%;
    background: #E2E2EA;
    height: 4px;
    border-radius: 4px;
  }

  .sticky-bet-line-percent {
    background: var(--btx-green);
  }

  .sticky-bet-table {
    text-align: left;
    width: 100%;

  }

  .sticky-bet-table th {
    font-weight: 700;
    font-size: 10px;
    color: var(--gray);
    text-transform: uppercase;
    letter-spacing: 0;
    transition: color 600ms linear;

  }

  .sticky-bet-table th:first-child {
    width: 100px;
  }

  .sticky-bet-table td {
    font-weight: 500;
    font-size: 13px;
    color: var(--btx-black);
    letter-spacing: 0;
  }
</style>

<script>
  import config from '../../config/config';
  import {mapActions} from "vuex";

  export default {
    props: {
      bet: {
        type: Object,
        default: () => {

        },
      },
    },
    computed: {
      config: () => config,
      percent() {
        return this.bet.spentNominal / this.bet.amountNominal * 100;
      },
    },
    methods: {
      ...mapActions(['cancelBet']),
      doCancelBet(betid) {
        this.cancelBet(betid);
      },
    },
  };
</script>
