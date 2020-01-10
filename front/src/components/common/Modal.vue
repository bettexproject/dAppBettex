<template>
  <transition name="modal" v-if="value">
    <div class="modal-mask">
      <div class="modal-wrapper" @click.prevent="close">
        <div class="modal-descr">Click anywhere to close the window</div>
        <div class="modal-container" @click.stop>
          <slot>
          </slot>
          <!--<button class="modal-default-button" @click.prevent="close">-->
          <!--OK-->
          <!--</button>-->
        </div>
      </div>
    </div>
  </transition>
</template>
<style>
  /*//////*/
  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(44, 94, 114, .8);
    display: table;
    transition: opacity .3s ease;
  }

  .modal-wrapper {
    display: table-cell;
    vertical-align: middle;
  }
  .modal-descr {
    text-align: center;
    font-size: 14px;
    margin-bottom: 16px;
    color: var(--btx-white);
    letter-spacing: 0;
  }

  .modal-container {
    /*width: 300px;*/
    min-width: 768px;
    width: max-content;
    max-width: 1024px;
    margin: 0 auto;
    padding: 20px 30px;
    background-color: var(--btx-white);
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
    transition: all .3s ease;
  }

  .modal-header h3 {
    margin-top: 0;
    color: #42b983;
  }

  .modal-body {
    margin: 20px 0;
  }

  .modal-default-button {
    float: right;
  }

  .modal-enter {
    opacity: 0;
  }

  .modal-leave-active {
    opacity: 0;
  }

  .modal-enter .modal-container,
  .modal-leave-active .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
  }

  /* */
</style>
<script>
  export default {
    props: {
      value: {
        type: Boolean,
        default: () => false,
      },
    },
    methods: {
      close() {
        this.$emit('input', false);
      }
    }
  }
</script>