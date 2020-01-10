<template>
    <div>
        <table>
            <tr v-for="p in firstPayouts" :key="p.txid">
                <td>{{ p.amount }}</td>
                <td>{{ p.event.ts | moment('DD-MMM YYYY HH:mm') }}</td>
                <td>{{ p.event.rate }} {{ p.event.pair }}</td>
                <td><div :inner-html.prop="p.paid | wavesExporer('tx')"></div></td>
            </tr>
        </table>
    </div>
</template>

<script>
    import {mapGetters} from "vuex";

    export default {
      computed: {
        ...mapGetters(['getPayouts']),
        firstPayouts() {
          return this.getPayouts.slice(0, 20);
        }
      },
    }
</script>