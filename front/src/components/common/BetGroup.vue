<template>
  <div class="bet-wrap" :class="event.isFinished ? 'locked' :''">
    <div class v-if="view === '6-lane'">
      <div class="bet-group bet-group-three-line">
        <div v-for="(bar, idx) in bars6(exactSubevent)" class="bet-sides">
          <div
            @click.prevent="openBets(exactSubevent, bar.side)"
            :class="`bet-side-${(idx === 2)||(idx===3) ? bar.side: 'grey'} bet-side shine-slide`"
          >{{ bar.odds | round2 }}</div>
          <div class="bet-side bet-side-unmatched">{{ bar.total | round2 }}</div>
        </div>
      </div>
    </div>
    <div class="bet-group bet-group-two-lane" v-if="view === '2-lane'">
      <div v-for="side in sides" class="bet-sides">
        <div
          @click.prevent="openBets(exactSubevent, side)"
          :class="`bet-side-${side} bet-side shine-slide`"
        >{{ topOdds(exactSubevent, side).odds | round2 }}</div>
        <div
          class="bet-side bet-side-unmatched"
        >{{ topOdds(exactSubevent, side).unmatched | round2 }}</div>
      </div>
    </div>
    <div class="bet-group bet-group-three-line" v-if="view === '3x2-lane'">
      <div v-for="subevent in subevents" class="bet-subevent">
        <div v-for="side in sides" class="bet-sides">
          <div
            @click.prevent="openBets(subevent, side)"
            :class="`bet-side-${side} bet-side shine-slide`"
          >{{ topOdds(subevent, side).odds | round2 }}</div>
          <div class="bet-side bet-side-unmatched">{{ topOdds(subevent, side).unmatched | round2 }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from "vuex";
import config from "../../config/config";
import BetPopup from "./BetPopup";
// import {sportHasDraw} from "../../store/events";

export default {
  props: {
    view: {
      type: String,
      default: "3x2-lane"
    },
    event: {
      type: Object,
      default: () => {}
    },
    exactSubevent: {
      type: String,
      default: () => ""
    },
    value: {
      type: Object,
      default: () => {}
    }
  },
  components: { BetPopup },
  computed: {
    ...mapGetters(["getBetsByEvents", "getStacksByEvents", "getNoKeeper"]),
    subevents() {
      return [1, 3, 2];
    },
    sides() {
      return ["for", "against"];
    },
    topOdds() {
      return (subevent, side) => {
        const subeventStacks = this.event.stacks[subevent] || {};
        const sideStackExt =
          subeventStacks[side !== "for" ? "stackFor" : "stackAgainst"];

        const sideStack = sideStackExt.stack;

        const item = sideStack && sideStack.length && sideStack[0];
        return {
          unmatched:
            (item &&
              item.unmatched / config.decimalMultiplicator) ||
            "-",
          odds: (item && item.odds && item.odds / config.ODDS_PRECISION) || "-"
        };
      };
    }
  },
  methods: {
    openBets(subevent, side) {
      const odds = this.topOdds(subevent, side).odds;
      const newVal = {
        ...this.value,
        showPopup: true,
        startOdds: odds === "-" ? 2 : odds,
        side,
        subevent,
      };
      this.$emit("input", newVal);
    }
  }
};
</script>

<style>
.bet-wrap {
}

.bet-wrap.locked {
  opacity: 0.5;
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
  background: linear-gradient(
    to right,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(128, 186, 232, 0) 99%,
    rgba(125, 185, 232, 0) 100%
  ); /* W3C */
  content: "";
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
