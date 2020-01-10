<template>
  <div class="switch-button-control">
    <div class="switch-text" :class="{ enabled: isEnabled}">
      <slot></slot>
    </div>
    <div class="switch" :class="{ enabled: isEnabled }" @click="toggle" :style="{'--color': color}">
      <div class="slider round"></div>
    </div>
  </div>
</template>
<script>
  export default {
    model: {
      prop: "isEnabled", event: "toggle"
    }, props: {
      isEnabled: Boolean, color: {
        type: String, required: false, default: "#4D4D4D"
      }, size: {
        type: String, required: false
      }
    }, methods: {
      toggle: function () {
        this.$emit("toggle", !this.isEnabled);
      }
    }
  }
</script>
<style>
  .switch-box {
    display: inline-block;
  }

  .switch-inline {
    display: flex;
  }

  .switch-inline .switch-button-control:not(:last-child) {
    margin-right: 16px;
  }

  .switch-list {
    display: inline-block;
    margin-right: 24px;
    vertical-align: middle;
    border-left: 1px solid var(--btx-darkgrey);
    padding-left: 8px;
  }

  .switch-box--disabled {
    opacity: .3;
  }

  .switch {
    display: inline-block;
    height: 17px;
    position: relative;
    width: 34px;
    vertical-align: top;
  }

  .switch-wrap {
    display: flex;
    justify-content: flex-start;
  }

  .switch-text {
    display: inline-block;
    vertical-align: top;
    line-height: 17px;
    font-size: 12px;
    letter-spacing: 0;
    min-width: 69px;
    font-weight: 500;
    margin-right: 8px;
    font-size: 12px;
    letter-spacing: 0;
    color: #949699;

  }

  .switch-button-control:hover .switch-text {
    color: var(--btx-black);
    cursor: pointer;
  }

  .switch-text.enabled {

    color: var(--btx-green);
  }

  .switch input {
    display: none;
  }

  .slider {
    background-color: #DADDE0;
    bottom: 0;
    cursor: pointer;
    left: 0;
    position: absolute;
    right: 0;
    top: 0;
    transition: .4s;
    display: inline-block;
    white-space: nowrap;
  }

  label {
    margin-bottom: 0;
  }

  .slider:before {
    background-color: #90A3AE;
    bottom: 1px;
    content: "O";
    text-align: center;
    font-size: 10px;
    height: 15px;
    right: 1px;
    color: white;
    position: absolute;
    transition: .4s;
    width: 15px;

  }

  .switch.enabled .slider:before {
    background-color: var(--btx-green);
    content: 'I';
  }

  .switch.enabled .slider:before {
    transform: translateX(-17px);
  }

  .slider.round {
    border-radius: 8px;
  }

  .slider.round:before {
    border-radius: 50%;
  }
</style>