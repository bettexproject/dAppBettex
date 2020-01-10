<template>
  <div id="app" class="layout" :class="{'n-m' : getNightMode}">
    <notifications group="notifications" classes="notification"></notifications>
    <!--<button v-on:click="notifications()">тыц</button>-->
    <Header/>
    <div class="events-layout">
      <div class="sidebar">
        <Categories></Categories>
        <div class="sidebar-copy">
          Bettex project © All rights reserved
        </div>
      </div>
      <div class="content">
        <router-view/>
        <a class="scroll-to-space"
           v-on:click="scrollToTop"
           :class="{ 'navbar--hidden': !showNavbar }">Go to up</a>
      </div>
    </div>
    <Footer/>
  </div>
</template>

<script>
  import Footer from './components/common/Footer';
  import Header from './components/common/Header';
  import Categories from './components/common/Categories';
  import StickyBar from './components/common/StickyBar';
  import {mapGetters} from "vuex";

  export default {
    data() {
      return {
        showNavbar: false,
        lastScrollPosition: 0,

      }
    },
    components: {Header, Categories, StickyBar, Footer},
    mounted() {
      window.addEventListener('scroll', this.onScroll)
    },
    beforeDestroy() {
      window.removeEventListener('scroll', this.onScroll)
    },

    computed: {
      ...mapGetters(['getNightMode']),
    },
    methods: {
      notifications() {
        this.$notify({
          group: 'notifications', title: 'Important message', text: 'Hello user! This is a notification!',
          duration: 9999999
        });
        this.$notify({
          group: 'notifications', title: 'Important message', text: 'Hello user! This is a notification!',
          duration: 9999999
        });
      },
      scrollToTop() {

        window.scrollTo({
          top: 0, behavior: 'smooth',
        })
      },
      onScroll() {
        const currentScrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        if (currentScrollPosition < 0) {
          return
        }
        this.showNavbar = currentScrollPosition > 280;
      }

    }
  };
</script>

<style>
  @import "reset.css";
  @import "style.css";

  .layout {
    background: var(--btx-white);
    transition: all 100ms ease-in;

  }

  .scroll-to-space {
    position: fixed;
    bottom: 24px;
    padding: 8px;
    background: var(--btx-white);
    left: 0;
    right: 0;
    color: var(--btx-black);
    border-radius: 8px;
    margin: auto;
    width: max-content;
    box-shadow: 0 5px 10px 0 rgba(0, 0, 0, .15), 0 0 1px 0 rgba(0, 0, 0, .2);
    /*opacity: .6;*/
    /*transition: all 200ms ease-in;*/
    cursor: pointer;
    font-size: 12px;
    z-index: 99;
    transform: translate3d(0, 0, 0);
    transition: 0.1s all ease-out;
  }

  .n-m .scroll-to-space {
    background: #8BAC89;
  }

  .scroll-to-space:hover {
    /*opacity: 1;*/
  }

  .scroll-to-space.navbar--hidden {
    box-shadow: none;
    transform: translate3d(0, 220%, 0);
  }

  .content {
    width: 1024px;
    padding-left: 24px;
    /*padding-top: 24px;*/
    padding-right: 24px;
    box-sizing: content-box;
    /*padding-bottom: 48px;*/
    min-height: calc(100vh - 114px);

  }

  .c-green {
    color: #4b7f63;
  }

  .asset-name {
    font-size: 9px;
    padding: 2px 4px;
    line-height: inherit;
    color: #696974;
    font-weight: 700;
    position: relative;
    top: -1px;
    display: inline-block;
    border-radius: 4px;
    background: var(--btx-gray);
    border: 1px solid #dadde0;
  }

  .n-m .asset-name {
    color: var(--btx-black)
  }

  .bubble {

    /*font-size: 12px;*/
    padding: 2px 4px;
    line-height: inherit;
    color: var(--btx-black);
    font-weight: 700;
    display: inline-block;
    vertical-align: baseline;
    border-radius: 4px;
    background: var(--btx-gray);
  }

  .pulsar {
    width: 6px;
    border-radius: 50%;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    display: inline-block;
    vertical-align: middle;
    z-index: inherit;
    margin-right: 8px;
    /*margin-left: 8px;*/
  }

  .pulsar .point:before, .pulsar .point:after {
    content: "";
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    position: absolute;
    width: 50px;
    height: 50px;
    background: var(--btx-red);
    border-radius: 50%;
    border: 1px solid var(--btx-red);
    opacity: .2;
    z-index: -1
  }

  .pulsar .point:after, .pulsar .point:before {
    width: 50px;
    height: 50px;
    left: -22px;
    position: absolute;
    right: 0;
    top: 0;
    opacity: .7;
    bottom: 0;
    margin: auto;
    animation: preview-marker-pulsar-inner 1.3s ease-out forwards;
    animation-iteration-count: 5;

  }

  .pulsar .point:before {
    animation-delay: 200ms;
  }

  .pulsar .point {
    padding: 0;
    background: var(--btx-red);
    width: 6px;
    height: 6px;
    text-indent: -9999px;
    font-size: 0;
    line-height: 0;
    -webkit-transition: opacity .5s ease-out, -webkit-transform .25s;
    -o-transition: opacity .5s ease-out, transform .25s;
    transition: opacity .5s ease-out, transform .25s, -webkit-transform .25s;
    -webkit-transform: scale(1);
    -ms-transform: scale(1);
    transform: scale(1);
    backface-visibility: hidden;
    border-radius: 100%;
    pointer-events: none;
  }

  .pulsar.read .point {
    background: var(--btx-sweat);
  }

  .pulsar.read .point:before, .pulsar.read .point:after {
    display: none
  }

  @keyframes preview-marker-pulsar-inner {
    0% {
      opacity: 0;
      -webkit-transform: scale(.1);
      transform: scale(.1)
    }

    24%, 90% {
      opacity: 0
    }

    25% {
      opacity: .65;
      -webkit-transform: scale(.1);
      transform: scale(.1)
    }

    100% {
      opacity: 0;
      -webkit-transform: scale(1);
      transform: scale(1)
    }
  }

  .notice {

  }

  .warning {
    color: var(--btx-red);
  }

  .close-cross {
    background: var(--close-cross) no-repeat;
    background-size: contain;
  }

  .notifications {
    top: 30px;
    right: 20px;
    overflow: hidden;
    max-height: 100vh;

  }

  .notification-wrapper {

    overflow: visible;
    overflow-y:scroll;
    overflow-y: scroll;
    padding-right: 17px; /* Increase/decrease this value for cross-browser compatibility */
    box-sizing: content-box;
  &::-webkit-scrollbar {
     display: none;
   }
  }

  .notification-wrapper:first-child {
    margin-top: 50px;
  }

  .notification-wrapper + .notification-wrapper .notification {
    margin-top: 8px;
  }

  .notification.vue-notification-template {
    background: var(--btx-gray);
    margin: 24px 24px 8px 4px;
    cursor: pointer;
    padding: 8px 16px;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
    border-radius: 4px;

  }

  .n-m .notification.vue-notification-template {
    background: var(--btx-gray);
  }

  .notification-content {
    font-size: 14px;
  }

  .metamask-logo {
    width: 100px;
    margin-left: 4px;
    height: 30px;
    background-size: contain;
    display: inline-block;
    vertical-align: middle;
    background: var(--metamask-logo);
  }

  .localstorage-logo {
    vertical-align: sub;
    height: 18px;
    display: inline-block;
    width: 18px;
    background-size: contain;
    background-image: url("data:image/svg+xml,%0A%3C%3Fxml version='1.0' %3F%3E%3Csvg enable-background='new 0 0 32 32' height='32px' id='svg2' version='1.1' viewBox='0 0 32 32' width='32px' xml:space='preserve' xmlns='http://www.w3.org/2000/svg' xmlns:cc='http://creativecommons.org/ns%23' xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:inkscape='http://www.inkscape.org/namespaces/inkscape' xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns%23' xmlns:sodipodi='http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd' xmlns:svg='http://www.w3.org/2000/svg'%3E%3Cg id='background'%3E%3Crect fill='none' height='32' width='32'/%3E%3C/g%3E%3Cg id='phone_x5F_home'%3E%3Cg%3E%3Cpath d='M8,0v26h16V0H8z M13,22h-2v-2h2V22z M13,18h-2v-2h2V18z M13,14h-2v-2h2V14z M17,22h-2v-2h2V22z M14.999,18v-2h2v2H14.999z M17,14h-2v-2h2V14z M21,22h-2v-2h2V22z M21,18h-2v-2h2V18z M21,14h-2v-2h2V14z M21,10H11V3h10V10z'/%3E%3C/g%3E%3Cpolygon points='26,22 26,28 6,28 6,22 4,22 4,32 28,32 28,22 '/%3E%3C/g%3E%3C/svg%3E");
  }

</style>
