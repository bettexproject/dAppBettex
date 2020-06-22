<template>
    <div v-if="!isLoggedIn">Login with
        <!-- <span class="keeper-install" @click="loginLS">
        <div class="localstorage-logo"></div>
        local storage
      </span> -->
        <!-- <span>or</span> -->
        <span v-if="!getNoMetamask" class="keeper-install" @click="loginMetamask">
            <div class="metamask-logo"></div>
        </span>
        <span v-if="getNoMetamask" class="keeper-install">
            <div class="metamask-logo"></div> is not installed
        </span>
    </div>
</template>

<script>
  import {mapActions, mapGetters} from "vuex";

    export default {
      computed: {
        ...mapGetters(['getNoMetamask', 'isLoggedIn', 'getAuthName']),
      },
      methods: {
        ...mapActions(['loginLS', 'loginMetamask']),
      },
    }
</script>