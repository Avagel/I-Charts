<script setup lang="ts">
import type { Direction } from "@/types";

const props = defineProps<{
  points: string;
  dir: Direction;
}>();

const color = props.dir === "pos" ? "#22c55e" : "#ef4444";
const gradId = `sg-${Math.random().toString(36).slice(2, 7)}`;
const areaPoints = props.points + ` 64,30 0,30`;
</script>

<template>
  <svg viewBox="0 0 64 30" fill="none" preserveAspectRatio="none" class="w-full h-full">
    <defs>
      <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <polygon :points="areaPoints" :fill="`url(#${gradId})`" />
    <polyline
      :points="points"
      :stroke="color"
      stroke-width="1.5"
      fill="none"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>
