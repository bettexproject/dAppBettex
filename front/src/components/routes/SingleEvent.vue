<template>
  <div class="">
    <EventDetails :event="event"></EventDetails>
  </div>
</template>

<script>
  import {mapActions, mapGetters} from "vuex";
  import EventDetails from '../common/EventDetails';

  export default {
    components: {
      EventDetails,
    },
    computed: {
      ...mapGetters(['getEvents', 'getMyBetsExtended']),
      eventId() {
        return this.$route.params.event;
      },
      event() {
        return _.find(this.getEvents, event => event.external_id.toString() === this.eventId.toString());
      },
    },
    methods: {
      ...mapActions(['fetchEventsById', 'fetchBets']),
    },
    mounted() {
      this.fetchEventsById([this.eventId]);
      this.fetchBets([this.eventId]);
    }
  };
</script>

