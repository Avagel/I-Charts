<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { coins, orderBook } from "@/data/market";
import Modal from "@/components/Modal.vue";

const route = useRoute();
const router = useRouter();

const coin = computed(() => coins.find((c) => c.ticker === route.params.ticker) ?? coins[1]);
const color = computed(() => (coin.value.dir === "pos" ? "#22c55e" : "#ef4444"));
const gradColor = computed(() =>
  coin.value.dir === "pos" ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
);

const activeRange = ref("M");
const activeTab = ref("orderbook");
const ranges = ["D", "W", "M", "6M", "Y", "All"];
const tabs = ["orderbook", "history", "notes", "info"];

// Dummy chart path — swap with real data later
const chartLine = "M0,120 L40,110 L80,115 L120,95 L160,100 L200,80 L240,85 L280,55 L320,45 L360,30";
const chartArea = computed(() => chartLine + " L360,160 L0,160Z");
</script>

<template>
  <div class="screen">

    <!-- Status bar -->
    <div class="status-bar">
      <span>9:41</span>
      <div class="status-icons">▲▲▲ 📶 🔋</div>
    </div>

    <div class="scroll-content">
      <!-- Header -->
      <div class="detail-header">
        <button class="back-btn" @click="router.back()">←</button>
        <div class="pair-selector">
          <span>{{ coin.ticker }} / USDT</span>
          <span class="pair-arrow">▾</span>
        </div>
        <button class="star-btn">★</button>
      </div>

      <!-- Price section -->
      <div class="price-section">
        <h1 class="detail-price">{{ coin.price }}</h1>
        <div class="price-meta">
          <span class="badge" :class="coin.dir === 'pos' ? 'badge-pos' : 'badge-neg'">
            {{ coin.abs }}
          </span>
          <span class="badge" :class="coin.dir === 'pos' ? 'badge-pos' : 'badge-neg'">
            {{ coin.pct }}
          </span>
        </div>
        <div class="hl-row">
          <div class="hl-item">
            <p class="hl-label">High</p>
            <p class="hl-value">{{ coin.high }}</p>
          </div>
          <div class="hl-item">
            <p class="hl-label">Low</p>
            <p class="hl-value">{{ coin.low }}</p>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div class="chart-card">
        <p class="chart-type-label">↗ Line</p>
        <div class="chart-wrap">
          <svg viewBox="0 0 360 160" preserveAspectRatio="none" fill="none" class="chart-svg">
            <defs>
              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
                <stop offset="100%" :stop-color="color" stop-opacity="0" />
              </linearGradient>
            </defs>
            <line x1="0" y1="30" x2="360" y2="30" stroke="#232326" stroke-width="0.5" />
            <line x1="0" y1="80" x2="360" y2="80" stroke="#232326" stroke-width="0.5" />
            <line x1="0" y1="130" x2="360" y2="130" stroke="#232326" stroke-width="0.5" />
            <text
              x="340"
              y="27"
              fill="#71717a"
              font-size="9"
              text-anchor="end"
              font-family="JetBrains Mono, monospace"
            >
              {{ coin.high }}
            </text>
            <text
              x="340"
              y="133"
              fill="#71717a"
              font-size="9"
              text-anchor="end"
              font-family="JetBrains Mono, monospace"
            >
              {{ coin.low }}
            </text>
            <path :d="chartArea" fill="url(#chartGrad)" />
            <path
              :d="chartLine"
              :stroke="color"
              stroke-width="2"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="360" cy="30" r="4" :fill="color" />
            <circle cx="360" cy="30" r="7" :fill="gradColor" />
            <rect
              x="290"
              y="14"
              width="66"
              height="16"
              rx="4"
              fill="#18181b"
              stroke="#27272a"
              stroke-width="0.5"
            />
            <text
              x="323"
              y="25"
              :fill="color"
              font-size="9"
              text-anchor="middle"
              font-family="JetBrains Mono, monospace"
            >
              {{ coin.high }}
            </text>
          </svg>
        </div>

        <!-- Time ranges -->
        <div class="time-ranges">
          <button
            v-for="r in ranges"
            :key="r"
            class="range-btn"
            :class="{ active: activeRange === r }"
            @click="activeRange = r"
          >
            {{ r }}
          </button>
        </div>
      </div>

      <!-- Tabs card -->
      <div class="tabs-card">
        <div class="tab-bar">
          <button
            v-for="t in tabs"
            :key="t"
            class="tab-btn"
            :class="{ active: activeTab === t }"
            @click="activeTab = t"
          >
            {{ t === "orderbook" ? "Order Book" : t.charAt(0).toUpperCase() + t.slice(1) }}
          </button>
        </div>

        <!-- Order Book -->
        <div v-if="activeTab === 'orderbook'" class="orderbook">
          <div class="ob-header">
            <span class="ob-col-label">Bid</span>
            <span class="ob-col-label center">Volume</span>
            <span class="ob-col-label right">Ask</span>
          </div>
          <div
            v-for="(entry, i) in orderBook"
            :key="i"
            class="ob-row"
            :style="{ '--fill': entry.fillPct + '%' }"
          >
            <span class="ob-bid">{{ entry.bid }}</span>
            <span class="ob-vol">
              {{ entry.bidVol }}<br />
              <span class="ob-vol-ask">{{ entry.askVol }}</span>
            </span>
            <span class="ob-ask">{{ entry.ask }}</span>
          </div>
        </div>

        <div v-else class="tab-empty">
          {{
            activeTab === "history"
              ? "Trade history will appear here"
              : activeTab === "notes"
                ? "No notes yet"
                : "Asset info"
          }}
        </div>
      </div>

      <!-- Buy / Sell -->
      <div class="buy-sell-row">
        <button class="buy-btn">Buy ↓</button>
        <button class="sell-btn">Sell ↑</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 22px 6px;
  font-size: 12px;
  font-weight: 600;
}

.scroll-content {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 100px;
  scrollbar-width: none;
}
.scroll-content::-webkit-scrollbar {
  display: none;
}

/* Header */
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px 16px;
}
.back-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-soft);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.2s;
  color: var(--text-primary);
}
.back-btn:hover {
  background: var(--border);
}
.pair-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}
.pair-arrow {
  font-size: 11px;
  color: var(--text-muted);
}
.star-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  color: var(--danger);
  transition: all 0.2s;
}

/* Price */
.price-section {
  padding: 4px 20px 20px;
}
.detail-price {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 8px;
}
.price-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.badge {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
}
.badge-pos {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success);
}
.badge-neg {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
}
.hl-row {
  display: flex;
  gap: 20px;
  margin-top: 12px;
}
.hl-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 3px;
}
.hl-value {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Chart */
.chart-card {
  margin: 0 16px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  padding: 16px;
}
.chart-type-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.chart-wrap {
  width: 100%;
  height: 160px;
}
.chart-svg {
  width: 100%;
  height: 100%;
}
.time-ranges {
  display: flex;
  justify-content: space-between;
  margin-top: 14px;
  gap: 4px;
}
.range-btn {
  flex: 1;
  padding: 7px 0;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  letter-spacing: 0.04em;
}
.range-btn:hover {
  color: var(--text-secondary);
  background: var(--bg-elevated);
}
.range-btn.active {
  background: var(--accent);
  color: #09090b;
  font-weight: 700;
}

/* Tabs */
.tabs-card {
  margin: 0 16px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
  overflow: hidden;
}
.tab-bar {
  display: flex;
  border-bottom: 1px solid var(--border-soft);
  padding: 0 4px;
}
.tab-btn {
  flex: 1;
  padding: 12px 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  letter-spacing: 0.04em;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
}
.tab-btn:hover {
  color: var(--text-secondary);
}
.tab-btn.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 700;
}

/* Order book */
.orderbook {
  padding: 12px 16px;
}
.ob-header {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: 4px;
  margin-bottom: 8px;
}
.ob-col-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.ob-col-label.center {
  text-align: center;
}
.ob-col-label.right {
  text-align: right;
}
.ob-row {
  display: grid;
  grid-template-columns: 1fr 1.4fr 1fr;
  gap: 4px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border-soft);
  position: relative;
  overflow: hidden;
}
.ob-row:last-child {
  border-bottom: none;
}
.ob-row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: var(--fill, 60%);
  background: rgba(34, 197, 94, 0.04);
  border-radius: 2px;
}
.ob-bid {
  font-size: 12px;
  font-weight: 600;
  color: var(--success);
}
.ob-ask {
  font-size: 12px;
  font-weight: 600;
  color: var(--danger);
  text-align: right;
}
.ob-vol {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.5;
}
.ob-vol-ask {
  color: var(--danger);
  font-size: 10px;
}
.tab-empty {
  padding: 24px 16px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

/* Buy/Sell */
.buy-sell-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 16px;
  margin: 0 16px 100px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 16px;
}
.buy-btn,
.sell-btn {
  padding: 14px;
  border-radius: 10px;
  border: none;
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  letter-spacing: 0.06em;
  transition: all 0.2s;
}
.buy-btn {
  background: rgba(34, 197, 94, 0.12);
  color: var(--success);
  border: 1px solid rgba(34, 197, 94, 0.25);
}
.buy-btn:hover {
  background: rgba(34, 197, 94, 0.2);
}
.sell-btn {
  background: rgba(239, 68, 68, 0.12);
  color: var(--danger);
  border: 1px solid rgba(239, 68, 68, 0.25);
}
.sell-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}
</style>
