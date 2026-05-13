<template>
  <div class="activity-feed">
    <!-- Header -->
    <div class="flex flex-col justify-between gap-3 mb-4">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-semibold text-white">Activity Feed</h3>
        <div class="flex items-center gap-3">
          <!-- Pause / Resume toggle -->
          <button
            class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
            :class="
              isPaused
                ? 'bg-[#ebca2b] text-black hover:bg-[#d4b526]'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            "
            @click="togglePause"
          >
            <component :is="isPaused ? Play : Pause" :size="12" />
            {{ isPaused ? "Resume" : "Pause" }}
            <!-- Queued count badge -->
            <span
              v-if="isPaused && queuedCount > 0"
              class="ml-1 bg-red-500 text-white px-1.5 rounded-full text-[10px] font-bold"
            >
              {{ queuedCount > 99 ? "99+" : queuedCount }}
            </span>
          </button>

          <p class="text-xs text-text-secondary">
            <span v-if="socketConnected" class="text-green-500">● Live</span>
            <span v-else class="text-red-500">● Offline</span>
          </p>
        </div>
      </div>

      <!-- Filter tabs -->
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="filter in FILTERS"
          :key="filter.type"
          class="px-3 py-1 rounded-lg text-xs transition-all"
          :class="
            activeFilter === filter.type
              ? 'bg-[#ebca2b] text-black'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          "
          @click="activeFilter = filter.type"
        >
          {{ filter.label }}
          <span
            v-if="unreadByType(filter.type) > 0"
            class="ml-1 bg-red-500 text-white px-1 rounded-full text-[10px]"
          >
            {{ unreadByType(filter.type) }}
          </span>
        </button>
      </div>
    </div>

    <!-- Stats Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div v-for="stat in summaryStats" :key="stat.label" class="bg-zinc-800/30 rounded-lg p-2">
        <p class="text-xs text-zinc-500">{{ stat.label }}</p>
        <p class="text-lg font-bold" :class="stat.colorClass">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Feed List -->
    <div
      ref="feedContainer"
      class="feed-container h-[500px] overflow-y-auto space-y-2 pr-2 custom-scrollbar"
      @scroll="onScroll"
    >
      <!-- Paused banner -->
      <div
        v-if="isPaused"
        class="sticky top-0 z-10 bg-zinc-800/90 backdrop-blur-sm text-zinc-300 text-xs py-2 px-4 rounded-lg text-center mb-2 border border-zinc-700"
      >
        ⏸ Feed paused —
        <span v-if="queuedCount > 0" class="text-[#ebca2b] font-semibold">
          {{ queuedCount }} event{{ queuedCount === 1 ? "" : "s" }} queued
        </span>
        <span v-else>no new events yet</span>
        <button class="ml-2 underline hover:text-white transition-colors" @click="togglePause">
          Resume
        </button>
      </div>

      <!-- Reconnecting banner -->
      <div
        v-if="!socketConnected"
        class="bg-yellow-500/20 text-yellow-500 text-xs py-2 px-4 rounded-lg text-center mb-4"
      >
        ⚠️ Connecting to Binance WebSocket…
      </div>

      <!-- New-activity indicator (sticky) -->
      <div
        v-if="hasNewActivities && !isAtBottom"
        class="sticky top-0 z-10 bg-[#ebca2b]/20 backdrop-blur-sm text-[#ebca2b] text-xs py-2 px-4 rounded-lg text-center cursor-pointer hover:bg-[#ebca2b]/30 transition-all mb-2"
        @click="scrollToBottom"
      >
        🎉 {{ newActivitiesCount }} new {{ newActivitiesCount === 1 ? "activity" : "activities" }} —
        Click to view
      </div>

      <!-- Loading spinner -->
      <div v-if="loading && !events.length" class="flex justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ebca2b]" />
      </div>

      <!-- Events -->
      <TransitionGroup name="event" tag="div">
        <div
          v-for="event in filteredEvents"
          :key="event.id"
          class="event-item p-3 rounded-lg transition-all cursor-pointer"
          :class="[
            event.read ? 'bg-zinc-800/30' : 'bg-zinc-800/60 border-l-2 border-[#ebca2b]',
            EVENT_BG[event.type],
          ]"
          @click="markAsRead(event.id)"
        >
          <div class="flex items-start gap-3">
            <!-- Icon -->
            <div :class="EVENT_ICON_COLOR[event.type]" class="flex-shrink-0">
              <component :is="EVENT_ICON[event.type]" :size="20" />
            </div>

            <!-- Body -->
            <div class="flex-1 min-w-0">
              <div class="flex flex-wrap justify-between gap-2 mb-1">
                <span class="text-sm font-medium text-white truncate">{{ event.title }}</span>
                <span class="text-xs text-zinc-500 whitespace-nowrap">
                  {{ formatTime(event.timestamp) }}
                </span>
              </div>
              <p class="text-xs text-zinc-400 mb-2">{{ event.description }}</p>

              <!-- Metadata chips -->
              <div v-if="event.data" class="flex flex-wrap gap-3 text-xs">
                <span v-if="event.data.symbol" class="text-[#ebca2b]">
                  {{ event.data.symbol }}
                </span>
                <span v-if="event.data.price != null" class="text-green-500">
                  Price: ${{ formatPrice(event.data.price) }}
                </span>
                <span
                  v-if="event.data.change != null"
                  :class="event.data.change > 0 ? 'text-green-500' : 'text-red-500'"
                >
                  {{ event.data.change > 0 ? "+" : "" }}{{ event.data.change }}%
                </span>
                <span v-if="event.data.amount != null" class="text-[#ebca2b]">
                  Amount: {{ formatAmount(event.data.amount) }}
                </span>
                <span v-if="event.data.volume != null" class="text-blue-500">
                  Vol: {{ formatVolume(event.data.volume) }}
                </span>
              </div>
            </div>

            <!-- Unread dot -->
            <div
              v-if="!event.read"
              class="w-2 h-2 bg-[#ebca2b] rounded-full mt-2 animate-pulse flex-shrink-0"
            />
          </div>
        </div>
      </TransitionGroup>

      <!-- Empty state -->
      <div v-if="!filteredEvents.length && !loading" class="text-center py-12">
        <BellOff :size="48" class="mx-auto text-zinc-600 mb-2" />
        <p class="text-zinc-500">No activities to show</p>
        <p class="text-xs text-zinc-600 mt-1">Waiting for real-time trades…</p>
      </div>

      <!-- Scroll-to-bottom FAB -->
      <button
        v-show="!isAtBottom && filteredEvents.length > 0"
        class="fixed bottom-20 right-6 bg-[#ebca2b] text-black p-2 rounded-full shadow-lg hover:scale-110 transition-transform z-20"
        aria-label="Scroll to bottom"
        @click="scrollToBottom"
      >
        <ChevronDown :size="20" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Bell,
  BellOff,
  ChevronDown,
  Pause,
  Play,
} from "lucide-vue-next";

// ── Types ───────────────────────────────────────────────────────────────────

type EventType = "price" | "alert" | "transaction" | "metric" | "system";

interface ActivityEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  timestamp: Date;
  read: boolean;
  data?: {
    price?: number;
    change?: number;
    amount?: number;
    symbol?: string;
    volume?: number;
  };
}

// ── Constants (defined once, outside reactive scope) ────────────────────────

const FILTERS = [
  { type: "all", label: "All" },
  { type: "price", label: "Trades" },
  { type: "alert", label: "Alerts" },
  { type: "transaction", label: "Transactions" },
  { type: "metric", label: "Metrics" },
] as const;

const EVENT_ICON: Record<EventType, any> = {
  price: TrendingUp,
  alert: AlertTriangle,
  transaction: DollarSign,
  metric: Activity,
  system: Bell,
};

const EVENT_ICON_COLOR: Record<EventType, string> = {
  price: "text-green-500",
  alert: "text-yellow-500",
  transaction: "text-blue-500",
  metric: "text-purple-500",
  system: "text-zinc-500",
};

const EVENT_BG: Record<EventType, string> = {
  price: "hover:bg-green-500/5",
  alert: "hover:bg-yellow-500/5",
  transaction: "hover:bg-blue-500/5",
  metric: "hover:bg-purple-500/5",
  system: "hover:bg-zinc-500/5",
};

const MAX_EVENTS = 200;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_BASE_MS = 3_000;

// ── State ────────────────────────────────────────────────────────────────────

const events = ref<ActivityEvent[]>([]);
const loading = ref(true);
const activeFilter = ref<string>("all");
const feedContainer = ref<HTMLElement | null>(null);
const isAtBottom = ref(true);
const hasNewActivities = ref(false);
const newActivitiesCount = ref(0);
const socketConnected = ref(false);

/** Paused by default — stream is received but not rendered until resumed */
const isPaused = ref(true);
/** Events received while paused, waiting to be flushed on resume */
const eventQueue = ref<ActivityEvent[]>([]);
const queuedCount = computed(() => eventQueue.value.length);

const togglePause = () => {
  if (isPaused.value) {
    // Resume: flush the queue newest-first into the visible list
    isPaused.value = false;
    if (eventQueue.value.length) {
      // Prepend queued events (they're already in arrival order, newest first)
      events.value = [...eventQueue.value, ...events.value].slice(0, MAX_EVENTS);
      eventQueue.value = [];
      nextTick(scrollToBottom);
    }
  } else {
    isPaused.value = true;
  }
};

let binanceSocket: WebSocket | null = null;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

// ── Computed ─────────────────────────────────────────────────────────────────

const filteredEvents = computed(() =>
  activeFilter.value === "all"
    ? events.value
    : events.value.filter((e) => e.type === activeFilter.value),
);

const summaryStats = computed(() => {
  const now = Date.now();
  return [
    { label: "Total Events", value: events.value.length, colorClass: "text-white" },
    {
      label: "Last 24h",
      value: events.value.filter((e) => now - e.timestamp.getTime() < 86_400_000).length,
      colorClass: "text-white",
    },
    {
      label: "Unread",
      value: events.value.filter((e) => !e.read).length,
      colorClass: "text-[#ebca2b]",
    },
    {
      label: "Active Now",
      value: events.value.filter((e) => now - e.timestamp.getTime() < 300_000).length,
      colorClass: "text-green-500",
    },
  ];
});

const unreadByType = (type: string): number => {
  if (type === "all") return 0;
  return events.value.filter((e) => e.type === type && !e.read).length;
};

// ── Formatters ────────────────────────────────────────────────────────────────

const formatTime = (date: Date): string => {
  const diff = Date.now() - date.getTime();
  const s = Math.floor(diff / 1_000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
};

const formatPrice = (price: number): string => {
  if (price > 1_000) return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (price > 1) return price.toFixed(2);
  return price.toFixed(4);
};

const formatAmount = (amount: number): string =>
  amount > 1 ? amount.toFixed(4) : amount.toFixed(6);

const formatVolume = (volume: number): string => {
  if (volume > 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
  if (volume > 1_000) return `${(volume / 1_000).toFixed(2)}K`;
  return volume.toFixed(2);
};

// ── Event Management ──────────────────────────────────────────────────────────

const addEvent = (event: ActivityEvent) => {
  // While paused, buffer events silently — don't touch the visible list
  if (isPaused.value) {
    eventQueue.value.unshift(event);
    // Cap the queue too so memory doesn't grow unbounded during a long pause
    if (eventQueue.value.length > MAX_EVENTS) {
      eventQueue.value = eventQueue.value.slice(0, MAX_EVENTS);
    }
    return;
  }

  events.value.unshift(event);

  if (!isAtBottom.value) {
    hasNewActivities.value = true;
    newActivitiesCount.value++;
  } else {
    nextTick(scrollToBottom);
  }

  if (events.value.length > MAX_EVENTS) {
    events.value = events.value.slice(0, MAX_EVENTS);
  }
};

const markAsRead = (eventId: string) => {
  const event = events.value.find((e) => e.id === eventId);
  if (event) event.read = true;
};

const scrollToBottom = () => {
  feedContainer.value?.scrollTo({ top: feedContainer.value.scrollHeight, behavior: "smooth" });
  hasNewActivities.value = false;
  newActivitiesCount.value = 0;
};

const onScroll = () => {
  const el = feedContainer.value;
  if (!el) return;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
  isAtBottom.value = atBottom;
  if (atBottom) {
    hasNewActivities.value = false;
    newActivitiesCount.value = 0;
  }
};

// ── WebSocket ────────────────────────────────────────────────────────────────

const connectBinanceWebSocket = () => {
  try {
    binanceSocket = new WebSocket("wss://stream.binance.com:9443/ws");

    binanceSocket.onopen = () => {
      socketConnected.value = true;
      reconnectAttempts = 0;

      binanceSocket?.send(
        JSON.stringify({
          method: "SUBSCRIBE",
          params: [
            "btcusdt@trade",
            "ethusdt@trade",
            "bnbusdt@trade",
            "solusdt@trade",
            "xrpusdt@trade",
            "btcusdt@kline_1m",
          ],
          id: 1,
        }),
      );
    };

    binanceSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handleSocketMessage(data);
      } catch {
        // Silently discard malformed frames
      }
    };

    binanceSocket.onerror = () => {
      socketConnected.value = false;
    };

    binanceSocket.onclose = () => {
      socketConnected.value = false;
      scheduleReconnect();
    };
  } catch {
    scheduleReconnect();
  }
};

/** Process a validated socket message */
const handleSocketMessage = (data: any) => {
  if (data.e === "trade") {
    const price = parseFloat(data.p);
    addEvent({
      id: `${data.E}_${data.a}`,
      type: "price",
      title: `${data.s} Trade`,
      description: `${data.s} ${data.m ? "sold" : "bought"} at $${formatPrice(price)}`,
      timestamp: new Date(data.E),
      read: false,
      data: { price, amount: parseFloat(data.q), symbol: data.s },
    });
  }

  if (data.e === "kline" && data.k?.x) {
    const closePrice = parseFloat(data.k.c);
    addEvent({
      id: `${data.E}_${data.k.t}`,
      type: "metric",
      title: `${data.s} Candle Closed`,
      description: `${data.s} ${data.k.i} candle closed at $${formatPrice(closePrice)}`,
      timestamp: new Date(data.E),
      read: false,
      data: { symbol: data.s, price: closePrice, volume: parseFloat(data.k.v) },
    });
  }
};

/**
 * Exponential back-off reconnect.
 * Delay = RECONNECT_BASE_MS × attempt (capped at MAX_RECONNECT_ATTEMPTS).
 */
const scheduleReconnect = () => {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;
  const delay = RECONNECT_BASE_MS * (reconnectAttempts + 1);
  reconnectAttempts++;
  reconnectTimer = setTimeout(connectBinanceWebSocket, delay);
};

// ── Sample / Seed data ────────────────────────────────────────────────────────

const addSampleEvents = () => {
  const now = Date.now();
  const seeds: ActivityEvent[] = [
    {
      id: "sample1",
      type: "price",
      title: "Bitcoin Update",
      description: "BTC/USDT crossed $50,000",
      timestamp: new Date(now - 300_000),
      read: false,
      data: { price: 50123, symbol: "BTCUSDT" },
    },
    {
      id: "sample2",
      type: "transaction",
      title: "Order Executed",
      description: "Bought 0.5 ETH at $3,200",
      timestamp: new Date(now - 900_000),
      read: false,
      data: { amount: 1600, price: 3200 },
    },
    {
      id: "sample3",
      type: "system",
      title: "System Ready",
      description: "WebSocket connection established",
      timestamp: new Date(now - 1_800_000),
      read: true,
    },
  ];
  seeds.forEach(addEvent);
};

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  addSampleEvents();
  connectBinanceWebSocket();
  setTimeout(() => (loading.value = false), 1_000);
});

onUnmounted(() => {
  if (reconnectTimer !== null) clearTimeout(reconnectTimer);
  binanceSocket?.close();
  binanceSocket = null;
});
</script>

<style scoped>
.feed-container {
  scroll-behavior: smooth;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(39, 39, 42, 0.5);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(235, 202, 43, 0.5);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(235, 202, 43, 0.7);
}

/* TransitionGroup animations */
.event-enter-active {
  animation: slideIn 0.25s ease-out;
}
.event-leave-active {
  animation: slideOut 0.2s ease-in forwards;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes slideOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}
</style>
