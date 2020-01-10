<template>
  <div class="dex-list-item">
    <div class="dex-flex-row">
      <!--<div class="dex-item-eventdata-group">-->
        <!--<div class="dex-item-target">{{ event.targetRate }}</div>-->

      <!--</div>-->
      <div class="dex-item-eventdata-group">
        <div class="dex-item-eventdata-group-left dex-item-target">{{ Math.floor(event.targetRate) }}
        </div>
        <div class="dex-item-eventdata-group-right dex-item-target" >{{targetRate()}}
        </div>
      </div>
      <div class="dex-items-date">
        <div class="dex-items-date-date"> {{ event.timestamp | moment('DD/MM/YYYY') }}</div>
        <div class="dex-items-date-time">{{ event.timestamp | moment('HH:mm') }}
        </div>
      </div>
      <div class="dex-item-matched">{{ getTotalMatchedByEvents[event.external_id] | round2 }}</div>
        <BetGroup :event="event" v-model="betPopupOptions" exact-subevent="rate" view="6-lane"></BetGroup>
    </div>
    <div class="flex-row">
      <BetPopup :event="event" v-model="betPopupOptions"></BetPopup>
    </div>

  </div>
</template>

<script>
  import BetGroup from './BetGroup';
  import MatchedShariks from './MatchedShariks';
  import {ROUTE} from '../../router';
  import {mapGetters} from "vuex";
  import BetPopup from './BetPopup';

  export default {
    props: {
      event: {
        type: Object, default: () => {
        },
      }
    },
    components: {BetGroup, MatchedShariks, BetPopup},
    methods: {
      toSingleEvent(event) {
        this.$router.push({name: ROUTE.singleEvent, params: {event: event.external_id}});
      },
      targetRate() {
        let target = this.event.targetRate - Math.floor(this.event.targetRate);
        target = target.toString().slice(2);
          return "." + target;
      }
    },
    computed: {
      ...mapGetters(['getTotalMatchedByEvents', 'getBetsByEvents']),
      matchedCount() {
        return this.getBetsByEvents.matchedByEvents[this.event.external_id] && _.size(this.getBetsByEvents.matchedByEvents[this.event.external_id]);
      },
      unmatchedCount() {
        return this.getBetsByEvents.unmatchedByEvents[this.event.external_id] && _.size(this.getBetsByEvents.unmatchedByEvents[this.event.external_id]);
      },
    },
    data() {
      return {
        betPopupOptions: {
          showPopup: false, side: '', startOdds: '', subevent: '',
        }
      }
    }
  };
</script>

<style>
  .dex-item-eventdata-group-left {
    text-align: right;
    min-width: 30px;
  }
  .dex-item-eventdata-group-right {
    text-align: left;
    min-width: 30px;
  }

  .dex-item-matched {
    width: 50px;
    text-align: center;
    margin-right: 16px;
    font-size: 13px;
    /*height: 36px;*/
  }

  .bet-sign {
    display: flex;
    /*width: 100%;*/
    justify-content: space-between;
    font-size: 12px;
    color: #2C5E72;
    font-weight: 700;
    letter-spacing: 1px;
    line-height: 22px;
    margin-top: 16px;
    text-align: right;
  }

  .bet-sign-item {
    width: calc(100% / 2 - 4px);
  }

  .bet-sign-item:last-child {
    text-align: left;
    color: #a24d59;
  }

  .dex-items-score-value small {
    font-size: 10px;
  }

  @keyframes reveal-up {
    0% {
      transform: translateY(20%);
    }
    100% {
      transform: translateY(0);
    }
  }

  .dex-flex-row {
    display: flex;
    flex-direction: row;
    /*flex-wrap: wrap;*/
    justify-content: space-between;
    align-items: center;

  }

  .dex-item-eventdata-group {
    padding-top: 4px;
    min-width: 64px;
    padding-left: 8px;
  }

  .dex-item-names-value {
    font-size: 16px;
    color: var(--btx-black);
    letter-spacing: 0;
    line-height: 16px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .dex-items-score-value {
    width: 32px;
    text-align: center;
    font-weight: 700;
    font-size: 16px;
    color: var(--btx-black);
    letter-spacing: 0;
    line-height: 16px;
    margin-right: 8px;
  }

  .dex-items-score-value:not(:last-child), .dex-item-names-value:not(:last-child) {
    margin-bottom: 8px;
  }

  .dex-list-item {
    box-sizing: border-box;
    font-size: 14px;
    animation: reveal-up 300ms ease-in forwards;
    overflow: hidden;
    width: 100%;
    animation: reveal-up 300ms ease-in forwards;
    min-width: 328px;
    padding-top: 8px;
    padding-bottom: 8px;

  }

  .dex-list-item:not(:last-child) {
    border-bottom: solid 1px var(--btx-darkgrey);
  }

  .dex-list-item:hover {
    background: var(--btx-gray);
  }

  .dex-item-eventdata-group {
    display: flex;
    /*min-width: calc(100% - 300px);*/
    justify-content: center;
    align-items: baseline;
    font-variant-numeric: tabular-nums;
  }

  .dex-item-target {
    font-weight: 700;
    font-size: 16px;
    /*min-width: 70px;*/
    /*text-align: left;*/
  }

  .dex-items-date {
    font-size: 14px;
    color: var(--gray);
    line-height: 16px;
    text-align: left;
    display: flex;
    justify-content: flex-end;
    /*width: 100%;*/
    margin-left: auto;
    margin-right: 16px;
    font-variant-numeric: tabular-nums;

  }

  .dex-items-date-date {
    margin-right: 8px;
  }

  .dex-items-names {
    width: 185px;
  }

  /*.dex-item-morebutton {*/
  /*opacity: 0;*/
  /*cursor: pointer;*/
  /*font-size: 12px;*/
  /*color: #90A3AE;*/
  /*letter-spacing: 0;*/
  /*margin-right: 8px;*/
  /*transition: opacity 200ms ease-in, transform 200ms ease-in;*/
  /*display: flex;*/
  /*align-items: center;*/
  /*transform: translateX(-30%);*/
  /*align-self: flex-start;*/
  /*position: absolute;*/
  /*background: var(--btx-white);*/
  /*left: 20%;*/
  /*z-index: 5;*/
  /*height: 100%;*/
  /*top: 0;*/
  /*}*/

  /*.dex-item-morebutton:after {*/
  /*content: '';*/
  /*width: 37px;*/
  /*height: 37px;*/
  /*background: no-repeat url("data:image/svg+xml,%3Csvg width='37' height='37' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle fill='%23F4F7FB' cx='18.5' cy='18.5' r='18.5'/%3E%3Cpath d='M20.865 18.5l-4.633-4.977a.883.883 0 0 1 .128-1.308 1.053 1.053 0 0 1 1.408.12l5 5.57c.039.044.059.095.088.144.024.039.053.072.07.115.046.107.073.219.073.332 0 .12-.027.233-.072.34-.018.043-.047.076-.071.115-.03.048-.05.1-.088.143l-5 5.572c-.198.22-.482.334-.768.334-.226 0-.453-.07-.64-.216a.883.883 0 0 1-.128-1.307l4.633-4.977z' fill='%2390A3AE'/%3E%3C/g%3E%3C/svg%3E");*/
  /*display: inline-block;*/
  /*vertical-align: middle;*/
  /*margin-left: 8px;*/
  /*flex: none;*/

  /*}*/

  .dex-list-item:hover .dex-item-morebutton {
    opacity: 1;
    transform: translateX(0);
  }

</style>
