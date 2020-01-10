<template>
  <div>
    <div v-if="bet">
      {{event.sport}}. {{event.country}}. {{event.league}}
      {{ event.timestamp | moment('DD MMM YYYY')}}

      {{event.teams[0].score}}{{event.teams[0].name}} –
      {{event.teams[1].score}}{{event.teams[1].name}}
      <pre>
      {{ event }}
      </pre>
      <div v-if="bet.isDisputed">
        <div v-if="bet.isWinner === false">По нашим данным, вы проиграли. Признайте поражение, нажав кнопку
        </div>
        <div v-if="bet.isWinner === true">По нашим данным, вы победили. Если вы нажмете кнопку, то отдадите
          выигрыш противнику.
        </div>
        <div v-if="bet.hasAdmittedPeers">Один из противников признал поражение</div>
        <div @click.prevent="doAdmitDefeat" class="approve-button button">Admit defeat</div>
      </div>
      <div v-else>
        Dispute resolved
      </div>
      <div>
        <vue-disqus shortname="dexbettex" :identifier="eventId" :url="pageUrl"></vue-disqus>
      </div>
    </div>
    <div v-else>Загрузка...</div>
  </div>
</template>

<script>
  import {mapActions, mapGetters} from "vuex";
  import config from '../../config/config';

  export default {
    computed: {
      ...mapGetters(['getEvents', 'getMyBetsExtended']),
      eventId() {
        return this.$route.params.event;
      },
      betId() {
        return this.$route.params.bet;
      },
      event() {
        return _.find(this.getEvents, event => event.external_id === this.eventId);
      },
      bet() {
        return _.find(this.getMyBetsExtended, bet => bet.betid === this.betId);
      },
      pageUrl() {
        return `${config.domain}/dispute/${this.eventId}/${this.betid}`;
      },
    },
    methods: {
      ...mapActions(['fetchEventsById', 'fetchBets', 'approveDefeat']),
      doAdmitDefeat() {
        this.approveDefeat({betid: this.betId, code: 1});
      },
    },
    mounted() {
      this.fetchEventsById([this.eventId]);
      this.fetchBets([this.eventId]);
    },
  }
</script>
