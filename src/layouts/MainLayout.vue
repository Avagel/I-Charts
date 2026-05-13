<script setup lang="ts">
import BottomNav from '@/components/BottomNav.vue'
</script>

<template>
  <div class="app-shell">
    <RouterView />
    <BottomNav />
  </div>
</template>

<style scoped>
.app-shell {
  max-width: 430px;
  margin: 0 auto;
  min-height: 100vh;
  background: var(--bg-primary);
  position: relative;
  overflow: hidden;
}
</style>
