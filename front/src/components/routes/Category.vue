<template>
  <div class="event-contents">
    <div class="event-main">
      <!--<div class="hello">

        <h1>Decentralized betting exchange Bettex</h1>
        <h2>Anonymous & Decentralized platform built on blockchain technology</h2>
        <a class="hello-more" href="//bettex.bet" target="_blank">Read more</a>
      </div>-->

      <EventsList></EventsList>
    </div>
      <StickyBar/>
  </div>

</template>

<script>
  import Categories from '../common/Categories';
  import EventsList from '../common/EventsList';
  import StickyBar from '../common/StickyBar';

  export default {
    components: {Categories, EventsList, StickyBar},
    computed: {
      routeArgs() {
        return this.$route.params;
      }
    }
  }
</script>

<style>
  .hello {
    /*background: var(--btx-gray);*/
    /*padding: 16px;*/
    border-radius: 8px;
    margin-bottom: 32px;
  }

  .hello h2 {
    margin-bottom: 16px;
  }

  .hello-more {
    font-size: 14px;
    text-decoration: none;
    background: var(--btx-black);
    color: var(--btx-white);
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;

  }

  .events-layout {
    flex-direction: row;
    display: flex;
    /*flex-wrap: wrap;*/
  }

  .event-contents {
    /*width: 1268px;*/
    display: flex;
    align-items: flex-start;
  }

  @media screen and (min-width: 1280px) {
    .event-contents {
      max-width: 1284px;
    }
  }

  .event-main {
    width: 100%;
    /*margin-bottom: 30vw;*/
    max-width: 1024px;
  }
</style>
