<template>
  <div class="event-item-matched-balls">
    <div class="event-item-matched-balls-row" v-for="(row, idx) in rows"
         :key="idx" v-if="rows[0].summary <= 15" :title="rows[0].title">
      <div class="event-item-matched-balls-matched" v-for="idx in row.matched" :key="`m-${idx}`"></div>
      <div class="event-item-matched-balls-unmatched" v-for="idx in row.unmatched" :key="`u-${idx}`"></div>
    </div>
    <div class="event-item-matched-balls-text" v-else :title="rows[0].title">
      {{rows[0].summary}}+
      <div class="event-item-matched-balls-row">

        <div class="event-item-matched-balls-matched"></div>
        <div class="event-item-matched-balls-unmatched"></div>
        <div class="event-item-matched-balls-matched"></div>
      </div>
    </div>
  </div>
  <!--</div>-->
</template>

<script>
  import _ from 'lodash';

  export default {
    props: {
      matched: {
        type: Number,
        default: () => 0,
      },
      unmatched: {
        type: Number,
        default: () => 0,
      },
      inRow: {
        type: Number,
        default: () => 5,
      },
      maxRows: {
        type: Number,
        default: () => 3,
      },
    },
    computed: {
      rows() {
        const rows = [];
        let totalR = this.matched + this.unmatched;
        let matchedR = this.matched;
        const balls = [];
        const inRow = Math.min(this.inRow, Math.ceil(Math.sqrt(totalR)));
        for (let i = 0; (totalR > 0) && (i < this.maxRows); i++) {
          const total = Math.min(inRow, totalR);
          const matchedToTotal = (total > 0) ? matchedR / totalR : 0;
          const matched = Math.ceil(total * matchedToTotal);
          rows.push({
            matched: _.range(matched),
            unmatched: _.range(total - matched),
          });
          totalR -= total;
          matchedR -= matched;
        }

        balls.push({
          matched: this.matched,
          unmatched: this.unmatched,
          summary: this.matched + this.unmatched,
          title: this.matched + ' matched / ' + this.unmatched + ' unmatched'
        });

        return balls;
      },


    }
  }
</script>

<style>
  .event-item-matched-balls {
    margin: 0 8px;
    text-align: center;
    align-items: center;
    display: flex;
    align-content: center;
    max-height: 44px;
  }

  .event-item-matched-balls-text {
    text-align: center;
    font-size: 12px;
  }

  .event-item-matched-balls-row {
    display: flex;
    flex-wrap: wrap;
    /*max-width: 23px;*/
    justify-content: flex-start;
    width: 27px;
  }

  .event-item-matched-balls-rows {
    /*display: flex;*/
    /*flex-direction: column;*/
  }

  .event-item-matched-balls-matched {
    background: #080;
    height: 5px;
    width: 5px;
    /*margin-right: 4px;*/
    /*margin-bottom: 4px;*/
    border-radius: 50%;
    margin: 2px;
  }

  .event-item-matched-balls-unmatched {
    background: #A5A7AC;
    height: 5px;
    width: 5px;
    /*margin-right: 4px;*/
    /*margin-bottom: 4px;*/
    border-radius: 50%;
    margin: 2px;
  }
</style>
