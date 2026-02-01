<template>
  <div 
    v-if="show && result" 
    :class="['dpi-indicator', result.quality]"
    :title="result.message"
  >
    <span class="dpi-icon">{{ icon }}</span>
    <span class="dpi-value">{{ result.dpi }} DPI</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface DpiResult {
  dpi: number;
  quality: 'excellent' | 'good' | 'acceptable' | 'low' | 'very_low';
  message: string;
  canPrint: boolean;
}

const props = defineProps<{
  result?: DpiResult | null;
  show?: boolean;
}>();

const icon = computed(() => {
  if (!props.result) return '';
  switch (props.result.quality) {
    case 'excellent': return '✓';
    case 'good': return '✓';
    case 'acceptable': return '⚠';
    case 'low': return '⚠';
    case 'very_low': return '✕';
    default: return '';
  }
});
</script>

<style scoped>
.dpi-indicator {
  position: absolute;
  bottom: 4px;
  left: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  pointer-events: none;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.dpi-icon {
  font-size: 12px;
}

.dpi-value {
  font-family: monospace;
}

/* Qualidades */
.dpi-indicator.excellent {
  background: rgba(16, 185, 129, 0.9);
  color: white;
}

.dpi-indicator.good {
  background: rgba(59, 130, 246, 0.9);
  color: white;
}

.dpi-indicator.acceptable {
  background: rgba(245, 158, 11, 0.9);
  color: white;
}

.dpi-indicator.low {
  background: rgba(239, 68, 68, 0.85);
  color: white;
}

.dpi-indicator.very_low {
  background: rgba(220, 38, 38, 0.95);
  color: white;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
