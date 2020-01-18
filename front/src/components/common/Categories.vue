<template>
  <div v-if="getCategories">
    <div v-for="(sportData, sport) in getCategories" :key="sport" class="sidebar-sport">
      <div class="sidebar-sport-title">
        <RouterLink class="sidebar-sport-title-link" :to="routeParams(sport)">{{ sport }}</RouterLink>
      </div> 
      <div v-for="(country) in (sportData || {}).countries"
           :key="country.country" class="sidebar-country-container">
        <div class="sidebar-country-title">
          <RouterLink class="sidebar-country-title-link" :to="routeParams(sport, country.country)">
            {{country.country }}
          </RouterLink>
        </div>
        <div v-if="activeCountry === country.country" class="sidebar-leagues">
          <div v-for="league in country.leagues" :key="league.league" class="sidebar-league-item">
            <RouterLink class="sidebar-league-item-link"
                        :to="routeParams(sport, country.country, league.league)">{{ league.league }}
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
  import {mapActions, mapGetters} from "vuex";
  import {ROUTE} from "../../router";
  import config from '../../config/config';

  let refreshTimeout = null;

  export default {
    data() {
      return {
        activeTree: false,
        activeSport: '',
        activeCountry: '',
        topCategories: _.map(config.topCategories, c => c.name),
      }
    },
    computed: {
      ...mapGetters(['getCategories']),
    },
    methods: {
      ...mapActions(['fetchEvents']),
      routeParams(sport, country, league) {
        if (league) {
          return {name: ROUTE.categorySportCountryLeague, params: {sport, country, league}};
        }
        if (country) {
          return {name: ROUTE.categorySportCountry, params: {sport, country}};
        }
        if (sport) {
          return {name: ROUTE.categorySport, params: {sport}};
        }
        return {name: ROUTE.categoryTop, params: {}};
      },
    },
    mounted() {
      // this.fetchEvents();
    },
    beforeDestroy() {
      clearInterval(refreshTimeout);
    },
    watch: {
      $route: {
        handler() {
          const newSport = this.$route.params.sport || config.defaultSport;
          if (newSport !== this.activeSport) {
            this.activeSport = newSport;
            // this.loadDisplayedEvents();
          }
          this.activeCountry = this.$route.params.country || '';
        },
        immediate: true
      },
    },
  };
</script>

<style>
  .sidebar-sport {
    /*max-height: 30vh;*/
    /*overflow: auto;*/
    /*padding-bottom: 15px;*/
    margin-bottom: 16px;
    transition: height 400ms ease-in;
  }

  .sidebar {
    width: 244px;
    padding-top: 16px;
    flex: none;
    background: var(--btx-gray);
    top: 0;
    display: block;
    position: relative;
    min-height: calc(100vh - 78px);
    box-sizing: border-box;
    padding-bottom: 96px;
    color: #525252;
    transition: all 400ms;
    margin-left: 8px;
    border-radius: 8px;
  }

  .sidebar a {
    text-decoration: none;
    color: #525252;
  }

  .sidebar-copy {
    font-size: 12px;
    position: absolute;
    bottom: 0;
    left: 0;
    opacity: .4;
    width: 100%;
    text-align: left;
    padding: 0 24px 8px;
    box-sizing: border-box;
    font-weight: 400;
  }

  .sidebar-sport-title {
    letter-spacing: 0;
    /*margin-bottom: 15px;*/
    padding: 0 18px 0 16px;
    position: relative;
    margin-right: auto;
    font-size: 18px;
    z-index: 99;
    color: var(--btx-black);
  }

  .sidebar-sport-title .router-link-exact-active.router-link-active {
    color: var(--btx-green);
  }

  .sidebar-sport-title a {
    color: var(--btx-black);
    font-weight: 700;

  }

  .sidebar-country-container {
    /*border-bottom: 1px solid #dadde0;*/
  }

  .sidebar-country-title {
    letter-spacing: 0;
    line-height: 24px;
    padding: 0 18px 0 16px;
    position: relative;
    margin-right: auto;
    font-weight: 600;
    white-space: nowrap;
    /*border-bottom: 1px solid #dadde0;*/
    /*margin-bottom: 16px;*/

  }

  .sidebar-country-title a {
    font-size: 16px;
    color: var(--btx-black);
    letter-spacing: 0;
    line-height: 24px;
    color: var(--gray);

  }

  .sidebar-country-title a:hover {
    color: var(--btx-black);
  }

  .sidebar-leagues {
    background: var(--btx-white);
    padding: 16px 0px;
    margin: 0 8px;
    transition: height 400ms ease-in;
    border-radius: 4px;

  }

  .sidebar-leagues a {
    color: var(--btx-black);
    font-size: 16px;
  }

  .sidebar-leagues-open {
    /*padding-top: 8px;*/
    padding-bottom: 24px;
    height: auto;
  }

  .sidebar-league-item {
    letter-spacing: 0;
    padding: 0 18px 0 18px;
    font-size: 16px;
    color: var(--btx-black);

  }

  .sidebar-league-item:not(:last-child) {

    margin-bottom: 8px;
  }

  .sidebar-league-item-link {
    font-size: 14px;
    line-height: 1.6;
    text-decoration: none;
    color: var(--btx-black);
  }

  .sidebar-league-item-link.router-link-exact-active.router-link-active {
    font-weight: 600;
    color: #4b7f63;
  }

  .sidebar-league-item-link:hover {
    /*font-size: 14px;*/
    color: var(--btx-black)
  }

  .sidebar-country-title-link {
    padding-top: 4px;
    padding-bottom: 8px;
    display: block;
    font-weight: 500;
    font-size: 14px;

  }

  .sidebar-country-title-link:after, .sidebar-sport-title-link:after {
    content: "";
    background-image: url("data:image/svg+xml;charset=utf8,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'%3E%3Cdefs%3E%3Cpath id='a' d='M18.59 16.41L20 15l-8-8-8 8 1.41 1.41L12 9.83'/%3E%3C/defs%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cmask id='b' fill='%23fff'%3E%3Cuse xlink:href='%23a'/%3E%3C/mask%3E%3Cg mask='url(%23b)' fill='%235f6368'%3E%3Cpath d='M0 0h24v24H0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    transform: rotate(180deg);
    transform-origin: center center;
    display: inline-block;
    width: 12px;
    margin-left: 4px;
    height: 12px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center center;
    vertical-align: middle;
    transition: transform 350ms ease
  }

  .sidebar-country-title-link.router-link-active {
    /*font-weight: 600;*/
    color: var(--btx-green)
  }

  .sidebar-country-title-link.router-link-active:after, .sidebar-sport-title-link.router-link-active:after {
    transform: rotate(0deg);
  }

</style>
