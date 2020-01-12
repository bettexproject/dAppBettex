<template>
  <div class="date-filters">
    <div class="date-filters-title">Period:</div>
    <span v-for="filter in eventDateFiltersList" :key="filter">
            <a href="" @click.prevent="currentFilter = filter" class="date-filter-button"
               :class="currentFilter === filter ? 'active' : ''">{{ filter }}</a>
        </span>
  </div>
</template>

<style>
  .date-filters {
    /*margin-top: 15px;*/
    margin-bottom: 24px;
  }

  .date-filter-button {
    display: inline-block;
    padding: 8px 16px;
    font-size: 14px;
    line-height: 1;
    letter-spacing: 0;
    border: solid 1px transparent;
    text-decoration: none;
    background-color: var(--btx-white);
    box-shadow: none;
    outline: none !important;
    margin-right: 5px;
    color: var(--gray);
    border-radius: 2px;
  }

  .date-filter-button.active {
    color: var(--btx-black);
    background-color: var(--btx-gray);
    border: 1px solid #DADDE0;
    border-radius: 4px;
  }

  .date-filters-title {
    display: inline-block;
    margin-right: 16px;
    font-size: 14px;
    font-weight: 600;
  }
</style>

<script>
  import _ from 'lodash';
  // import {eventDateFilters} from "../../store/events";
  import {mapGetters, mapMutations} from "vuex";

  export default {
    props: {
      adapter: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters(['getEventDateFilter']),
      eventDateFiltersList() {
        // return _.keys(eventDateFilters[this.adapter]);
      },
      currentFilter: {
        get() {
          return this.getEventDateFilter[this.adapter];
        },
        set(value) {
          this.setDateFilter({ adapter: this.adapter, value });
        },
      }
    },
    methods: {
      ...mapMutations(['setDateFilter']),
    }
  }
</script>
