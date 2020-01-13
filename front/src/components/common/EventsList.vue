<template>
    <div class="">
        <div class="event-category-title">{{sportFromRouting}}</div>
        <DateFilter :adapter="adapterFromRouting"></DateFilter>
        <span v-for="sport in eventTree" :key="sport.sport">
<!--            <div class="event-category-title">{{sport.sport}}</div>-->
<!--            <DateFilter :adapter="adapterFromRouting"></DateFilter>-->
            <span v-for="country in sport.countries" :key="country.country">
                <div v-for="league in country.leagues"
                     :key="league.league"
                     :class="'event-league-group'">
                    <div class="event-league-title">
                        <a class="c-green" :href="'/' + sport.sport + '/' + country.country">{{ country.country }}</a>.
                      {{ league.league }}
                    </div>

                  <!--<div >-->

                    <div>
                        <div class="event-list-header">
                            <div class="event-list-header-score event-hdr">Rate</div>
                            <div class="event-list-header-event event-hdr">Event</div>
                            <div class="event-team-hdrs">
                                <div class="event-team-hdr">1</div>
                                <div class="event-team-hdr">Draw</div>
                                <div class="event-team-hdr">2</div>
                            </div>
                        </div>
                        <EventSportr v-for="event in league.events" :key="event.external_id"
                                     :event="event"></EventSportr>
                    </div>

                </div>
            </span>
            <Modal v-model="showModal" @close="showModal = false">
                <AddBet
                        :category1="category1"
                        :category2="category2"
                        :category3="category3"
                        :on-signed="() => { showModal = false }"
                        :on-rejected="() => { showModal = false }"
                />
            </Modal>
        </span>
        <button v-if="!isComplete" @click.prevent="more" class="loadmore-button">Load more events</button>
<!--        <Payouts></Payouts>-->
    </div>
</template>

<script>
  import {mapActions, mapGetters, mapMutations} from "vuex";
  import config from '../../config/config';
  import EventSportr from './EventSportr';
  import EventDex from './EventDex';
  import DateFilter from "./DateFilter";
//  import {getCategoryAdapter} from "../../store/events";
  import Modal from '../common/Modal';
//  import AddBet from './AddBet';
  import Payouts from './Payouts';


  export default {
    components: {EventSportr, EventDex, DateFilter, Modal, Payouts},
    data() {
      return {
        showModal: false,
        category1: '',
        category2: '',
        category3: '',
      }
    },
    computed: {
      ...mapGetters(['getEventTreePaginated', 'getFilteredEvents', 'getMaxPage', 'getLoading', 'getPayouts']),
      adapterFromRouting() {
        // return getCategoryAdapter(this.sportFromRouting);
      },
      sportFromRouting() {
        return this.$route.params.sport || config.topCategories[0].name;
      },
      eventTree() {
        return this.getEventTreePaginated.tree;
      },
      isComplete() {
        return this.getEventTreePaginated.isComplete;
      },
      nextCount() {
        return this.getEventTreePaginated.nextCount;
      },
    },
    methods: {
      ...mapMutations(['setMaxPage']),
      ...mapActions(['loadEventsForFilter']),
      getCategoryAdapter: (categoryName) => getCategoryAdapter(categoryName),
      addBetting(category1, category2, category3) {
        this.showModal = true;
        this.category1 = category1;
        this.category2 = category2;
        this.category3 = category3;
      },
      more() {
        this.setMaxPage(this.nextCount);
      },
    },
    watch: {
      $route: {
        handler() {
          this.loadEventsForFilter(this.$route.params);
        },
        immediate: true,
      },
      getEventTreePaginated() {
        // const ids = [];

        // _.forEach(this.getEventTreePaginated.tree, s => _.forEach(s.countries, c => _.forEach(c.leagues, l => _.forEach(l.events, e => ids.push(e.external_id)))));

        // ids.length && this.fetchBets(ids);
      },
    },
  };
</script>

<style>

    .dex-event-hdr {
        /*width: 325px;*/
      margin-left: auto;
      margin-right: 16px;
    }

    .dex-event-matched {
      width: 50px;
      margin-right: 16px;
    }

  .finance-rates-list {
    display: flex;
    justify-content: space-between;
    margin-bottom: 48px;
  }

  .finance-rates-item {
    background: #FBFBFD;
    /*padding: 24px 24px 8px;*/
    box-shadow: 0 2px 2px 0 rgba(0, 0, 0, 0.26);
    border-radius: 8px;
    min-width: 230px;
    box-sizing: border-box;
  }

  .finance-rates-item-title {
    font-weight: 700;
    padding: 24px 0 0 24px;
    font-size: 14px;
    color: #4F5973;
  }

  .finance-rates-chart {
    height: 100px;
    width: 100%;
    margin-bottom: 16px;
  }

  .finance-rates-item-sum {
    padding: 0 0 0 24px;
    font-weight: 700;
    font-size: 30px;
    color: #343B4C;
  }

  .finance-rates-button {
    font-weight: 600;
    padding: 8px 16px;
    text-align: center;
    font-size: 14px;
    color: #FBFBFD;
    letter-spacing: 0;
    background: #4F5973;
    border-radius: 4px;
    display: block;
    margin: auto;
    margin-bottom: 8px;
    max-width: 120px;
    cursor: pointer;
  }

  .finance-rates-button:hover {
    background: #9A3A46;
    border-radius: 4px;
  }

  .event-league-group {
    margin-bottom: 24px;
  }

  .event-league-group-dex {
    margin-bottom: 24px;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
  }

  .event-list-header {
    display: flex;
    justify-content: flex-start;
    background-color: var(--btx-gray);
    padding: 4px 0 4px 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--btx-black);
    position: sticky;
    top: 0;
    z-index: 90;
    border-radius: 4px;

  }

  .event-matched-hdr {
    width: 105px;
    text-align: center;
    margin-left: auto;
  }

  .event-list-header-score {
    width: 32px;
    margin-right: 8px;
  }

  .event-category-title {
    font-size: 32px;
    font-weight: 600;
    color: var(--btx-black);
    letter-spacing: 0;
    margin-bottom: 16px;
  }

  .loadmore-button {
    display: block;
    background: var(--btx-green);
    padding: 8px 24px;
    font-size: 14px;
    font-weight: 500;
    margin: 32px auto auto;
    border-radius: 4px;
    color: white;
  }

  .dex-list-header {
    display: flex;
    justify-content: flex-start;
    background-color: var(--btx-gray);
    padding: 4px 0 4px 0;
    font-size: 12px;
    align-items: baseline;
    font-weight: 600;
    color: var(--btx-black);
    position: sticky;
    top: 0;
    z-index: 90;
    border-radius: 4px;
    width: 100%;
    flex: none;
    box-sizing: border-box;
  }

  .dex-list-header-score {
    width: 64px;
    text-align: left;
    margin-right: 16px;
    margin-left: 8px;
  }

  .dex-hdrs {
    display: flex;
    margin-left: 0;

  .dex-hdr {
    font-weight: 700;
    font-size: 12px;
    color: #2C5E72;
    letter-spacing: 1px;
    line-height: 22px;
    width: 144px;
    text-align: right;

    &:last-child {
      color: #9A3A46;
      margin-left: 8px;
      text-align: left;
    }

  }
  }

    .dex-button-cta {
        font-weight: 600;
        text-transform: none;
        background: #4F5973;
        border-radius: 4px;
        color: #FBFBFD;
        letter-spacing: 0;
        padding: 8px 16px;
        font-size: 14px;
        display: inline-block;
        cursor:pointer;
    &:hover {
    background: #9A3A46;
     }
  }


</style>
