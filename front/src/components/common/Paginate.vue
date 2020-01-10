<template>
  <div>
    <slot :items="displayItems"></slot>
    <button @click="more" v-if="isLastPage" class="loadmore-button">Load more</button>
  </div>
</template>

<script>
  export default {
    props: {
      items: {
        type: Array,
        default: () => [],
      },
      pageSize: {
        type: Number,
        default: () => 10,
      },
      extend: {
        type: Function,
        default: null,
      },
    },
    computed: {
      displayItems() {
        const sliced = this.items.slice(0, (this.currentPage + 1) * this.pageSize);
        return this.extend ? this.extend(sliced) : sliced;
      },
      isLastPage() {
        return Math.floor(this.items.length / this.pageSize) >= this.currentPage + 1;
      },
    },
    methods: {
      more() {
        this.currentPage++;
      },
    },
    data() {
      return {
        currentPage: 0,
      }
    },
  }
</script>
