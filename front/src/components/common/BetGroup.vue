<template>
  <div class="bet-wrap" :class="event.isFinished ? 'locked' :''">
    <div class="" v-if="view === '6-lane'">
      <div class="bet-group bet-group-three-line">
        <div v-for="(bar, idx) in bars6(exactSubevent)" class="bet-sides">
          <div @click.prevent="openBets(exactSubevent, bar.side)"
               :class="`bet-side-${(idx === 2)||(idx===3) ? bar.side: 'grey'} bet-side shine-slide`">
            {{ bar.odds | round2 }}
          </div>
          <div class="bet-side bet-side-unmatched">
            {{ bar.total | round2 }}
          </div>
        </div>
      </div>
    </div>
    <div class="bet-group bet-group-two-lane" v-if="view === '2-lane'">
      <div v-for="side in sides" class="bet-sides">
        <div @click.prevent="openBets(exactSubevent, side)" :class="`bet-side-${side} bet-side shine-slide`">
          {{ topOdds(exactSubevent, side).odds | round2 }}
        </div>
        <div class="bet-side bet-side-unmatched">
          {{ topOdds(exactSubevent, side).total | round2 }}
        </div>
      </div>
    </div>
    <div class="bet-group bet-group-three-line" v-if="view === '3x2-lane'">
      <div v-for="subevent in subevents" class="bet-subevent">
        <div v-for="side in sides" class="bet-sides">
          <div @click.prevent="openBets(subevent, side)" :class="`bet-side-${side} bet-side shine-slide`">
            {{ topOdds(subevent, side).odds | round2 }}
          </div>
          <div class="bet-side bet-side-unmatched">
            {{ topOdds(subevent, side).total | round2 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import {mapGetters} from "vuex";
  import config from '../../config/config';
  import BetPopup from './BetPopup';
  // import {sportHasDraw} from "../../store/events";

  export default {
    props: {
      view: {
        type: String,
        default: "3x2-lane"
      },
      event: {
        type: Object,
        default: () => {
        },
      },
      exactSubevent: {
        type: String,
        default: () => '',
      },
      value: {
        type: Object,
        default: () => {
        },
      },
    },
    components: {BetPopup},
    computed: {
      ...mapGetters(['getBetsByEvents', 'getStacksByEvents', 'getNoKeeper']),
      bars6() {
        return (subevent) => {
          const bars = [];
          const forStack = this.stacksOfSubevent(subevent, 'for');
          const againstStack = this.stacksOfSubevent(subevent, 'against');
          const forBars = _.values(forStack && _.reverse((forStack.items).slice(0, 3)));
          const againstBars = _.values(againstStack && againstStack.items).slice(0, 3);

          for (let i = forBars.length; i < 3; i++) {
            bars.push({
              side: 'for',
              total: '—',
              odds: '—',
            });
          }
          _.forEach(forBars, i => {
            bars.push({
              side: 'for',
              total: i.stackAmount,
              odds: i.odds / 100,
            });
          });
          _.forEach(againstBars, i => {
            bars.push({
              side: 'against',
              total: i.stackAmount,
              odds: i.odds / 100,
            });
          });
          for (let i = bars.length; i < 6; i++) {
            bars.push({
              side: 'against',
              total: '—',
              odds: '—',
            });
          }
          return bars;
        };
      },
      stacks() {
        return (this.getStacksByEvents[this.event.external_id]
            && this.getStacksByEvents[this.event.external_id].stacksBySubevents) || {};
      },
      stacksOfSubevent() {
        return (subevent, side) => {
          const stacks = this.stacks;
          const sides = stacks[subevent];
          return sides && sides[side === 'for' ? 'stackAgainst' : 'stackFor'];
        };
      },
      subevents() {
        // return this.event && sportHasDraw(this.event.sport)
        //     ? ["t1", 'draw', "t2"]
        //     : ["t1", "t2"];
      },
      topOdds() {
        return (subevent, side) => {
          const s = this.stacksOfSubevent(subevent, side);
          return (s && s.items[0] && {
            odds: s.items[0].odds / 100,
            total: s.sum,
          }) || ({odds: '—', total: '—'});
        };
      },
    },
    methods: {
      openBets(subevent, side) {
        if (!this.getNoKeeper) {
          this.value.showPopup = true;
          this.value.subevent = subevent;
          this.value.side = side;
          this.value.startOdds = this.topOdds(subevent, side).odds;
          if (isNaN(this.value.startOdds)) {
            this.value.startOdds = this.topOdds(subevent, side === 'for' ? 'against' : 'for').odds;
          }
          if (isNaN(this.value.startOdds)) {
            this.value.startOdds = 2;
          }
          this.$emit('input', {...this.value});
        } else {
          this.$notify({
            group: 'notifications',
            title: 'Waves Keeper',
            text: 'Please install Waves Keeper',
          });
        }
      },
    },
    data() {
      return {
        showPopup: false,
        subeventsNames: ["t1", 'draw', "t2"],
        sides: ['for', 'against'],
      };
    },
  };
</script>

<style>

  .bet-wrap {
  }

  .bet-wrap.locked {
    opacity: .5;
    pointer-events: none;
  }

  .bet-side {
    display: block;
  }

  .bet-group {
    display: flex;
    justify-content: space-between;
  }

  .bet-group-two-lane {
    width: 100px;
  }

  .bet-group-three-line {
    width: calc((96px * 3) + 8px);
  }

  .bet-sides {
    display: flex;
    flex-direction: column;
  }

  .bet-side {
    width: 44px;
    text-align: center;
    display: flex;
    flex-direction: column;
    font-weight: 500;
    font-size: 13px;
    line-height: 16px;
    padding-top: 3px;
    padding-bottom: 3px;
    color: white;
    border-radius: 4px;
    position: relative;
    overflow: hidden;

  }

  .shine-slide {
    overflow: hidden;
  }

  .shine-slide:after {
    animation: slide 800ms forwards 300ms;
    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(128, 186, 232, 0) 99%, rgba(125, 185, 232, 0) 100%); /* W3C */
    content: '';
    top: 0;
    transform: translateX(100%);
    width: 100%;
    height: 220px;
    position: absolute;
    z-index: 1;
  }

  /*.bet-side:not(:last-child) {*/
  /*margin-right: 4px;*/
  /*}*/

  .bet-side-unmatched {
    padding-bottom: 0;
    opacity: 0.7;
    font-size: 12px;
    color: var(--btx-black);
    letter-spacing: 0.55px;
    text-align: center;
  }

  .bet-side-grey {
    border: solid 1px #eee;
    color: var(--btx-black);
    background: var(--btx-gray);
    cursor: pointer;
    .n-m & {
      border: solid 1px #525252;
    }
  }


  .bet-side-for {
    background: var(--btx-lay);
    cursor: pointer;
    border: solid 1px var(--btx-lay);
  }

  .bet-side-against {
    background: var(--btx-back);
    border: solid 1px var(--btx-back);
    cursor: pointer;
  }

  .dex-list-item .bet-side-for {
    background: var(--fin-lay);
    cursor: pointer;
    border: solid 1px var(--fin-lay);
  }

  .dex-list-item .bet-side-against {
    background: var(--fin-back);
    border: solid 1px var(--fin-back);
    cursor: pointer;
  }

  .bet-subevent {
    display: flex;
    width: 96px;
    justify-content: space-between;

  }

  @keyframes slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }


</style>
