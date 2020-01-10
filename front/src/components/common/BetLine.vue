<template>
  <div class="">
    <BetGroup :event="event" :view="view" v-model="popupData" :exact-subevent="exactSubevent"></BetGroup>
    <BetPopup v-model="popupData" :event="event"></BetPopup>
  </div>
</template>

<script>
  import BetGroup from "./BetGroup";
  import BetPopup from "./BetPopup";

  export default {
    props: {
      view: {
        type: String,
        default: () => '',
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
    },
    components: {BetPopup, BetGroup},
    data() {
      return {
        popupData: {},
      };
    },
  }
</script>