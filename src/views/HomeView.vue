<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Bell } from "lucide-vue-next";
import { storeToRefs } from "pinia";
import { fetchCurrencies, fetchTicker } from "@/api/binance";
import { useMarketStore } from "@/stores/marketStore";
import CoinRow from "@/components/CoinRow.vue";
import MetricCard from "@/components/MetricCard.vue";
import ActivityFeed from "@/components/ActivityFeed.vue";
import Loader from "@/components/Loader.vue";
import Modal from "@/components/Modal.vue";

// ── Store ─────────────────────────────────────────────────────────────────────

const marketStore = useMarketStore();
const { markets } = storeToRefs(marketStore);

// ── State ─────────────────────────────────────────────────────────────────────

type TopFilter = "all" | "gain" | "lose";

const loading = ref(true);
const error = ref<string | null>(null);
const topFilter = ref<TopFilter>("all");

/** Symbol currently shown in the detail modal — null means closed */
const modalSymbol = ref<string | null>(null);

const openModal = (symbol: string) => {
  modalSymbol.value = symbol;
};
const closeModal = () => {
  modalSymbol.value = null;
};

// ── Derived lists ─────────────────────────────────────────────────────────────

const marketsList = computed(() => Object.values(markets.value));

/**
 * Filter applies ONLY to the CoinRow list (top section).
 * MetricCard section always shows the unfiltered tail of the list.
 */
const filteredTopMarkets = computed(() => {
  const list = marketsList.value.slice(0, 8);
  if (topFilter.value === "gain") return list.filter((m) => m.change > 0);
  if (topFilter.value === "lose") return list.filter((m) => m.change < 0);
  return list;
});

// Always the full unfiltered slice — filter tabs don't affect this
const otherMarkets = computed(() => marketsList.value.slice(8));

// ── Filter tabs config ────────────────────────────────────────────────────────

const FILTERS: { value: TopFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gain", label: "Gainers" },
  { value: "lose", label: "Losers" },
];

// ── Data loading ──────────────────────────────────────────────────────────────

const fetchTickers = async (symbols: string[]) => {
  // Fan out all ticker requests in parallel; skip any that fail individually
  const results = await Promise.allSettled(symbols.map((s) => fetchTicker(s)));

  results.forEach((result) => {
    if (result.status === "fulfilled") {
      marketStore.setInitialMarket(result.value);
    } else {
      console.warn("[HomeView] ticker fetch failed:", result.reason);
    }
  });
};

onMounted(async () => {
  try {
    loading.value = true;
    error.value = null;

    const currencies = await fetchCurrencies();
    const symbols = currencies.map((c) => c.symbol);

    if (!symbols.length) {
      throw new Error("No symbols returned from exchange.");
    }

    await fetchTickers(symbols);
  } catch (err) {
    console.error("[HomeView] init error:", err);
    error.value = "Failed to load market data. Please refresh and try again.";
  } finally {
    loading.value = false;
  }
});
const handleReload = () => {
  window.location.reload();
};
</script>

<template>
  <!-- Loading -->
  <div v-if="loading" class="h-screen flex flex-col items-center justify-center">
    <Loader />
  </div>

  <!-- Error -->
  <div
    v-else-if="error"
    class="h-screen flex flex-col items-center justify-center gap-3 px-6 text-center"
  >
    <p class="text-red-400 text-sm">{{ error }}</p>
    <button class="text-xs bg-accent text-bg-primary px-4 py-2 rounded-full" @click="handleReload">
      Retry
    </button>
  </div>

  <!-- Content -->
  <div v-else class="min-h-screen bg-bg-primary">
    <!-- Detail modal — rendered via Teleport to body -->
    <Modal v-if="modalSymbol" :symbol="modalSymbol" @close="closeModal" />

    <!-- ── Top navigation bar ──────────────────────────────────────────── -->
    <header class="sticky top-0 z-30 bg-bg-primary/80 backdrop-blur-md border-b border-zinc-800/60">
      <div
        class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between"
      >
        <!-- Logo / brand -->
        <div class="flex items-center gap-2">
          <span class="text-accent font-bold text-lg tracking-tight">Iruo Charts</span>
        </div>

        <!-- User + bell -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex flex-col items-end">
            <p class="text-xs text-text-secondary leading-tight">Good Morning 👋</p>
            <p class="text-sm font-medium leading-tight">Akanume Iruoghene</p>
          </div>
          <img
            class="w-8 h-8 sm:w-9 sm:h-9 object-cover rounded-full ring-2 ring-accent/30"
            src="https://i.pinimg.com/236x/c8/25/6f/c8256f0770aa358da9a6579dba65dee2.jpg"
            alt="User avatar"
          />
          <button
            class="bg-bg-secondary w-9 h-9 rounded-full flex items-center justify-center hover:bg-bg-elevated transition-colors relative"
            aria-label="Notifications"
          >
            <Bell :size="15" />
            <!-- notification dot -->
            <span
              class="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full ring-2 ring-bg-primary"
            />
          </button>
        </div>
      </div>
    </header>

    <!-- ── Page body ───────────────────────────────────────────────────── -->
    <main class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!--
        Layout grid:
        • Mobile (< md):  single column stack
        • Tablet (md):    2 cols — [coin list + metrics] | [activity feed]
        • Desktop (lg+):  3 cols — [coin list] | [metrics] | [activity feed]
      -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        <!-- ── Column 1: Market Today (Coin rows) ────────────────────── -->
        <section class="bg-bg-elevated/30 rounded-2xl border border-zinc-800/50 p-4 lg:p-5">
          <!-- Section header -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h2 class="text-base font-semibold text-white">
                Market <span class="text-accent">Today</span>
              </h2>
              <p class="text-xs text-zinc-500 mt-0.5">Top currencies</p>
            </div>
            <!-- Live pulse indicator -->
            <span class="flex items-center gap-1.5 text-xs text-green-500">
              <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              Live
            </span>
          </div>

          <!-- Filter tabs -->
          <div class="flex gap-2 mb-4">
            <button
              v-for="f in FILTERS"
              :key="f.value"
              class="flex-1 text-xs rounded-lg py-1.5 px-2 transition-all font-medium"
              :class="
                topFilter === f.value
                  ? 'bg-accent text-bg-primary shadow-sm shadow-accent/40'
                  : 'bg-zinc-800/60 text-text-secondary hover:bg-zinc-700/60'
              "
              @click="topFilter = f.value"
            >
              {{ f.label }}
            </button>
          </div>

          <!-- Coin rows -->
          <div class="divide-y divide-zinc-800/50">
            <CoinRow
              v-for="market in filteredTopMarkets"
              :key="market.symbol"
              :coin="market"
              @open="openModal"
            />
          </div>
          <p v-if="!filteredTopMarkets.length" class="text-xs text-zinc-500 py-6 text-center">
            No markets match this filter.
          </p>
        </section>

        <!-- ── Column 2: Market Metrics ──────────────────────────────── -->
        <section class="bg-bg-elevated/30 rounded-2xl border border-zinc-800/50 p-4 lg:p-5">
          <div class="mb-4">
            <h2 class="text-base font-semibold text-white">
              Market <span class="text-accent">Metrics</span>
            </h2>
            <p class="text-xs text-zinc-500 mt-0.5">Real-time cryptocurrency data</p>
          </div>

          <!--
            On mobile: horizontal scroll carousel so cards don't get tiny.
            On md+: 2-column grid inside the panel.
            On lg+: single column (the outer grid already gives enough width).
          -->
          <div
            class="flex md:grid md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 overflow-x-auto pb-1 md:overflow-visible md:pb-0"
          >
            <div
              v-for="market in otherMarkets"
              :key="market.symbol"
              class="flex-shrink-0 w-60 md:w-auto"
            >
              <MetricCard :metric="market" @open="openModal" />
            </div>
          </div>

          <p v-if="!otherMarkets.length" class="text-xs text-zinc-500 py-6 text-center">
            No metrics available yet.
          </p>
        </section>

        <!-- ── Column 3: Activity Feed (full width on mobile/tablet) ─── -->
        <section
          class="md:col-span-2 lg:col-span-1 bg-bg-elevated/30 rounded-2xl border border-zinc-800/50 p-4 lg:p-5"
        >
          <ActivityFeed />
        </section>
      </div>
    </main>
  </div>
</template>
