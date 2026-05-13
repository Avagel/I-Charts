<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import { createMarketSocket, type ManagedSocket } from "@/api/sockets";
import type { MarketTicker } from "@/types/market";

const props = defineProps<{ coin: MarketTicker }>();
const emit = defineEmits<{ (e: "open", symbol: string): void }>();

let socket: ManagedSocket | null = null;

onMounted(() => {
  socket = createMarketSocket(props.coin.symbol);
});

onUnmounted(() => {
  socket?.close();
  socket = null;
});

// ── Derived display values ────────────────────────────────────────────────

const changePositive = computed(() => Number(props.coin.change) >= 0);

const changeLabel = computed(() => {
  const sign = changePositive.value ? "+" : "";
  return `${sign}${props.coin.change}%`;
});

const formattedPrice = computed(() => {
  const p = props.coin.price;
  if (p >= 1_000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
});

const formattedVolume = computed(() => {
  const v = props.coin.volume;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(2);
});

/** First letter of the base asset (strip USDT suffix for display) */
const avatarChar = computed(() =>
  props.coin.symbol.replace(/USDT$|BTC$|ETH$|BNB$/, "").charAt(0),
);

const handleClick = () => emit("open", props.coin.symbol);
</script>

<template>
  <div
    class="flex py-3 gap-2 items-center hover:bg-bg-elevated cursor-pointer transition-colors"
    role="button"
    :aria-label="`View ${coin.symbol} details`"
    @click="handleClick"
  >
    <!-- Avatar -->
    <div
      class="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0 select-none"
    >
      {{ avatarChar }}
    </div>

    <!-- Symbol + volume -->
    <div class="min-w-0">
      <p class="text-sm font-medium truncate">{{ coin.symbol }}</p>
      <p class="text-xs text-text-secondary mt-0.5">Vol {{ formattedVolume }}</p>
    </div>

    <!-- Price + change -->
    <div class="ml-auto text-right flex-shrink-0">
      <p class="text-sm font-mono">${{ formattedPrice }}</p>
      <p
        class="text-xs mt-0.5 font-medium"
        :class="changePositive ? 'text-success' : 'text-danger'"
      >
        {{ changeLabel }}
      </p>
    </div>
  </div>

  <div class="w-full border-t border-zinc-800/50" />
</template>