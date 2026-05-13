<script setup lang="ts">
import { fetchTicker } from "@/api/binance";
import Header from "@/components/Header.vue";
import MetricList from "@/components/MetricList.vue";
import SearchBar from "@/components/SearchBar.vue";
import { SlidersHorizontal } from "lucide-vue-next";
import { onMounted } from "vue";


</script>

<template>
  <div>
    <Header />
    <SearchBar />
    <div class="bg-bg-secondary p-6 rounded-3xl">
      <header>
        <p class="text-lg text-text-secondary mb-3">Todays Metrics</p>
      </header>
      <MetricList />
    </div>

    <div class="bg-bg-elevated p-6 rounded-3xl">
      <header class="market-header">
        <p class="text-lg text-text-secondary mb-3">Market</p>
        <button>
          <SlidersHorizontal />
        </button>
      </header>
    </div>
  </div>
</template>
