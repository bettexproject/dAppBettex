<template>
  <div v-if="false" class="footer">
    <div class="footer-link-group">
      <div class="footer-link-title">
        DEX
      </div>
      <a class="footer-link" href="">
        About
      </a>
      <a class="footer-link" href="">
        DEX Explorer
      </a>
      <a class="footer-link" href="">
        WAVES Keeper
      </a>
    </div>
    <div class="footer-link-group">
      <div class="footer-link-title">
        Community
      </div>
      <a class="footer-link" href="">
        Discord
      </a>
      <a class="footer-link" href="">
        Bitcointalk
      </a><a class="footer-link" href="">
      Bitcointalk
    </a><a class="footer-link" href="">
      Bitcointalk
    </a><a class="footer-link" href="">
      Bitcointalk
    </a>
    </div>
  </div>
</template>

<script>

  export default {}
</script>

<style>

  .footer {
    background: var(--btx-gray);
    font-size: 14px;
    display: flex;
    padding: 8px 24px;
    align-items: center;
  }

  .footer-link-group {

    display: flex;
    margin-right: 24px;
  }

  .footer-link-title {
    font-weight: 700;
    margin-right: 16px;
    color: var(--btx-black);
    /*text-transform: uppercase;*/
  }

  .footer-link {
    margin-right: 16px;
    text-decoration: none;
    color: var(--btx-black);
  }
</style>
