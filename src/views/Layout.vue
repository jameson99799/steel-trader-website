<template>
  <div class="site-layout">
    <SiteHeader />
    <main class="site-main">
      <router-view />
    </main>
    <SiteFooter />
    <FloatingContact />
  </div>
</template>

<script setup>
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'
import FloatingContact from '../components/FloatingContact.vue'
</script>

<style scoped>
.site-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.site-main {
  flex: 1;
}
</style>
