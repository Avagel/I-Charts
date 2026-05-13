<script setup>
defineProps({
  symbol: String,
  price: Number,
});
</script>

<template>
  <div class="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
    <h2 class="text-xl font-bold">
      {{ symbol }}
    </h2>

    <p class="text-green-400 text-2xl mt-2">${{ price }}</p>
  </div>
</template>
