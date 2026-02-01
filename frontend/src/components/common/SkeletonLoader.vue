<template>
  <div class="skeleton" :class="[variant, { 'animate': animate }]" :style="customStyle">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  variant?: 'text' | 'title' | 'avatar' | 'thumbnail' | 'card' | 'button'
  width?: string
  height?: string
  borderRadius?: string
  animate?: boolean
}>()

const customStyle = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.borderRadius
}))
</script>

<style scoped>
.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
}

.skeleton.animate {
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.text {
  height: 16px;
  border-radius: 4px;
  width: 100%;
}

.title {
  height: 28px;
  border-radius: 6px;
  width: 60%;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.thumbnail {
  width: 100%;
  height: 160px;
  border-radius: 12px;
}

.card {
  width: 100%;
  height: 280px;
  border-radius: 16px;
}

.button {
  width: 120px;
  height: 44px;
  border-radius: 8px;
}
</style>
