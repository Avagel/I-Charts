<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import type { MarketTicker } from "@/types/market";
import LiveChart from "./LiveChart.vue";
import { createMarketSocket, type ManagedSocket } from "@/api/sockets";

const props = defineProps<{
  metric: MarketTicker;
}>();

const emit = defineEmits<{ (e: "open", symbol: string): void }>();

// Use ManagedSocket so cleanup is reliable and reconnect logic is centralised
let socket: ManagedSocket | null = null;

onMounted(() => {
  socket = createMarketSocket(props.metric.symbol);
});

onUnmounted(() => {
  socket?.close();
  socket = null;
});

// ── Derived display values ────────────────────────────────────────────────

const changePositive = computed(() => Number(props.metric.change) > 0);

const changeLabel = computed(() => {
  const sign = changePositive.value ? "+" : "";
  return `${sign}${props.metric.change}%`;
});

/**
 * Format price with appropriate decimal places.
 * Keeps the display stable — avoids long floating-point tails.
 */
const formattedPrice = computed(() => {
  const p = props.metric.price;
  if (p >= 1_000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
});
</script>

<template>
  <div
    class="bg-bg-elevated relative p-6 rounded-2xl w-full md:max-w-80 flex flex-col gap-4 cursor-pointer hover:bg-bg-card transition-colors"
    role="button"
    :aria-label="`Open ${metric.symbol} chart`"
    @click="emit('open', metric.symbol)"
  >
    <header class="flex justify-between items-start">
      <div>
        <p class="text-text-secondary text-xs font-bold mb-1 tracking-widest uppercase">
          {{ metric.symbol }}
        </p>
        <h2 class="text-lg md:text-xl font-medium font-mono">${{ formattedPrice }}</h2>
      </div>

      <span
        class="text-xs p-1 px-2 rounded-md font-bold"
        :class="changePositive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'"
      >
        {{ changeLabel }}
      </span>
    </header>

    <div class="h-40 w-full relative border-t border-zinc-800/50 pt-4">
      <!-- Pass "line" as default chart type; parent can override via prop -->
      <LiveChart :c-type="'line'" :symbol="metric.symbol" />
    </div>
  </div>
</template>
