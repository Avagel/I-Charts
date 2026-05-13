<script setup lang="ts">
import { useChartStore } from "@/stores/chartStore";
import { storeToRefs } from "pinia";

const props = defineProps<{ symbol: string; type?: boolean }>();
const chartStore = useChartStore();
const { chartType, timeframe } = storeToRefs(chartStore);

const chartTypes = ["line", "area", "bar", "candlestick"];
const timeframes = ["1m", "5m", "15m", "1h", "4h", "1d"];

// Helper to get symbol-specific value from store objects
const getActiveType = () => chartType.value[props.symbol] || "line";
const getActiveFrame = () => timeframe.value[props.symbol] || "1m";
</script>

<template>
  <div class="flex flex-col gap-3 mb-4">
    <div class="flex flex-wrap gap-1">
      <button
        v-for="frame in timeframes"
        :key="frame"
        @click="chartStore.setTimeframe(symbol, frame)"
        class="px-2 py-1 rounded-md text-[10px] font-medium transition-all uppercase"
        :class="
          getActiveFrame() === frame
            ? 'bg-[#EBCA2B] text-black'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        "
      >
        {{ frame }}
      </button>
    </div>

    <div v-if="type" class="flex flex-wrap gap-1">
      <button
        v-for="type in chartTypes"
        :key="type"
        @click="chartStore.setChartType(symbol, type)"
        class="px-2 py-1 rounded-md text-[10px] font-medium transition-all capitalize"
        :class="
          getActiveType() === type
            ? 'bg-[#EBCA2B] text-black'
            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
        "
      >
        {{ type }}
      </button>
    </div>
  </div>
</template>
