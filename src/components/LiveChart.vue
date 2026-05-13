<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import * as echarts from "echarts";
import VChart from "vue-echarts";
import { useChartStore, type Candle } from "@/stores/chartStore";
import { storeToRefs } from "pinia";
import { fetchKlines } from "@/api/charts";

const props = defineProps<{ symbol: string; cType: string }>();

const chartStore = useChartStore();
const { timeframe, chartType, chartData } = storeToRefs(chartStore);

const loading = ref(false);
const error = ref<string | null>(null);

// ── Data ────────────────────────────────────────────────────────────────────

const currentChartData = computed(() => chartData.value[props.symbol] ?? []);

const loadHistoricalData = async (symbol: string) => {
  loading.value = true;
  error.value = null;
  try {
    const interval = timeframe.value[symbol] ?? "1m";
    const raw = await fetchKlines(symbol, interval);

    const candles: Candle[] = raw.map((item) => ({
      time: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5]),
      isFinal: true,
    }));

    // Write through the store action — this goes through the shallowRef setter
    // properly so Vue's reactivity fires and the chart repaints immediately.
    chartStore.setChartData(symbol, candles);
  } catch (err) {
    error.value = "Failed to load chart data.";
    console.error("[LiveChart] loadHistoricalData:", err);
  } finally {
    loading.value = false;
  }
};

// ── Watchers ────────────────────────────────────────────────────────────────

// Symbol change — reload data and subscribe new stream
watch(
  () => props.symbol,
  async (newSymbol, oldSymbol) => {
    if (oldSymbol && oldSymbol !== newSymbol) {
      chartStore.unsubscribeKlines(oldSymbol);
    }
    await loadHistoricalData(newSymbol);
    chartStore.initializeSymbol(newSymbol);
  },
  { immediate: true },
);

// Timeframe change — reload data (store re-creates WS inside setTimeframe)
watch(
  () => timeframe.value[props.symbol],
  async (newTf, oldTf) => {
    if (newTf && newTf !== oldTf) {
      await loadHistoricalData(props.symbol);
      chartStore.setupWebSocketSubscription(props.symbol);
    }
  },
);

// Cleanup on unmount — prevents socket / memory leaks
onUnmounted(() => {
  chartStore.unsubscribeKlines(props.symbol);
});

// ── Chart option ────────────────────────────────────────────────────────────

/**
 * Recomputed only when chartType or chartData for this symbol change.
 * The data arrays are references from shallowRef, so this triggers on each
 * candle update but avoids deep diffing the entire dataset.
 */
const chartOption = computed(() => {
  const type = chartType.value[props.symbol] || props.cType || "line";
  const data = currentChartData.value;

  if (!data.length) return {};

  const baseOption: echarts.EChartsOption = {
    animation: false, // disable entry animation for streaming data
    tooltip: {
      trigger: "axis",
      backgroundColor: "#18181B",
      borderColor: "#27272A",
      textStyle: { color: "#FAFAFA" },
      formatter: (params: any) => {
        if (type === "candlestick" && params[0]) {
          const d = params[0].data as number[];
          return (
            `<b>${params[0].name}</b><br/>` +
            `Open: $${d[1]?.toLocaleString()}<br/>` +
            `Close: $${d[2]?.toLocaleString()}<br/>` +
            `Low: $${d[3]?.toLocaleString()}<br/>` +
            `High: $${d[0]?.toLocaleString()}`
          );
        }
        return params[0] ? `Price: $${params[0].value?.toLocaleString()}` : "";
      },
    },
    grid: {
      top: 8,
      right: 8,
      bottom: type === "candlestick" ? 36 : 8,
      left: 8,
      containLabel: true,
    },
    // dataZoom keeps the view window pinned to the last 60 candles.
    // As new candles arrive the window slides right automatically,
    // keeping the forming candle fully visible at the right edge.
    dataZoom: [
      {
        type: "inside", // mouse-wheel / pinch zoom
        start: Math.max(0, ((data.length - 60) / data.length) * 100),
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: true,
        preventDefaultMouseMove: false,
      },
      // Visible scrub bar — only shown for candlestick where detail matters
      ...(type === "candlestick"
        ? [
            {
              type: "slider" as const,
              start: Math.max(0, ((data.length - 60) / data.length) * 100),
              end: 100,
              height: 20,
              bottom: 4,
              borderColor: "#27272A",
              backgroundColor: "#18181B",
              fillerColor: "rgba(235,202,43,0.1)",
              handleStyle: { color: "#EBCA2B" },
              textStyle: { color: "#71717a", fontSize: 9 },
            },
          ]
        : []),
    ],
    xAxis: {
      type: "category",
      data: data.map((c) => new Date(c.time).toLocaleTimeString()),
      // Show axis labels only for candlestick — helps read the forming candle's time
      show: type === "candlestick",
      axisLabel: { color: "#71717a", fontSize: 9 },
      axisLine: { lineStyle: { color: "#27272A" } },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      scale: true,
      splitNumber: 3,
      axisLabel: {
        color: "#71717a",
        fontSize: 10,
        formatter: (val: number) => "$" + val.toLocaleString(),
      },
      splitLine: { lineStyle: { color: "#232326" } },
    },
    series: [],
  };

  if (type === "candlestick") {
    (baseOption.series as any[]).push({
      type: "candlestick",
      name: props.symbol,
      // ECharts candlestick format: [open, close, low, high]
      data: data.map((c) => [c.open, c.close, c.low, c.high]),
      itemStyle: {
        color: "#10b981",
        color0: "#ef4444",
        borderColor: "#10b981",
        borderColor0: "#ef4444",
      },
    });
  } else if (type === "bar") {
    // True bar chart — ECharts requires series type:"bar"
    (baseOption.series as any[]).push({
      type: "bar",
      name: props.symbol,
      data: data.map((c) => c.close),
      itemStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(235,202,43,0.9)" },
          { offset: 1, color: "rgba(235,202,43,0.2)" },
        ]),
        borderRadius: [3, 3, 0, 0],
      },
      emphasis: {
        itemStyle: { color: "#EBCA2B" },
      },
      barMaxWidth: 12,
    });
  } else if (type === "area") {
    // Area chart — line with gradient fill
    (baseOption.series as any[]).push({
      type: "line",
      name: props.symbol,
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2, color: "#EBCA2B" },
      itemStyle: { color: "#EBCA2B" },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: "rgba(235,202,43,0.35)" },
          { offset: 1, color: "rgba(235,202,43,0)" },
        ]),
      },
      data: data.map((c) => c.close),
    });
  } else {
    // Default: clean line chart (no area fill)
    (baseOption.series as any[]).push({
      type: "line",
      name: props.symbol,
      smooth: true,
      symbol: "none",
      lineStyle: { width: 2, color: "#EBCA2B" },
      itemStyle: { color: "#EBCA2B" },
      data: data.map((c) => c.close),
    });
  }

  return baseOption;
});
</script>

<template>
  <div class="w-full h-full relative">
    <!-- Loading skeleton -->
    <div v-if="loading" class="flex items-center justify-center h-full">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-[#EBCA2B]" />
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex items-center justify-center h-full text-red-400 text-xs">
      {{ error }}
    </div>

    <!-- Chart -->
    <VChart
      v-else
      :option="chartOption"
      :update-options="{ notMerge: true, lazyUpdate: true }"
      autoresize
    />
  </div>
</template>
