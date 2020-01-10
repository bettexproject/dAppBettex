<template>
  <div class="tabs-list">
    <div class="tabs" v-for="tab in tabs">
      <div :href="tab.href" @click="selectTab(tab)" class="tab-title" :class="{ 'is-active': tab.isActive }">
        {{ tab.name }} <span v-if="tab.summary" class="bubble">{{tab.summary}}</span>
      </div>
    </div>
    <div class="tabs-details">
      <slot></slot>
    </div>
  </div>
</template>
<style>
  .tabs-list {

  }

  .tabs {
    display: inline-block;

  }

  .tabs:not(:last-child) {
    margin-right: 16px;
  }

  .tabs .title-3 {
    display: inline-block;
    cursor: pointer;
  }

  .tab-title {
    font-weight: 500;
    font-size: 18px;
    letter-spacing: 0;
    margin-bottom: 16px;
    cursor: pointer;
  }

  .tab-title.is-active {
    color: var(--btx-green)
  }
</style>
<script>
  import tab from "./tab";

  export default {
    components: {tab},
    data() {
      return {
        tabs: [],
        summary: {
          type: Number,
          default: false,
        }
      };

    },

    created() {
      this.tabs = this.$children;
    },

    methods: {
      selectTab(selectedTab) {
        this.tabs.forEach(tab => {
          tab.isActive = (tab.href === selectedTab.href);
        });
      }
    }
  }
</script>
