<template>
  <div class="sticky-bar">
    <!--<div class="sticky-bar-cancellable">-->
    <!--<div class="title-3">Open bets-->
    <!--<div class="bubble">{{open.length}}</div>-->
    <!--</div>-->
    <!--</div>-->
    <!--<div class="sticky-bar-uncancellable">-->
    <!--<div class="title-3">Placed bets-->
    <!--<div class="bubble">{{placed.length}}</div>-->
    <!--</div>-->
    <!--</div>-->

    <tabs v-if="isLoggedIn">
      <tab name="All bets" :selected="true">
        <StickyBet v-for="bet in open" :bet="bet" :key="bet.betid"></StickyBet>
        <StickyBet v-for="bet in placed" :bet="bet" :key="bet.betid"></StickyBet>
        <!--<h1>Here is the content for the about us tab.</h1>-->
      </tab>
      <tab name="Open" class="disabled" :summary="open.length">
        <StickyBet v-for="bet in open" :bet="bet" :key="bet.betid"></StickyBet>
        <!--<h1>Here is the content for the about us tab.</h1>-->
      </tab>

      <tab name="Placed" :summary="placed.length">
        <StickyBet v-for="bet in placed" :bet="bet" :key="bet.betid"></StickyBet>
        <!--<h1>Here is the content for the about our culture tab.</h1>-->
      </tab>

    </tabs>
  </div>
</template>

<style>
  .sticky-bar {
    position: sticky;
    top: 80px;
    /*right: 8px;*/
    bottom: 0;
    min-width: 244px;
    box-sizing: content-box;
    /*padding-left: 16px;*/
    /*background: var(--btx-gray);*/
    border-radius: 8px;
    /*padding: 16px;*/
    margin-top: 130px;
    min-height: 320px;
    margin-left: 16px;
  }

  .title-2 {
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .title-3 {
    font-weight: 700;
    font-size: 14px;
    color: var(--btx-black);
    letter-spacing: 0;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .sticky-bar-cancellable {
    margin-bottom: 24px;
  }

  /*@media screen and (max-width: 1280px) {*/
    /*.sticky-bar {*/
      /*display: none;*/
    /*}*/

  /*}*/
</style>

<script>
  import _ from 'lodash';
  import {mapActions, mapGetters} from "vuex";
  import StickyBet from './StickyBet';
  import config from '../../config/config';
  import tabs from "./tabs";
  import tab from "./tab";

  export default {
    components: {
      StickyBet, tab, tabs
    },
    computed: {
      ...mapGetters(['getMyBetsExtended', 'isLoggedIn']),
      open() {
        return _.filter(this.getMyBetsExtended, bet => bet.isOpen);
      },
      placed() {
        return _.filter(this.getMyBetsExtended, bet => bet.isPlaced).slice(0, config.maxPlacedBets);
      },
    },
  };
</script>
