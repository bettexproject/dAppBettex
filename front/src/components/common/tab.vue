<template>
  <div v-show="isActive" class="tab-list">
    <slot></slot>
  </div>
</template>
<style>
  .tab-list {
    overflow: hidden;
    /*max-height: 90vh;*/
    padding-bottom: 24px;
    &:not(:empty) {
       overflow-y: scroll;
     }
  }
</style>
<script>
  export default {
    props: {
      name: {required: true},
      selected: {default: false},

    },

    data() {
      return {
        isActive: false
      };
    },

    computed: {
      href() {
        return '#' + this.name.toLowerCase().replace(/ /g, '-');
      }
    },

    mounted() {
      this.isActive = this.selected;
    },
  }
</script>