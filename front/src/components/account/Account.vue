<template>
  <div>
    <div v-if="getAuthName === 'local'">
      <p><b>Before you deposit.</b> Bettex project never have access to your seed phrase nor make its backup.
      So, you are fully responsible for keep backup of your seed phrase by yourself.
      If you miss proper backup, you may permanently loss access to your bets and funds.
      </p>
      <br>
      <button v-if="!showAddress" @click="showAddress = true" class="button">I understand</button>
      <table v-if="showAddress" class="account-table">
        <tr>
          <td>Address</td>
          <td>{{ getAddress }}</td>
        </tr>
        <tr>
          <td>Seed</td>
          <td>
            <div v-if="showSeed">{{ getSeed }}</div>
            <div class="show-seed" v-else @click="showSeed = true">(show)</div>
          </td>
        </tr>
      </table>
    </div>
    <div v-else>This option is for local storage auth only</div>
  </div>
</template>

<script>
  import {mapGetters, mapMutations} from "vuex";

  export default {
    computed: {
      ...mapGetters(['getAuthName', 'getAddress', 'getSeed', 'getSeedResponsibilityAccepted']),
      showAddress: {
        get() {
          return this.getSeedResponsibilityAccepted;
        },
        set() {
          this.acceptSeedResponsibility();
        }
      }
    },
    methods: {
      ...mapMutations(['acceptSeedResponsibility']),
    },
    data() {
      return { showSeed: false };
    },
  };
</script>
<style>
  .account-table td {
    padding-right: 10px;
  }
  .show-seed {
    cursor: pointer;
  }
</style>