<template>
  <div class="event-list-item">
    <div class="flex-row">
      <div class="event-item-eventdata-group">
        <div class="event-item-scores-group">
          <div class="event-item-scores">
            <div class="event-items-score-value">{{ event.teams[0].score }}
            </div>
            <div class="event-items-score-value">{{ event.teams[1].score }}
            </div>
          </div>
          <div class="event-items-names">
            <div class="event-item-names-value">{{ event.teams[0].name }}</div>
            <div class="event-item-names-value">{{ event.teams[1].name }}</div>
          </div>
        </div>
<!--        <div class="event-item-morebutton" @click.prevent="toSingleEvent(event)">-->
<!--          more-->
<!--        </div>-->
        <div class="event-item-badges">
          <div class="event-item-badge-live" v-if="event.inPlay">
            <div class='pulsar'>
              <div class="point">
              </div>
            </div>
            LIVE
          </div>
          <div class="event-item-badge" v-if="event.matchTime">
            <div v-if="event.isFinished">Ended</div>
            {{ event.matchTime }}
          </div>
        </div>
        <div class="event-items-date">
          <div class="event-items-date-date">{{ event.timestamp | moment('DD MMM YYYY') }}</div>
          <div class="event-items-date-time">{{ event.timestamp | moment('HH:mm') }}
          </div>
          <div class="event-items-date-time"></div>
        </div>
        <MatchedShariks :matched="matchedCount" :unmatched="unmatchedCount"></MatchedShariks>
        <div class="event-item-matched">
          {{ (getTotalMatchedByEvents[event.external_id] || '—') | round2 }}
        </div>
      </div>
      <BetGroup :event="event" v-model="betPopupOptions" :class="event.isFinished ? 'locked':''"></BetGroup>
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

  .event-items-score-value small {
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

  .flex-row {
    display: flex;
    flex-direction: row;
  }

  .event-item-eventdata-group {
    padding-top: 4px;
  }

  .event-item-names-value {
    font-size: 14px;
    color: var(--btx-black);
    letter-spacing: 0;
    line-height: 16px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .event-items-score-value {
    width: 32px;
    text-align: center;
    font-weight: 700;
    font-size: 16px;
    color: var(--btx-black);
    letter-spacing: 0;
    line-height: 16px;
    margin-right: 8px;
  }

  .event-items-score-value:not(:last-child), .event-item-names-value:not(:last-child) {
    margin-bottom: 8px;
  }

  .event-list-item {
    padding: 12px 0 8px 4px;
    font-size: 14px;
    animation: reveal-up 300ms ease-in forwards;
    /*align-items: center;*/
    overflow: hidden;
  }

  .event-list-item:not(:last-child) {
    border-bottom: solid 1px #dadde0;
  }

  .event-team-hdr {
    width: 100px;
    text-align: center;
  }

  .event-team-hdrs {
    display: flex;
    margin-left: auto;
  }

  .event-item-eventdata-group {
    display: flex;
    min-width: calc(100% - 300px);
    justify-content: space-between;
  }

  .event-item-scores-group {
    display: flex;
    width: 225px;
  }

  .event-item-matched {
    flex-basis: 60px;
    text-align: center;
    margin: 0 8px;
    display: flex;
    justify-content: center;
    align-content: flex-start;
    align-items: center;
    max-height: 44px;
  }

  .event-item-matched-value {
    font-size: 13px;
    line-height: 16px;
  }

  .event-items-date {
    font-size: 13px;
    color: var(--gray);
    line-height: 16px;
    text-align: center;
    width: 75px;
    min-width: 75px;
    /*display: flex;*/
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
    align-content: flex-start;
  }

  .event-items-date-date {
    margin-bottom: 8px;
  }

  .event-items-names {
    width: 185px;
  }

  .event-item-morebutton {
    opacity: 0;
    cursor: pointer;
    font-size: 12px;
    color: #90A3AE;
    letter-spacing: 0;
    margin-right: 8px;
    transition: opacity 200ms ease-in, transform 200ms ease-in;
    display: flex;
    align-items: center;
    transform: translateX(-30%);
    align-self: flex-start;
    position: absolute;
    background: var(--btx-white);
    left: 20%;
    z-index: 5;
    height: 100%;
    top: 0;
  }

  .event-item-morebutton:after {
    content: '';
    width: 37px;
    height: 37px;
    background: no-repeat url("data:image/svg+xml,%3Csvg width='37' height='37' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle fill='%23F4F7FB' cx='18.5' cy='18.5' r='18.5'/%3E%3Cpath d='M20.865 18.5l-4.633-4.977a.883.883 0 0 1 .128-1.308 1.053 1.053 0 0 1 1.408.12l5 5.57c.039.044.059.095.088.144.024.039.053.072.07.115.046.107.073.219.073.332 0 .12-.027.233-.072.34-.018.043-.047.076-.071.115-.03.048-.05.1-.088.143l-5 5.572c-.198.22-.482.334-.768.334-.226 0-.453-.07-.64-.216a.883.883 0 0 1-.128-1.307l4.633-4.977z' fill='%2390A3AE'/%3E%3C/g%3E%3C/svg%3E");
    display: inline-block;
    vertical-align: middle;
    margin-left: 8px;
    flex: none;

  }

  .event-list-item:hover .event-item-morebutton {
    opacity: 1;
    transform: translateX(0);
  }

  .event-item-badge-live {
    font-weight: 700;
    font-size: 18px;
    color: #D0021B;
    letter-spacing: 0;
    margin: 0 8px;
    width: 100%;
    display: flex;
    align-items: center;
  }

  .event-item-badge {
    font-weight: 700;
    font-size: 14px;
    color: #525252;
    letter-spacing: 0;
    margin: 0 8px;
    text-transform: uppercase;
    display: inline-block;
  }

  .event-item-badge-time {
    font-size: 13px;
    text-transform: none;
    /*font-weight: 500;*/
    white-space: nowrap;
  }

  .event-item-badges {
    /*min-width: 123px;*/
    text-align: center;
    display: flex;
    align-items: center;
    max-height: 44px;
    flex-basis: 100px;
  }
</style>
