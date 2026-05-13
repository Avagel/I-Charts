<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

router.push("/dashboard");
</script>

<template>
  <div class="bg-bg-primary gradient-background h-screen w-full overflow-auto">
    <RouterView />
  </div>
</template>

<style scoped></style>
