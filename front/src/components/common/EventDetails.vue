<template>
  <div class="event-page" v-if="!!event">
    <div class="event-league-title">
      <a @click="$router.go(-1)" class="link-back">Back</a>
      <a class="c-green"
         :href="'/' + event.sport +'/' + event.league + '/' + event.country">{{event.sport}}. {{event.country
        }}</a>. {{ event.league }}
    </div>

    <div class="event-page-teams">
      <div class="event-page-teams-info">
        {{event.timestamp | moment('DD MMMM YYYY HH:mm UTC')}}
      </div>

      <div class="event-page-teams-block">
        <div class="event-page-teams-team">
          {{event.teams[0].name}}

        </div>
        <div class="event-page-teams-score">
          <span class="event-page-teams-score-wr">{{event.teams[0].score}}</span> :
          <span class="event-page-teams-score-wr">{{event.teams[1].score}}</span>
        </div>
        <div class="event-page-teams-team">
          {{event.teams[1].name}}
        </div>
      </div>
      <div class="event-page-teams-status">
        {{event.status === 100? "Ended": ''}}
      </div>
    </div>

    <div class="event-page-bets">

      <div class="event-page-bets-column">
        <div class="event-page-bets-group">
          <div class="event-page-bets-group-title title-3">
            Match odds
          </div>
          <div v-for="i in filterByKey(/^(t1|draw|t2)$/)" :key="i.title" class="bet-line">
            <div class="bet-line-title">
              {{ i.title }}
            </div>
            <BetLine view="6-lane" :event="event" :exact-subevent="i.subevent"></BetLine>
          </div>
        </div>

        <div class="event-page-bets-group">
          <div class="bet-line-title">
            Both resultative
          </div>
          <BetLine view="2-lane" :event="event" exact-subevent="both"></BetLine>
        </div>

        <div class="event-page-bets-group">
          <div class="event-page-bets-group-title title-3">
            Total
          </div>
          <div v-for="i in filterByKey(/^total-/)" :key="i.title" class="bet-line">
            {{ i.title }}
            <BetLine view="2-lane" :event="event" :exact-subevent="i.subevent"></BetLine>
          </div>
        </div>
        <div v-for="i in filterByKey(/^handicap-/)" :key="i.title" class="bet-line">

          {{ i.title }}
          <BetLine view="2-lane" :event="event" :exact-subevent="i.subevent"></BetLine>
        </div>
      </div>
      <div class="event-page-bets-column">
        <div class="event-page-bets-group event-page-bets-group-short">
          <div class="event-page-bets-group-title title-3">
            Exact score
          </div>
          <div v-for="i in filterByKey(/^exact-/)" :key="i.title" class="bet-line bet-line-short">
            {{ i.title }}
            <BetLine view="2-lane" :event="event" :exact-subevent="i.subevent"></BetLine>
          </div>
        </div>

        <div v-for="i in filterByKey(/^total(even|odd)$/)" :key="i.title" class="bet-line">
          {{ i.title }}
          <BetLine view="2-lane" :event="event" :exact-subevent="i.subevent"></BetLine>
        </div>
        <div v-for="i in filterByKey(/^perioddraw-(p1|p2|p3)$/)" :key="i.title" class="bet-line">
          {{ i.title }}
          <BetLine view="2-lane" :event="event" :exact-subevent="i.subevent"></BetLine>
        </div>
      </div>
    </div>
    <pre>{{ event }}</pre>

  </div>
</template>

<script>
  import BetLine from "./BetLine";
  // import {getBetTypes} from "../../store/events";

  export default {
    props: {
      event: {
        type: Object, default: () => {
        },
      },
    },
    components: {BetLine},
    computed: {
      filterByKey() {
        // return (reg) => {
        //   const betTypes = this.event && getBetTypes(this.event);
        //   const filtered = {};
        //   _.forEach(betTypes, (val, key) => key.match(reg) && (filtered[key] = val));
        //   return _.map(filtered, (val, key) => ({
        //     subevent: key, title: val && val.name,
        //   }));
        // };
      },
    },
  };
</script>

<style>

  .link-back {
    cursor: pointer;
    font-size: 12px;
    color: #90A3AE;
    letter-spacing: 0;
    margin-right: 16px;
    transition: opacity 200ms ease-in, transform 200ms ease-in;
    display: inline-block;
    align-items: center;
    vertical-align: middle;
    align-self: flex-start;
    background: var(--btx-white);
    z-index: 5;
  }

  a.link-back {
    text-decoration: none;
  }

  .link-back:before {
    content: '';
    width: 18px;
    height: 18px;
    background: no-repeat url("data:image/svg+xml,%3Csvg width='37' height='37' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Ccircle fill='%23F4F7FB' cx='18.5' cy='18.5' r='18.5'/%3E%3Cpath d='M20.865 18.5l-4.633-4.977a.883.883 0 0 1 .128-1.308 1.053 1.053 0 0 1 1.408.12l5 5.57c.039.044.059.095.088.144.024.039.053.072.07.115.046.107.073.219.073.332 0 .12-.027.233-.072.34-.018.043-.047.076-.071.115-.03.048-.05.1-.088.143l-5 5.572c-.198.22-.482.334-.768.334-.226 0-.453-.07-.64-.216a.883.883 0 0 1-.128-1.307l4.633-4.977z' fill='%2390A3AE'/%3E%3C/g%3E%3C/svg%3E");
    background-size: contain;
    transform: scale(-1, 1);
    display: inline-block;
    vertical-align: middle;
    margin-right: 4px;
    flex: none;
  }

  .event-page-teams {
    background: var(--btx-gray);
    width: 100%;
    padding: 24px;
    box-sizing: border-box;
    border-radius: 4px;
    min-height: 234px;
    margin-bottom: 24px;
  }

  .event-page-teams-team {
    width: 100%;
    max-width: 376px;
  }

  .event-page-teams-team:first-child {
    text-align: right;
  }

  .event-page-teams-block {
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: 600;
    font-size: 24px;
    color: var(--btx-black);
    margin-bottom: 16px;
  }

  .event-page-teams-info {
    display: flex;
    justify-content: center;
    margin-bottom: 24px;
    font-size: 14px;
    color: #343B4C;
    letter-spacing: 0;
  }

  .event-page-teams-score {
    font-weight: 700;
    font-size: 48px;
    color: var(--btx-black);
    text-align: center;
    line-height: 36px;
    margin: 0 24px;
    flex: none;
  }

  .event-page-teams-score-wr {
    min-width: 70px;
    text-align: center;
    display: inline-block;

  }

  .event-page-bets {
    display: flex;
    width: 100%;
    justify-content: space-between;
  }

  .event-page-bets-column {
    flex-basis: calc(50% - 8px);
  }

  .event-page-teams-status {
    display: flex;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    color: #940819;
    letter-spacing: 0;
    text-transform: uppercase;
  }

  .bet-line {
    display: flex;
    justify-content: space-between;
    text-align: left;
    align-items: center;
    flex-wrap: wrap;

  }

  .bet-line:not(:last-child) {
    border-bottom: 1px solid var(--btx-gray);
    padding-bottom: 8px;
  }

  .bet-line:not(:first-of-type) {
    padding-top: 8px;

  }

  .event-page-bets-group {
    margin-bottom: 16px;
    /*display: flex;*/
    /*flex-wrap: wrap;*/
  }

  .event-page-bets-group-short {
    justify-content: space-between;
    display: flex;
    flex-wrap: wrap;

  }

  .bet-line .bet-popup {
    flex: none;
  }

  .bet-line-short {
    width: calc(50% - 8px);
    display: inline-flex;
  }

  .event-page-bets-group-title {
    flex: none;
    width: 100%;
  }

</style>
