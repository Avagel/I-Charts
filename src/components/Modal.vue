<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { X, TrendingUp, BarChart2, Activity, CandlestickChart } from "lucide-vue-next";
import { useChartStore } from "@/stores/chartStore";
import { useMarketStore } from "@/stores/marketStore";
import { storeToRefs } from "pinia";
import LiveChart from "./LiveChart.vue";

const props = defineProps<{ symbol: string }>();
const emit = defineEmits<{ (e: "close"): void }>();

// ── Stores ────────────────────────────────────────────────────────────────────

const chartStore = useChartStore();
const marketStore = useMarketStore();
const { markets } = storeToRefs(marketStore);

const ticker = computed(() => markets.value[props.symbol]);

const formattedPrice = computed(() => {
  const p = ticker.value?.price ?? 0;
  if (p >= 1_000) return p.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
});

const changePositive = computed(() => (ticker.value?.change ?? 0) >= 0);
const changeLabel = computed(() => {
  const c = ticker.value?.change ?? 0;
  return `${c >= 0 ? "+" : ""}${c}%`;
});

// ── Chart controls ────────────────────────────────────────────────────────────

const CHART_TYPES = [
  { value: "line", label: "Line", icon: TrendingUp },
  { value: "area", label: "Area", icon: Activity },
  { value: "bar", label: "Bar", icon: BarChart2 },
  { value: "candlestick", label: "Candle", icon: CandlestickChart },
] as const;

const TIMEFRAMES = [
  { value: "1m", label: "1m" },
  { value: "5m", label: "5m" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
  { value: "4h", label: "4h" },
  { value: "1d", label: "1D" },
  { value: "1w", label: "1W" },
] as const;

// Local reactive copies — initialise from store, write back on change
const activeChartType = ref<string>(chartStore.chartType[props.symbol] ?? "line");
const activeTimeframe = ref<string>(chartStore.timeframe[props.symbol] ?? "1m");

const setChartType = (type: string) => {
  activeChartType.value = type;
  chartStore.setChartType(props.symbol, type);
};

const setTimeframe = (tf: string) => {
  activeTimeframe.value = tf;
  chartStore.setTimeframe(props.symbol, tf);
};

// ── Keyboard & scroll lock ────────────────────────────────────────────────────

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") emit("close");
};

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  document.body.style.overflow = "hidden";
});

onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  document.body.style.overflow = "";
});

// Re-sync local state if the symbol prop changes (e.g. user opens a different coin)
watch(
  () => props.symbol,
  (sym) => {
    activeChartType.value = chartStore.chartType[sym] ?? "line";
    activeTimeframe.value = chartStore.timeframe[sym] ?? "1m";
  },
);
</script>

<template>
  <!-- Backdrop -->
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="`${symbol} chart detail`"
    >
      <!-- Dimmed overlay — click to close -->
      <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" @click="emit('close')" />

      <!-- Panel -->
      <div
        class="relative z-10 w-full sm:max-w-3xl lg:max-w-5xl bg-bg-elevated border border-zinc-800/70 rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden"
        style="max-height: 92dvh"
      >
        <!-- ── Header ─────────────────────────────────────────────────── -->
        <div class="flex items-start justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div class="flex items-center gap-3">
            <!-- Symbol avatar -->
            <div
              class="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-accent select-none"
            >
              {{ symbol.replace(/USDT$|BTC$|ETH$|BNB$/, "").charAt(0) }}
            </div>
            <div>
              <h2 class="text-base font-semibold text-white leading-tight">{{ symbol }}</h2>
              <p class="text-xs text-zinc-500 leading-tight">Binance · Spot</p>
            </div>
          </div>

          <!-- Live price + change -->
          <div class="flex items-center gap-3 mr-2">
            <div class="text-right">
              <p class="text-lg font-mono font-semibold text-white leading-tight">
                ${{ formattedPrice }}
              </p>
              <p
                class="text-xs font-medium leading-tight"
                :class="changePositive ? 'text-green-400' : 'text-red-400'"
              >
                {{ changeLabel }} (24h)
              </p>
            </div>
            <span class="flex items-center gap-1 text-xs text-green-500">
              <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
          </div>

          <!-- Close button -->
          <button
            class="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Close"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </div>

        <!-- ── Controls row ──────────────────────────────────────────── -->
        <div
          class="flex items-center justify-between gap-3 px-5 pb-3 flex-shrink-0 border-b border-zinc-800/60 flex-wrap"
        >
          <!-- Chart type tabs -->
          <div class="flex gap-1 bg-zinc-900/60 rounded-lg p-1">
            <button
              v-for="ct in CHART_TYPES"
              :key="ct.value"
              class="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md transition-all font-medium"
              :class="
                activeChartType === ct.value
                  ? 'bg-accent text-bg-primary'
                  : 'text-zinc-400 hover:text-white'
              "
              @click="setChartType(ct.value)"
            >
              <component :is="ct.icon" :size="12" />
              <span class="hidden xs:inline">{{ ct.label }}</span>
            </button>
          </div>

          <!-- Timeframe tabs -->
          <div class="flex gap-1 bg-zinc-900/60 rounded-lg p-1">
            <button
              v-for="tf in TIMEFRAMES"
              :key="tf.value"
              class="text-xs px-2.5 py-1.5 rounded-md transition-all font-mono font-medium"
              :class="
                activeTimeframe === tf.value
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-500 hover:text-white'
              "
              @click="setTimeframe(tf.value)"
            >
              {{ tf.label }}
            </button>
          </div>
        </div>

        <!-- ── Chart ─────────────────────────────────────────────────── -->
        <div class="h-50 shrink-0 p-4" style="height: clamp(280px, 50dvh, 520px)">
          <LiveChart :symbol="symbol" :c-type="activeChartType" />
        </div>

        <!-- ── Stats footer ──────────────────────────────────────────── -->
        <div
          v-if="ticker"
          class="flex items-center justify-around px-5 py-3 border-t border-zinc-800/60 flex-shrink-0 flex-wrap gap-3"
        >
          <div class="text-center">
            <p class="text-xs text-zinc-500">Volume</p>
            <p class="text-sm font-mono font-medium text-white">
              {{
                ticker.volume >= 1_000_000
                  ? `${(ticker.volume / 1_000_000).toFixed(2)}M`
                  : ticker.volume >= 1_000
                    ? `${(ticker.volume / 1_000).toFixed(2)}K`
                    : ticker.volume.toFixed(2)
              }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-xs text-zinc-500">24h Change</p>
            <p
              class="text-sm font-mono font-medium"
              :class="changePositive ? 'text-green-400' : 'text-red-400'"
            >
              {{ changeLabel }}
            </p>
          </div>
          <div class="text-center">
            <p class="text-xs text-zinc-500">Symbol</p>
            <p class="text-sm font-mono font-medium text-white">{{ symbol }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
